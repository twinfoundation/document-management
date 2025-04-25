// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { IAttestationComponent } from "@twin.org/attestation-models";
import { AttestationContexts } from "@twin.org/attestation-models";
import {
	AuditableItemGraphContexts,
	AuditableItemGraphTypes,
	type IAuditableItemGraphVertexList,
	type IAuditableItemGraphAlias,
	type IAuditableItemGraphComponent,
	type IAuditableItemGraphEdge,
	type IAuditableItemGraphVertex
} from "@twin.org/auditable-item-graph-models";
import type { IBlobStorageComponent } from "@twin.org/blob-storage-models";
import { BlobStorageContexts } from "@twin.org/blob-storage-models";
import {
	BaseError,
	Coerce,
	ComponentFactory,
	Converter,
	GeneralError,
	Guards,
	Is,
	NotFoundError,
	ObjectHelper,
	Urn
} from "@twin.org/core";
import { Sha256 } from "@twin.org/crypto";
import { JsonLdProcessor, type IJsonLdNodeObject } from "@twin.org/data-json-ld";
import {
	DocumentContexts,
	DocumentTypes,
	type IDocument,
	type IDocumentAttestation,
	type IDocumentList,
	type IDocumentManagementComponent
} from "@twin.org/document-management-models";
import { nameof } from "@twin.org/nameof";
import { SchemaOrgContexts, SchemaOrgDataTypes } from "@twin.org/standards-schema-org";
import { UneceDocumentCodes } from "@twin.org/standards-unece";
import type { IDocumentManagementServiceConstructorOptions } from "./models/IDocumentManagementStorageServiceConstructorOptions";

/**
 * Service for performing document management operations.
 */
export class DocumentManagementService implements IDocumentManagementComponent {
	/**
	 * The namespace supported by the document management service.
	 */
	public static readonly NAMESPACE: string = "documents";

	/**
	 * Runtime name for the class.
	 */
	public readonly CLASS_NAME: string = nameof<DocumentManagementService>();

	/**
	 * The component for the auditable item graph.
	 * @internal
	 */
	private readonly _auditableItemGraphComponent: IAuditableItemGraphComponent;

	/**
	 * The connector for the blob component.
	 * @internal
	 */
	private readonly _blobStorageComponent: IBlobStorageComponent;

	/**
	 * The connector for the attestation.
	 * @internal
	 */
	private readonly _attestationComponent: IAttestationComponent;

	/**
	 * Create a new instance of DocumentManagementService.
	 * @param options The options for the service.
	 */
	constructor(options?: IDocumentManagementServiceConstructorOptions) {
		this._auditableItemGraphComponent = ComponentFactory.get<IAuditableItemGraphComponent>(
			options?.auditableItemGraphComponentType ?? "auditable-item-graph"
		);
		this._blobStorageComponent = ComponentFactory.get<IBlobStorageComponent>(
			options?.blobStorageComponentType ?? "blob-storage"
		);
		this._attestationComponent = ComponentFactory.get<IAttestationComponent>(
			options?.attestationComponentType ?? "attestation"
		);

		SchemaOrgDataTypes.registerRedirects();
	}

