// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { IAttestationComponent } from "@twin.org/attestation-models";
import { AttestationTypes } from "@twin.org/attestation-models";
import {
	AuditableItemGraphTypes,
	type IAuditableItemGraphComponent,
	type IAuditableItemGraphVertex
} from "@twin.org/auditable-item-graph-models";
import type { IBlobStorageComponent } from "@twin.org/blob-storage-models";
import { BlobStorageTypes } from "@twin.org/blob-storage-models";
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
	DocumentTypes,
	type IDocumentAttestation,
	type IDocument,
	type IDocumentList,
	type IDocumentManagementComponent
} from "@twin.org/document-management-models";
import { nameof } from "@twin.org/nameof";
import { SchemaOrgDataTypes, SchemaOrgTypes } from "@twin.org/standards-schema-org";
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
	 * Default Page Size for cursor.
	 * @internal
	 */
	private static readonly _DEFAULT_PAGE_SIZE: number = 20;

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
	 * Store a document in an auditable item graph vertex and add its content to blob storage.
	 * If the document id already exists and the blob data is different a new revision will be created.
	 * For any other changes the current revision will be updated.
	 * @param auditableItemGraphId The auditable item graph vertex id to create the document on.
	 * @param documentId The document id to create.
	 * @param documentIdFormat The format of the document identifier.
	 * @param documentCode The code for the document type.
	 * @param blob The data to create the document.
	 * @param annotationObject Additional information to associate with the document.
	 * @param options Additional options for the set operation.
	 * @param options.createAttestation Flag to create an attestation for the document, defaults to false.
	 * @param options.includeIdAsAlias Include the document id as an alias to the aig vertex, defaults to false.
	 * @param options.aliasAnnotationObject Additional information to associate with the alias.
	 * @param userIdentity The identity to perform the auditable item graph operation with.
	 * @param nodeIdentity The node identity to use for vault operations.
	 * @returns The identifier for the document which includes the auditable item graph identifier.
	 */
	public async set(
		auditableItemGraphId: string,
		documentId: string,
		documentIdFormat: string | undefined,
		documentCode: UneceDocumentCodes,
		blob: Uint8Array,
		annotationObject?: IJsonLdNodeObject,
		options?: {
			createAttestation?: boolean;
			includeIdAsAlias?: boolean;
			aliasAnnotationObject?: IJsonLdNodeObject;
		},
		userIdentity?: string,
		nodeIdentity?: string
	): Promise<string> {
		Guards.stringValue(this.CLASS_NAME, nameof(auditableItemGraphId), auditableItemGraphId);
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
			const vertex = await this._auditableItemGraphComponent.get(auditableItemGraphId);

			vertex.resources = vertex.resources ?? [];

			if (options?.includeIdAsAlias ?? false) {
				vertex.aliases ??= [];
				const found = vertex.aliases.find(a => a.id === documentId);
				if (found) {
					found.annotationObject = options?.aliasAnnotationObject ?? found.annotationObject;
					found.aliasFormat = documentIdFormat ?? found.aliasFormat;
				} else {
					vertex.aliases.push({
						"@context": AuditableItemGraphTypes.ContextRoot,
						type: AuditableItemGraphTypes.Alias,
						id: documentId,
						aliasFormat: documentIdFormat,
						annotationObject: options?.aliasAnnotationObject
					});
				}
			}

			// Get all the docs from the AIG vertex
			const vertexDocs = this.filterDocumentsFromVertex(vertex);

			// Reduce the list to those with a matching id and code
			const matchingDocIds = this.findMatchingDocs(vertexDocs, documentId, documentCode, true);

			const currentRevision = matchingDocIds[0];

			let createAttestation = options?.createAttestation ?? false;

			// If the create attestation flag is not defined we check to see if any previous
			// revisions have an attestation and if so we create one for the new revision.
			if (Is.undefined(options?.createAttestation)) {
				createAttestation = matchingDocIds.some(d => Is.stringValue(d.attestationId));
			}

			// Calculate the hash for the blob.
			const blobHash = this.generateBlobHash(blob);

			// Is the blob data the same as the current revision ?
			if (currentRevision?.blobHash === blobHash) {
				// Blob data matches so no need to create a new revision
				// We update the current object if the annotation or createAttestation flag has changed.

				let updated = false;
				if (!ObjectHelper.equal(currentRevision.annotationObject, annotationObject, false)) {
					currentRevision.annotationObject = annotationObject;
					updated = true;
				}

				if (createAttestation && Is.empty(currentRevision.attestationId)) {
					currentRevision.attestationId = await this.createAttestation(
						currentRevision,
						userIdentity,
						nodeIdentity
					);
					updated = true;
				}

				if (updated) {
					currentRevision.dateModified = new Date(Date.now()).toISOString();
					await this._auditableItemGraphComponent.update(vertex, userIdentity, nodeIdentity);
				}

				return currentRevision.id;
			}

			// Nothing matches the current blob hash so upload it to blob storage
			const blobStorageId = await this._blobStorageComponent.create(
				Converter.bytesToBase64(blob),
				undefined,
				undefined,
				undefined,
				undefined,
				userIdentity,
				nodeIdentity
			);

			const documentRevision = matchingDocIds.length;

			// We are creating a new document, if there is already docs with the same id and code we use the list length
			// to determine the next revision number.
			const document: IDocument & IJsonLdNodeObject = {
				"@context": [
					DocumentTypes.ContextRoot,
					DocumentTypes.ContextRootCommon,
					SchemaOrgTypes.ContextRoot
				],
				type: DocumentTypes.Document,
				id: this.createIdentifier(documentCode, documentId, documentRevision),
				documentId,
				documentIdFormat,
				documentCode,
				documentRevision,
				blobStorageId,
				blobHash,
				annotationObject,
				dateCreated: new Date(Date.now()).toISOString(),
				nodeIdentity,
				userIdentity
			};

			// If the attestation flag is set then create it
			if (createAttestation ?? false) {
				document.attestationId = await this.createAttestation(document, userIdentity, nodeIdentity);
			}

			// Add the new revision in to the AIG
			vertex.resources.push({
				"@context": AuditableItemGraphTypes.ContextRoot,
				type: AuditableItemGraphTypes.Resource,
				resourceObject: document
			});
			await this._auditableItemGraphComponent.update(vertex, userIdentity, nodeIdentity);

			return document.id;
		} catch (error) {
			if (BaseError.someErrorName(error, nameof<NotFoundError>())) {
				throw error;
			}
			throw new GeneralError(this.CLASS_NAME, "setFailed", undefined, error);
		}
	}

	/**
	 * Get a specific document from an auditable item graph vertex.
	 * @param auditableItemGraphId The auditable item graph vertex id to get the document from.
	 * @param identifier The identifier of the document to get.
	 * @param options Additional options for the get operation.
	 * @param options.includeBlobStorageMetadata Flag to include the blob storage metadata for the document, defaults to false.
	 * @param options.includeBlobStorageData Flag to include the blob storage data for the document, defaults to false.
	 * @param options.includeAttestation Flag to include the attestation information for the document, defaults to false.
	 * @param options.includeRemoved Flag to include deleted documents, defaults to false.
	 * @param options.maxRevisionCount Max number of revisions to return, defaults to 0.
	 * @param revisionCursor The cursor to get the next chunk of revisions.
	 * @param userIdentity The identity to perform the auditable item graph operation with.
	 * @param nodeIdentity The node identity to use for vault operations.
	 * @returns The documents and revisions if requested, ordered by revision descending, cursor is set if there are more document revisions.
	 */
	public async get(
		auditableItemGraphId: string,
		identifier: string,
		options?: {
			includeBlobStorageMetadata?: boolean;
			includeBlobStorageData?: boolean;
			includeAttestation?: boolean;
			includeRemoved?: boolean;
			maxRevisionCount?: number;
		},
		revisionCursor?: string,
		userIdentity?: string,
		nodeIdentity?: string
	): Promise<IDocument> {
		Urn.guard(this.CLASS_NAME, nameof(auditableItemGraphId), auditableItemGraphId);
		Urn.guard(this.CLASS_NAME, nameof(identifier), identifier);

		try {
			const includeBlobStorageMetadata = options?.includeBlobStorageMetadata ?? false;
			const includeBlobStorageData = options?.includeBlobStorageData ?? false;
			const includeAttestation = options?.includeAttestation ?? false;
			const includeRemoved = options?.includeRemoved ?? false;
			const revCursor = Math.max(Coerce.integer(revisionCursor) ?? 0, 0);
			const maxRevisionCount = Math.max(Coerce.integer(options?.maxRevisionCount) ?? 0);

			const documentIdParts = this.parseDocumentId(identifier);

			const vertex = await this._auditableItemGraphComponent.get(auditableItemGraphId);

			// Get all the docs from the AIG vertex
			const vertexDocs = this.filterDocumentsFromVertex(vertex);

			// Reduce the list to those with a matching id and code
			const matchingDocIds = this.findMatchingDocs(
				vertexDocs,
				documentIdParts.documentId,
				documentIdParts.documentCode,
				includeRemoved
			);

			// Populate the document and revisions with the options set
			const document = await this.getDocumentAndRevisions(
				matchingDocIds,
				identifier,
				{
					includeBlobStorageMetadata,
					includeBlobStorageData,
					includeAttestation,
					includeRemoved,
					maxRevisionCount
				},
				revCursor,
				userIdentity,
				nodeIdentity
			);

			return JsonLdProcessor.compact(document, document["@context"]);
		} catch (error) {
			if (BaseError.someErrorName(error, nameof<NotFoundError>())) {
				throw error;
			}
			throw new GeneralError(this.CLASS_NAME, "getFailed", undefined, error);
		}
	}

	/**
	 * Remove a specific document from an auditable item graph vertex.
	 * The documents dateDeleted will be set, but can still be queried with the includeRemoved flag.
	 * @param auditableItemGraphId The auditable item graph vertex id to remove the document from.
	 * @param identifier The identifier of the document to remove.
	 * @param options Additional options for the remove operation.
	 * @param options.removeAllRevisions Flag to remove all revisions of the document, defaults to false.
	 * @param userIdentity The identity to perform the auditable item graph operation with.
	 * @param nodeIdentity The node identity to use for vault operations.
	 * @returns Nothing.
	 */
	public async remove(
		auditableItemGraphId: string,
		identifier: string,
		options?: { removeAllRevisions?: boolean },
		userIdentity?: string,
		nodeIdentity?: string
	): Promise<void> {
		Urn.guard(this.CLASS_NAME, nameof(auditableItemGraphId), auditableItemGraphId);
		Urn.guard(this.CLASS_NAME, nameof(identifier), identifier);

		try {
			const documentIdParts = this.parseDocumentId(identifier);

			const vertex = await this._auditableItemGraphComponent.get(auditableItemGraphId);

			// Get all the docs from the AIG vertex
			const vertexDocs = this.filterDocumentsFromVertex(vertex);

			// Reduce the list to those with a matching id and code
			const matchingDocIds = this.findMatchingDocs(
				vertexDocs,
				documentIdParts.documentId,
				documentIdParts.documentCode,
				false
			);

			const removeAllRevisions = options?.removeAllRevisions ?? false;

			const now = Date.now();
			if (removeAllRevisions) {
				for (const doc of matchingDocIds) {
					doc.dateDeleted = new Date(now).toISOString();
				}
			} else {
				const matchingRevision = matchingDocIds.find(
					d => d.documentRevision === documentIdParts.documentRevision
				);
				if (matchingRevision) {
					matchingRevision.dateDeleted = new Date(now).toISOString();
				} else {
					throw new NotFoundError(this.CLASS_NAME, "documentRevisionNotFound", identifier);
				}
			}

			await this._auditableItemGraphComponent.update(vertex, userIdentity, nodeIdentity);
		} catch (error) {
			if (BaseError.someErrorName(error, nameof<NotFoundError>())) {
				throw error;
			}
			throw new GeneralError(this.CLASS_NAME, "removeFailed", undefined, error);
		}
	}

	/**
	 * Query an auditable item graph vertex for documents.
	 * @param auditableItemGraphId The auditable item graph vertex to get the documents from.
	 * @param documentCodes The document codes to query for, if undefined gets all document codes.
	 * @param options Additional options for the query operation.
	 * @param options.includeMostRecentRevisions Include the most recent 5 revisions, use the individual get to retrieve more.
	 * @param options.includeRemoved Flag to include deleted documents, defaults to false.
	 * @param cursor The cursor to get the next chunk of documents.
	 * @param userIdentity The identity to perform the auditable item graph operation with.
	 * @param nodeIdentity The node identity to use for vault operations.
	 * @returns The most recent revisions of each document, cursor is set if there are more documents.
	 */
	public async query(
		auditableItemGraphId: string,
		documentCodes?: UneceDocumentCodes[],
		options?: {
			includeMostRecentRevisions?: boolean;
			includeRemoved?: boolean;
		},
		cursor?: string,
		userIdentity?: string,
		nodeIdentity?: string
	): Promise<IDocumentList> {
		Urn.guard(this.CLASS_NAME, nameof(auditableItemGraphId), auditableItemGraphId);

		try {
			const includeRemoved = options?.includeRemoved ?? false;
			const includeMostRecentRevisions = options?.includeMostRecentRevisions ?? false;
			const docCursor = Math.max(Coerce.integer(cursor) ?? 0, 0);

			const vertex = await this._auditableItemGraphComponent.get(auditableItemGraphId);

			// Get all the docs from the AIG vertex
			const vertexDocs = this.filterDocumentsFromVertex(vertex);

			let matchingDocIds = vertexDocs;
			if (Is.arrayValue(documentCodes)) {
				matchingDocIds = vertexDocs.filter(d => documentCodes.includes(d.documentCode));
			}

			const documentIdGroups: { [key: string]: (IDocument & IJsonLdNodeObject)[] } = {};
			let docGroupIds: string[] = [];

			for (const doc of matchingDocIds) {
				const docId = `${doc.documentId}:${doc.documentCode}`;
				if (!docGroupIds.includes(docId)) {
					docGroupIds.push(docId);
				}
				documentIdGroups[docId] ??= [];
				documentIdGroups[docId].push(doc);
			}

			let nextDocCursor;
			if (docGroupIds.length > docCursor + DocumentManagementService._DEFAULT_PAGE_SIZE) {
				nextDocCursor = (docCursor + DocumentManagementService._DEFAULT_PAGE_SIZE).toString();
			}

			docGroupIds = docGroupIds.slice(
				docCursor,
				docCursor + DocumentManagementService._DEFAULT_PAGE_SIZE
			);

			const finalDocs: (IDocument & IJsonLdNodeObject)[] = [];
			for (const docId of docGroupIds) {
				finalDocs.push(
					await this.getDocumentAndRevisions(
						documentIdGroups[docId],
						docId,
						{
							includeAttestation: false,
							includeBlobStorageData: false,
							includeBlobStorageMetadata: false,
							includeRemoved,
							maxRevisionCount: includeMostRecentRevisions ? 5 : 0
						},
						0,
						userIdentity,
						nodeIdentity
					)
				);
			}

			const docList: IDocumentList = {
				"@context": [
					DocumentTypes.ContextRoot,
					DocumentTypes.ContextRootCommon,
					SchemaOrgTypes.ContextRoot
				],
				type: DocumentTypes.DocumentList,
				documents: finalDocs,
				cursor: nextDocCursor
			};

			return JsonLdProcessor.compact(docList, docList["@context"]);
		} catch (error) {
			if (BaseError.someErrorName(error, nameof<NotFoundError>())) {
				throw error;
			}
			throw new GeneralError(this.CLASS_NAME, "queryFailed", undefined, error);
		}
	}

	/**
	 * Encode the document id.
	 * @param documentId The document identifier.
	 * @returns The encoded identifier.
	 * @internal
	 */
	private encodeDocumentIdentifier(documentId: string, documentRevision: number): string {
		return `${documentId}:rev-${documentRevision}`;
	}

	/**
	 * Decode the document id.
	 * @param documentId The document identifier.
	 * @returns The decoded identifier.
	 * @internal
	 */
	private decodeDocumentIdentifier(documentId: string): {
		documentId: string;
		documentRevision?: number;
	} {
		const parts = documentId.split(":");
		const lastPart = parts[parts.length - 1];
		let revision;
		if (lastPart.startsWith("rev-")) {
			revision = Number.parseInt(lastPart.slice(4), 10);
			parts.pop();
		}
		return { documentId: parts.join(":"), documentRevision: revision };
	}

	/**
	 * Create a full identifier for a document.
	 * @param documentCode The document code.
	 * @param documentId The document identifier.
	 * @param documentRevision The document revision.
	 * @returns The full identifier.
	 * @internal
	 */
	private createIdentifier(
		documentCode: UneceDocumentCodes,
		documentId: string,
		documentRevision: number
	): string {
		const docCode = this.parseDocumentCode(documentCode);
		return `documents:${docCode}:${this.encodeDocumentIdentifier(documentId, documentRevision)}`;
	}

	/**
	 * Parse the document identifier from the full identifier.
	 * @param identifier The full identifier to parse.
	 * @returns The document identifier.
	 * @internal
	 */
	private parseDocumentId(identifier: string): {
		documentCode: UneceDocumentCodes;
		documentId: string;
		documentRevision?: number;
	} {
		const urn = Urn.fromValidString(identifier);
		const remainingParts = urn.namespaceSpecificParts();

		if (remainingParts.length < 2) {
			throw new GeneralError(this.CLASS_NAME, "invalidDocumentId", { identifier });
		}

		const documentCode = `unece:DocumentCodeList#${remainingParts[0]}`;
		const { documentId, documentRevision } = this.decodeDocumentIdentifier(
			urn.namespaceSpecific(1)
		);

		return { documentCode, documentId, documentRevision };
	}

	/**
	 * Parse the document code from the full identifier.
	 * @param documentCode The document code to parse.
	 * @returns The document code.
	 * @internal
	 */
	private parseDocumentCode(documentCode: UneceDocumentCodes): number {
		// Document codes are in the format unece:DocumentCodeList#1, so we need to split the string to get the code.
		const documentCodeParts = documentCode.split("#");
		if (documentCodeParts.length !== 2) {
			throw new GeneralError(this.CLASS_NAME, "invalidDocumentCode", { documentCode });
		}

		const docCode = Number.parseInt(documentCodeParts[1], 10);
		if (!Is.number(docCode)) {
			throw new GeneralError(this.CLASS_NAME, "invalidDocumentCode", { documentCode });
		}

		return docCode;
	}

	/**
	 * Get the documents from a vertex.
	 * @param vertex The vertex to get the documents from.
	 * @returns The documents.
	 * @internal
	 */
	private filterDocumentsFromVertex(
		vertex: IAuditableItemGraphVertex
	): (IDocument & IJsonLdNodeObject)[] {
		return (
			vertex.resources
				?.filter(
					resource =>
						ObjectHelper.extractProperty(resource.resourceObject, ["@type", "type"], false) ===
						DocumentTypes.Document
				)
				.map(resource => resource.resourceObject as IDocument & IJsonLdNodeObject) ?? []
		);
	}

	/**
	 * Find matching documents in the list of existing documents.
	 * @param documents The documents to search.
	 * @param documentId The document id.
	 * @param documentCode The document code.
	 * @param includeRemoved Include deleted documents.
	 * @returns The matching documents.
	 * @internal
	 */
	private findMatchingDocs(
		documents: (IDocument & IJsonLdNodeObject)[],
		documentId: string,
		documentCode: string,
		includeRemoved: boolean
	): (IDocument & IJsonLdNodeObject)[] {
		return documents
			.filter(
				d =>
					d.documentId === documentId &&
					d.documentCode === documentCode &&
					(includeRemoved || Is.empty(d.dateDeleted))
			)
			.sort((a, b) => b.documentRevision - a.documentRevision);
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
	 * @param matchingDocIds The documents which match document type and id.
	 * @param identifier The full document identifier.
	 * @param options Additional options for the get operation.
	 * @param options.includeBlobStorageMetadata Flag to include the blob storage metadata for the document, defaults to false.
	 * @param options.includeBlobStorageData Flag to include the blob storage data for the document, defaults to false.
	 * @param options.includeAttestation Flag to include the attestation information for the document, defaults to false.
	 * @param options.includeRemoved Flag to include deleted documents, defaults to false.
	 * @param options.maxRevisionCount Max number of revisions to return, defaults to 0.
	 * @param revisionCursor The cursor to get the next chunk of revisions.
	 * @param userIdentity The identity to perform the auditable item graph operation with.
	 * @param nodeIdentity The node identity to use for vault operations.
	 * @returns The finalised list of documents.
	 * @internal
	 */
	private async getDocumentAndRevisions(
		matchingDocIds: (IDocument & IJsonLdNodeObject)[],
		identifier: string,
		options: {
			includeBlobStorageMetadata: boolean;
			includeBlobStorageData: boolean;
			includeAttestation: boolean;
			includeRemoved: boolean;
			maxRevisionCount: number;
		},
		revisionCursor: number,
		userIdentity?: string,
		nodeIdentity?: string
	): Promise<IDocument & IJsonLdNodeObject> {
		const document = matchingDocIds.shift();
		if (Is.empty(document)) {
			throw new NotFoundError(this.CLASS_NAME, "documentRevisionNotFound", identifier);
		}

		let revisions: (IDocument & IJsonLdNodeObject)[] | undefined;
		let nextRevisionCursor;

		if (options.maxRevisionCount > 0) {
			revisions = matchingDocIds.slice(revisionCursor, revisionCursor + options.maxRevisionCount);
			nextRevisionCursor =
				matchingDocIds.length > revisionCursor + options.maxRevisionCount
					? (revisionCursor + options.maxRevisionCount).toString()
					: undefined;
		}

		if (options.includeBlobStorageMetadata || options.includeBlobStorageData) {
			const blobEntry = await this._blobStorageComponent.get(
				document.blobStorageId,
				options.includeBlobStorageData,
				userIdentity,
				nodeIdentity
			);
			document.blobStorageEntry = blobEntry;
			document["@context"].push(BlobStorageTypes.ContextRoot);
		}

		if (options.includeAttestation && Is.stringValue(document.attestationId)) {
			const attestationInformation = await this._attestationComponent.get(document.attestationId);
			document.attestationInformation = attestationInformation;
			document["@context"].push(AttestationTypes.ContextRoot);
		}

		document.revisions = Is.arrayValue(revisions) ? revisions : undefined;
		document.revisionCursor = nextRevisionCursor;

		return document;
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
				DocumentTypes.ContextRoot,
				DocumentTypes.ContextRootCommon,
				SchemaOrgTypes.ContextRoot
			],
			type: DocumentTypes.DocumentAttestation,
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