	/**
	 * Store a document as an auditable item graph vertex and add its content to blob storage.
	 * If the document id already exists and the blob data is different a new revision will be created.
	 * For any other changes the current revision will be updated.
	 * @param documentId The document id to create.
	 * @param documentIdFormat The format of the document identifier.
	 * @param documentCode The code for the document type.
	 * @param blob The data to create the document with.
	 * @param annotationObject Additional information to associate with the document.
	 * @param auditableItemGraphEdges The auditable item graph vertices to connect the document to.
	 * @param options Additional options for the set operation.
	 * @param options.createAttestation Flag to create an attestation for the document, defaults to false.
	 * @param options.addAlias Flag to add the document id as an alias to the aig vertex, defaults to true.
	 * @param options.aliasAnnotationObject Annotation object for the alias.
	 * @param userIdentity The identity to perform the auditable item graph operation with.
	 * @param nodeIdentity The node identity to use for vault operations.
	 * @returns The auditable item graph vertex created for the document including its revision.
	 */
	public async create(
		documentId: string,
		documentIdFormat: string | undefined,
		documentCode: UneceDocumentCodes,
		blob: Uint8Array,
		annotationObject?: IJsonLdNodeObject,
		auditableItemGraphEdges?: {
			id: string;
			addAlias?: boolean;
			aliasAnnotationObject?: IJsonLdNodeObject;
		}[],
		options?: {
			createAttestation?: boolean;
			addAlias?: boolean;
			aliasAnnotationObject?: IJsonLdNodeObject;
		},
		userIdentity?: string,
		nodeIdentity?: string
	): Promise<string> {
		Guards.stringValue(this.CLASS_NAME, nameof(documentId), documentId);
		Guards.arrayOneOf(
			this.CLASS_NAME,
			nameof(documentCode),
			documentCode,
			Object.values(UneceDocumentCodes)
		);
		Guards.uint8Array(this.CLASS_NAME, nameof(blob), blob);
		Guards.stringValue(this.CLASS_NAME, nameof(userIdentity), userIdentity);
		Guards.stringValue(this.CLASS_NAME, nameof(nodeIdentity), nodeIdentity);

		try {
			// Get the connected vertices first, if one fails we abort the create
			const connectedVertices: { [id: string]: IAuditableItemGraphVertex } = {};
			if (Is.arrayValue(auditableItemGraphEdges)) {
				for (const edge of auditableItemGraphEdges) {
					connectedVertices[edge.id] = await this._auditableItemGraphComponent.get(edge.id);
				}
			}

			const documentVertex: Omit<IAuditableItemGraphVertex, "@context" | "id" | "type"> = {};

			if (options?.addAlias ?? true) {
				documentVertex.aliases ??= [];
				documentVertex.aliases.push({
					"@context": AuditableItemGraphContexts.ContextRoot,
					type: AuditableItemGraphTypes.Alias,
					id: documentId,
					aliasFormat: documentIdFormat,
					annotationObject: options?.aliasAnnotationObject
				});
			}

			// Add the blob to blob storage
			const blobStorageId = await this._blobStorageComponent.create(
				Converter.bytesToBase64(blob),
				undefined,
				undefined,
				undefined,
				undefined,
				userIdentity,
				nodeIdentity
			);

			const currentRevision: IDocument & IJsonLdNodeObject = {
				"@context": [
					DocumentContexts.ContextRoot,
					DocumentContexts.ContextRootCommon,
					SchemaOrgContexts.ContextRoot
				],
				type: DocumentTypes.Document,
				id: `${documentId}:0`,
				documentId,
				documentIdFormat,
				documentCode,
				documentRevision: 0,
				annotationObject,
				blobHash: this.generateBlobHash(blob),
				blobStorageId,
				dateCreated: new Date(Date.now()).toISOString(),
				nodeIdentity,
				userIdentity
			};

			if (options?.createAttestation ?? false) {
				currentRevision.attestationId = await this.createAttestation(
					currentRevision,
					userIdentity,
					nodeIdentity
				);
			}

			// Add the new revision in to the vertex
			documentVertex.resources ??= [];
			documentVertex.resources.push({
				"@context": AuditableItemGraphContexts.ContextRoot,
				type: AuditableItemGraphTypes.Resource,
				resourceObject: currentRevision
			});

			// Add the edges from the document to the items
			this.updateEdges(documentVertex, auditableItemGraphEdges);

			// And create the vertex
			const vertexId = await this._auditableItemGraphComponent.create(
				documentVertex,
				userIdentity,
				nodeIdentity
			);

			// Now add the edges to the connected vertices
			await this.updateConnectedEdges(
				connectedVertices,
				vertexId,
				[],
				auditableItemGraphEdges,
				documentId,
				documentIdFormat,
				userIdentity,
				nodeIdentity
			);

			return vertexId;
		} catch (error) {
			if (BaseError.someErrorName(error, nameof<NotFoundError>())) {
				throw error;
			}
			throw new GeneralError(this.CLASS_NAME, "createFailed", undefined, error);
		}
	}

	/**
	 * Update a document as an auditable item graph vertex and add its content to blob storage.
	 * If the blob data is different a new revision will be created.
	 * For any other changes the current revision will be updated.
	 * @param auditableItemGraphDocumentId The auditable item graph vertex id which contains the document.
	 * @param blob The data to update the document with.
	 * @param annotationObject Additional information to associate with the document.
	 * @param auditableItemGraphEdges The auditable item graph vertices to connect the document to, if undefined retains current connections.
	 * @param userIdentity The identity to perform the auditable item graph operation with.
	 * @param nodeIdentity The node identity to use for vault operations.
	 * @returns Nothing.
	 */
	public async update(
		auditableItemGraphDocumentId: string,
		blob?: Uint8Array,
		annotationObject?: IJsonLdNodeObject,
		auditableItemGraphEdges?: {
			id: string;
			addAlias?: boolean;
			aliasAnnotationObject?: IJsonLdNodeObject;
		}[],
		userIdentity?: string,
		nodeIdentity?: string
	): Promise<void> {
		Urn.guard(this.CLASS_NAME, nameof(auditableItemGraphDocumentId), auditableItemGraphDocumentId);
		Guards.stringValue(this.CLASS_NAME, nameof(userIdentity), userIdentity);
		Guards.stringValue(this.CLASS_NAME, nameof(nodeIdentity), nodeIdentity);

		try {
			const documentVertex = await this._auditableItemGraphComponent.get(
				auditableItemGraphDocumentId
			);
			if (Is.empty(documentVertex.resources)) {
				throw new NotFoundError(this.CLASS_NAME, "documentRevisionNone");
			}

			const documents = await this.getDocumentsFromVertex(documentVertex);
			const latestRevision: IDocument | undefined = documents.documents[0];

			if (Is.empty(latestRevision)) {
				throw new NotFoundError(this.CLASS_NAME, "documentRevisionNone");
			}

			// If auditableItemGraphEdges is undefined we are not updating the edges
			// an empty array can be passed to remove all edges
			const connectedVertices: { [id: string]: IAuditableItemGraphVertex } = {};
			if (Is.array(auditableItemGraphEdges)) {
				// Get the updated connected vertices first, if one fails we abort the update
				for (const edge of auditableItemGraphEdges) {
					connectedVertices[edge.id] = await this._auditableItemGraphComponent.get(edge.id);
				}
				// Also get the current edges in case some need disconnecting
				if (Is.arrayValue(documents.edges)) {
					for (const edgeId of documents.edges) {
						// If we haven't retrieved the edge then it must be one that needs removing
						if (Is.empty(connectedVertices[edgeId])) {
							connectedVertices[edgeId] = await this._auditableItemGraphComponent.get(edgeId);
						}
					}
				}
			}

			let updatedVertex = false;

			// If the blob is set and its hash has changed then we create a new revision
			if (Is.uint8Array(blob)) {
				const newBlobHash = this.generateBlobHash(blob);

				if (latestRevision.blobHash !== newBlobHash) {
					// Add the blob to blob storage
					const blobStorageId = await this._blobStorageComponent.create(
						Converter.bytesToBase64(blob),
						undefined,
						undefined,
						undefined,
						undefined,
						userIdentity,
						nodeIdentity
					);

					const newRevision = ObjectHelper.clone(latestRevision);

					newRevision.documentRevision++;
					newRevision.id = `${newRevision.documentId}:${newRevision.documentRevision}`;
					newRevision.blobHash = newBlobHash;
					newRevision.blobStorageId = blobStorageId;
					newRevision.annotationObject = annotationObject;

					if (Is.stringValue(latestRevision.attestationId)) {
						newRevision.attestationId = await this.createAttestation(
							newRevision,
							userIdentity,
							nodeIdentity
						);
					}

					documentVertex.resources.push({
						"@context": AuditableItemGraphContexts.ContextRoot,
						type: AuditableItemGraphTypes.Resource,
						resourceObject: newRevision as unknown as IJsonLdNodeObject
					});

					updatedVertex = true;
				}
			}

			// If the blob wasn't updated but the annotation object has then update the current revision
			// instead of creating a new one
			if (
				!updatedVertex &&
				!ObjectHelper.equal(latestRevision.annotationObject, annotationObject)
			) {
				updatedVertex = true;
				latestRevision.annotationObject = annotationObject;
				latestRevision.dateModified = new Date(Date.now()).toISOString();
			}

			const existingEdgeIds = documentVertex.edges?.map(e => e.id) ?? [];

			// Update the edges from the document to the items
			const edgesUpdated = this.updateEdges(documentVertex, auditableItemGraphEdges);
			if (edgesUpdated) {
				updatedVertex = true;
			}

			if (updatedVertex) {
				await this._auditableItemGraphComponent.update(documentVertex, userIdentity, nodeIdentity);
			}

			if (edgesUpdated) {
				await this.updateConnectedEdges(
					connectedVertices,
					auditableItemGraphDocumentId,
					existingEdgeIds,
					auditableItemGraphEdges,
					latestRevision.documentId,
					latestRevision.documentIdFormat,
					userIdentity,
					nodeIdentity
				);
			}
		} catch (error) {
			if (BaseError.someErrorName(error, nameof<NotFoundError>())) {
				throw error;
			}
			throw new GeneralError(this.CLASS_NAME, "updateFailed", undefined, error);
		}
	}

	/**
	 * Get a document using it's auditable item graph vertex id and optional revision.
	 * @param auditableItemGraphDocumentId The auditable item graph vertex id which contains the document.
	 * @param options Additional options for the get operation.
	 * @param options.includeBlobStorageMetadata Flag to include the blob storage metadata for the document, defaults to false.
	 * @param options.includeBlobStorageData Flag to include the blob storage data for the document, defaults to false.
	 * @param options.includeAttestation Flag to include the attestation information for the document, defaults to false.
	 * @param options.includeRemoved Flag to include deleted documents, defaults to false.
	 * @param cursor The cursor to get the next chunk of revisions.
	 * @param pageSize Page size of items to return, defaults to 1 so only most recent is returned.
	 * @param userIdentity The identity to perform the auditable item graph operation with.
	 * @param nodeIdentity The node identity to use for vault operations.
	 * @returns The documents and revisions if requested, ordered by revision descending, cursor is set if there are more document revisions.
	 */
	public async get(
		auditableItemGraphDocumentId: string,
		options?: {
			includeBlobStorageMetadata?: boolean;
			includeBlobStorageData?: boolean;
			includeAttestation?: boolean;
			includeRemoved?: boolean;
		},
		cursor?: string,
		pageSize?: number,
		userIdentity?: string,
		nodeIdentity?: string
	): Promise<IDocumentList> {
		Urn.guard(this.CLASS_NAME, nameof(auditableItemGraphDocumentId), auditableItemGraphDocumentId);

		try {
			const documentVertex = await this._auditableItemGraphComponent.get(
				auditableItemGraphDocumentId,
				{ includeDeleted: options?.includeRemoved }
			);

			// Populate the document and revisions with the options set
			const documents = await this.getDocumentsFromVertex(
				documentVertex,
				options,
				cursor,
				pageSize,
				userIdentity,
				nodeIdentity
			);

			return JsonLdProcessor.compact(documents, documents["@context"]);
		} catch (error) {
			if (BaseError.someErrorName(error, nameof<NotFoundError>())) {
				throw error;
			}
			throw new GeneralError(this.CLASS_NAME, "getFailed", undefined, error);
		}
	}

	/**
	 * Remove an auditable item graph vertex using it's id.
	 * The document dateDeleted will be set, but can still be queried with the includeRemoved flag.
	 * @param auditableItemGraphDocumentId The auditable item graph vertex id which contains the document.
	 * @param revision The revision of the document to remove.
	 * @param userIdentity The identity to perform the auditable item graph operation with.
	 * @param nodeIdentity The node identity to use for vault operations.
	 * @returns Nothing.
	 */
	public async removeRevision(
		auditableItemGraphDocumentId: string,
		revision: number,
		userIdentity?: string,
		nodeIdentity?: string
	): Promise<void> {
		Urn.guard(this.CLASS_NAME, nameof(auditableItemGraphDocumentId), auditableItemGraphDocumentId);
		Guards.number(this.CLASS_NAME, nameof(revision), revision);

		try {
			const documentVertex = await this._auditableItemGraphComponent.get(
				auditableItemGraphDocumentId
			);

			if (Is.empty(documentVertex.resources)) {
				throw new NotFoundError(this.CLASS_NAME, "documentRevisionNone");
			}

			const docRevisionIndex = documentVertex.resources.findIndex(
				d => d.resourceObject?.documentRevision === revision
			);

			if (docRevisionIndex === -1) {
				throw new NotFoundError(this.CLASS_NAME, "documentRevisionNotFound", revision.toString());
			}

			documentVertex.resources.splice(docRevisionIndex, 1);

			await this._auditableItemGraphComponent.update(documentVertex, userIdentity, nodeIdentity);
		} catch (error) {
			if (BaseError.someErrorName(error, nameof<NotFoundError>())) {
				throw error;
			}
			throw new GeneralError(this.CLASS_NAME, "removeRevisionFailed", undefined, error);
		}
	}

	/**
	 * Find all the document with a specific id.
	 * @param documentId The document id to find in the graph.
	 * @param cursor The cursor to get the next chunk of documents.
	 * @param pageSize The page size to get the next chunk of documents.
	 * @param userIdentity The identity to perform the auditable item graph operation with.
	 * @param nodeIdentity The node identity to use for vault operations.
	 * @returns The graph vertices that contain documents referencing the specified document id.
	 */
	public async query(
		documentId: string,
		cursor?: string,
		pageSize?: number,
		userIdentity?: string,
		nodeIdentity?: string
	): Promise<IAuditableItemGraphVertexList> {
		Guards.stringValue(this.CLASS_NAME, nameof(documentId), documentId);

		try {
			return this._auditableItemGraphComponent.query(
				{
					id: documentId,
					idMode: "both",
					resourceTypes: [DocumentTypes.Document]
				},
				undefined,
				undefined,
				undefined,
				["id", "dateCreated", "dateModified", "aliases", "annotationObject", "resources", "edges"],
				cursor,
				pageSize
			);
		} catch (error) {
			if (BaseError.someErrorName(error, nameof<NotFoundError>())) {
				throw error;
			}
			throw new GeneralError(this.CLASS_NAME, "queryFailed", undefined, error);
		}
	}

	/**
	 * Update the edges of the document vertex.
	 * @param documentVertex The document vertex to update.
	 * @param auditableItemGraphEdges The list of edges to use.
	 * @returns True if the edges were updated.
	 * @internal
	 */
	private updateEdges(
		documentVertex: Omit<IAuditableItemGraphVertex, "@context" | "id" | "type">,
		auditableItemGraphEdges:
			| { id: string; addAlias?: boolean; aliasAnnotationObject?: IJsonLdNodeObject }[]
			| undefined
	): boolean {
		let changed = false;

		const existingEdgeIds = documentVertex.edges?.map(e => e.id) ?? [];

		if (Is.array(auditableItemGraphEdges)) {
			for (const aigEdge of auditableItemGraphEdges) {
				const existingIndex = existingEdgeIds.indexOf(aigEdge.id);
				if (existingIndex !== -1) {
					// If the edge already exists then we don't need to add it again
					// We just need to remove it from the list of existing ids
					// any remaining after this loop will be need to be removed
					existingEdgeIds.splice(existingIndex, 1);
				} else {
					const vertexEdge: IAuditableItemGraphEdge = {
						"@context": AuditableItemGraphContexts.ContextRoot,
						type: AuditableItemGraphTypes.Edge,
						id: aigEdge.id,
						edgeRelationships: ["document"]
					};

					documentVertex.edges ??= [];
					documentVertex.edges?.push(vertexEdge);
					changed = true;
				}
			}

			// Anything left in the existingEdgeIds array means they need to be removed
			if (existingEdgeIds.length > 0 && Is.array(documentVertex.edges)) {
				for (const existingEdgeId of existingEdgeIds) {
					const existingIndex = documentVertex.edges.findIndex(e => e.id === existingEdgeId);
					if (existingIndex !== -1) {
						documentVertex.edges.splice(existingIndex, 1);
						changed = true;
					}
				}
			}
		}

		return changed;
	}

	/**
	 * Update the edges.
	 * @param connectedVertices The connected vertices for the edges.
	 * @param auditableItemGraphDocumentId The document id to use.
	 * @param documentVertex The document vertex to update.
	 * @param auditableItemGraphEdges The list of edges to use.
	 * @param documentId The document identifier.
	 * @param documentIdFormat The format of the document identifier.
	 * @param userIdentity The identity to perform the auditable item graph operation with.
	 * @param nodeIdentity The node identity to use for vault operations.
	 * @internal
	 */
	private async updateConnectedEdges(
		connectedVertices: { [id: string]: IAuditableItemGraphVertex },
		auditableItemGraphDocumentId: string,
		existingEdgeIds: string[],
		auditableItemGraphEdges:
			| { id: string; addAlias?: boolean; aliasAnnotationObject?: IJsonLdNodeObject }[]
			| undefined,
		documentId: string,
		documentIdFormat: string | undefined,
		userIdentity: string,
		nodeIdentity: string
	): Promise<void> {
		if (Is.array(auditableItemGraphEdges)) {
			for (const aigEdge of auditableItemGraphEdges) {
				const connected = connectedVertices[aigEdge.id];

				if (!Is.empty(connected)) {
					let updatedConnected = false;

					const existingIndex = existingEdgeIds.indexOf(aigEdge.id);
					if (existingIndex !== -1) {
						// If the edge already exists we remove it from the list of existing ids
						// any remaining after this loop will be need to be disconnected
						existingEdgeIds.splice(existingIndex, 1);
					}

					// Add the edge with the document vertex id if it doesn't already exist
					const hasEdge = connected.edges?.some(e => e.id === auditableItemGraphDocumentId);
					if (!hasEdge) {
						const vertexEdge: IAuditableItemGraphEdge = {
							"@context": AuditableItemGraphContexts.ContextRoot,
							type: AuditableItemGraphTypes.Edge,
							id: auditableItemGraphDocumentId,
							edgeRelationships: ["document"]
						};

						connected.edges ??= [];
						connected.edges?.push(vertexEdge);
						updatedConnected = true;
					}

					// Add alias with the document id if option flag is set and it doesn't already exist
					if (aigEdge.addAlias) {
						const alias = connected.aliases?.find(a => a.id === documentId);
						if (Is.empty(alias)) {
							// No existing alias, so create one
							const vertexAlias: IAuditableItemGraphAlias = {
								"@context": AuditableItemGraphContexts.ContextRoot,
								type: AuditableItemGraphTypes.Alias,
								id: documentId,
								aliasFormat: documentIdFormat,
								annotationObject: aigEdge.aliasAnnotationObject
							};

							connected.aliases ??= [];
							connected.aliases?.push(vertexAlias);
							updatedConnected = true;
						} else if (
							!ObjectHelper.equal(alias.annotationObject, aigEdge.aliasAnnotationObject) ||
							documentIdFormat !== alias.aliasFormat
						) {
							// The alias already exists, but the format or annotation object has changed
							alias.annotationObject = aigEdge.aliasAnnotationObject;
							alias.aliasFormat = documentIdFormat;
							updatedConnected = true;
						}
					}

					if (updatedConnected) {
						await this._auditableItemGraphComponent.update(connected, userIdentity, nodeIdentity);
					}
				}
			}
		}

		// Anything left in the existingEdgeIds array means they need to be removed
		if (existingEdgeIds.length > 0) {
			for (const existingEdgeId of existingEdgeIds) {
				const connected = connectedVertices[existingEdgeId];

				if (!Is.empty(connected)) {
					let updatedConnected = false;

					// Remove the edge from the connected vertex
					if (Is.arrayValue(connected.edges)) {
						const existingIndex = connected.edges.findIndex(
							e => e.id === auditableItemGraphDocumentId
						);
						if (existingIndex !== -1) {
							connected.edges.splice(existingIndex, 1);
							updatedConnected = true;
						}
					}

					// Remove the alias from the connected vertex
					if (Is.arrayValue(connected.aliases)) {
						const existingIndex = connected.aliases.findIndex(e => e.id === documentId);
						if (existingIndex !== -1) {
							connected.aliases.splice(existingIndex, 1);
							updatedConnected = true;
						}
					}

					if (updatedConnected) {
						await this._auditableItemGraphComponent.update(connected, userIdentity, nodeIdentity);
					}
				}
			}
		}
	}

	/**
	 * Generate a hash for the blob data.
	 * @param blob The blob data to hash.
	 * @returns The hash.
	 * @internal
	 */
	private generateBlobHash(blob: Uint8Array): string {
		return `sha256:${Converter.bytesToBase64(Sha256.sum256(blob))}`;
	}

	/**
	 * Get the documents from the auditable item graph vertex.
	 * @param documentVertex The vertex containing the documents.
	 * @param options Additional options for the get operation.
	 * @param options.includeBlobStorageMetadata Flag to include the blob storage metadata for the document, defaults to false.
	 * @param options.includeBlobStorageData Flag to include the blob storage data for the document, defaults to false.
	 * @param options.includeAttestation Flag to include the attestation information for the document, defaults to false.
	 * @param options.includeRemoved Flag to include deleted documents, defaults to false.
	 * @param cursor The cursor to get the next chunk of revisions.
	 * @param pageSize Page size of items to return, defaults to 1 so only most recent is returned.
	 * @param userIdentity The identity to perform the auditable item graph operation with.
	 * @param nodeIdentity The node identity to use for vault operations.
	 * @returns The finalised list of documents.
	 * @internal
	 */
	private async getDocumentsFromVertex(
		documentVertex: IAuditableItemGraphVertex,
		options?: {
			includeBlobStorageMetadata?: boolean;
			includeBlobStorageData?: boolean;
			includeAttestation?: boolean;
		},
		cursor?: string,
		pageSize?: number,
		userIdentity?: string,
		nodeIdentity?: string
	): Promise<IDocumentList> {
		const docList: IDocumentList = {
			"@context": [
				DocumentContexts.ContextRoot,
				DocumentContexts.ContextRootCommon,
				SchemaOrgContexts.ContextRoot
			],
			type: DocumentTypes.DocumentList,
			documents: []
		};

		if (Is.arrayValue(documentVertex.resources)) {
			// Sort by newest revision first
			documentVertex.resources.sort(
				(a, b) =>
					(Coerce.number(b.resourceObject?.documentRevision) ?? 0) -
					(Coerce.number(a.resourceObject?.documentRevision) ?? 0)
			);

			const startIndex = Coerce.integer(cursor) ?? 0;
			const endIndex = Math.min(startIndex + (pageSize ?? 1), documentVertex.resources.length);
			const slicedResources = documentVertex.resources.slice(startIndex, endIndex);
			docList.cursor =
				documentVertex.resources.length > endIndex ? (endIndex + 1).toString() : undefined;

			const includeBlobStorageMetadata = options?.includeBlobStorageMetadata ?? false;
			const includeBlobStorageData = options?.includeBlobStorageData ?? false;
			const includeAttestation = options?.includeAttestation ?? false;

			for (let i = 0; i < slicedResources.length; i++) {
				const document = slicedResources[i].resourceObject as unknown as IDocument;
				if (Is.object(document)) {
					docList.documents.push(document);

					if (includeBlobStorageMetadata || includeBlobStorageData) {
						const blobEntry = await this._blobStorageComponent.get(
							document.blobStorageId,
							includeBlobStorageData,
							userIdentity,
							nodeIdentity
						);
						document.blobStorageEntry = blobEntry;
						if (!docList["@context"].includes(BlobStorageContexts.ContextRoot)) {
							docList["@context"].push(BlobStorageContexts.ContextRoot);
						}
					}

					if (includeAttestation && Is.stringValue(document.attestationId)) {
						const attestationInformation = await this._attestationComponent.get(
							document.attestationId
						);
						document.attestationInformation = attestationInformation;
						if (!docList["@context"].includes(AttestationContexts.ContextRoot)) {
							docList["@context"].push(AttestationContexts.ContextRoot);
						}
					}
				}
			}
		}

		if (Is.arrayValue(documentVertex.edges)) {
			docList.edges ??= [];

			for (const edge of documentVertex.edges) {
				if (Is.object(edge)) {
					docList.edges.push(edge.id);
				}
			}
		}

		return docList;
	}

	/**
	 * Create an attestation for the document.
	 * @param document The document to create the attestation for.
	 * @param userIdentity The identity to perform the attestation operation with.
	 * @param nodeIdentity The node identity to perform attestation operation with.
	 * @returns The attestation identifier.
	 */
	private async createAttestation(
		document: IDocument,
		userIdentity: string,
		nodeIdentity: string
	): Promise<string> {
		const documentAttestation: IDocumentAttestation & IJsonLdNodeObject = {
			"@context": [
				DocumentContexts.ContextRoot,
				DocumentContexts.ContextRootCommon,
				SchemaOrgContexts.ContextRoot
			],
			type: DocumentTypes.DocumentAttestation,
			id: document.id,
			documentId: document.documentId,
			documentCode: document.documentCode,
			documentRevision: document.documentRevision,
			dateCreated: document.dateCreated,
			blobHash: document.blobHash
		};
		return this._attestationComponent.create(
			documentAttestation,
			undefined,
			userIdentity,
			nodeIdentity
		);
	}
}
