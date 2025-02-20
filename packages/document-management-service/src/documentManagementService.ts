// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { IAttestationComponent } from "@twin.org/attestation-models";
import {
	AuditableItemGraphTypes,
	type IAuditableItemGraphComponent,
	type IAuditableItemGraphVertex
} from "@twin.org/auditable-item-graph-models";
import type { IBlobStorageComponent } from "@twin.org/blob-storage-models";
import {
	BaseError,
	ComponentFactory,
	Converter,
	GeneralError,
	Guards,
	Is,
	ObjectHelper,
	Urn,
	type NotFoundError
} from "@twin.org/core";
import { Sha256 } from "@twin.org/crypto";
import { JsonLdProcessor, type IJsonLdNodeObject } from "@twin.org/data-json-ld";
import {
	DocumentTypes,
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
	 * @param createAttestation Flag to create an attestation for the document, defaults to false.
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
		createAttestation?: boolean,
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

		try {
			const vertex = await this._auditableItemGraphComponent.get(auditableItemGraphId);

			vertex.resources = vertex.resources ?? [];

			// Get all the docs from the AIG vertex
			const vertexDocs = this.filterDocumentsFromVertex(vertex);

			// Reduce the list to those with a matching id and code
			const matchingDocIds = this.findMatchingDocs(vertexDocs, documentId, documentCode);

			// Calculate the hash for the blob.
			const blobHash = this.generateBlobHash(blob);

			const matchingDocHash = matchingDocIds.find(d => d.blobHash === blobHash);

			let documentRevision;

			if (Is.object(matchingDocHash)) {
				documentRevision = matchingDocHash.documentRevision;

				// If there is already a doc with the matching blob hash no need to create a new revision
				// instead we just update the annotation object if it has changed.
				if (!ObjectHelper.equal(matchingDocHash.annotationObject, annotationObject, false)) {
					matchingDocHash.dateModified = new Date().toISOString();
					matchingDocHash.annotationObject = annotationObject;
					await this._auditableItemGraphComponent.update(vertex, userIdentity, nodeIdentity);
				}

				return matchingDocHash.id;
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

			documentRevision = matchingDocIds.length;

			// We are creating a new document, if there is already docs with the same id and code we use the list length
			// to determine the next revision number.
			const document: IDocument & IJsonLdNodeObject = {
				"@context": [
					DocumentTypes.ContextRoot,
					DocumentTypes.ContextRootCommon,
					SchemaOrgTypes.ContextRoot
				],
				type: DocumentTypes.Document,
				id: documentId,
				documentIdFormat,
				documentCode,
				documentRevision,
				blobStorageId,
				blobHash,
				dateCreated: new Date(Date.now()).toISOString()
			};

			// If the attestation flag is set then create it
			if (createAttestation ?? false) {
				document.attestationId = await this._attestationComponent.create(
					document,
					undefined,
					userIdentity,
					nodeIdentity
				);
			}

			// We assign the annotation object after the attestation was created
			// as we don't want to include it in the attestation
			document.annotationObject = annotationObject;

			// Add the new revision in to the AIG
			vertex.resources.push({
				"@context": AuditableItemGraphTypes.ContextRoot,
				type: AuditableItemGraphTypes.Resource,
				resourceObject: document
			});
			await this._auditableItemGraphComponent.update(vertex, userIdentity, nodeIdentity);

			return this.createIdentifier(
				auditableItemGraphId,
				document.documentCode,
				document.id,
				document.documentRevision
			);
		} catch (error) {
			if (BaseError.someErrorName(error, nameof<NotFoundError>())) {
				throw error;
			}
			throw new GeneralError(this.CLASS_NAME, "setFailed", undefined, error);
		}
	}

	/**
	 * Get a specific document from an auditable item graph vertex.
	 * @param identifier The identifier of the document to get.
	 * @param options Additional options for the get operation.
	 * @param options.includeBlobStorageMetadata Flag to include the blob storage metadata for the document.
	 * @param options.includeBlobStorageData Flag to include the blob storage data for the document.
	 * @param options.includeAttestation Flag to include the attestation information for the document.
	 * @param options.maxRevisionCount Max number of revisions to return, defaults to 0.
	 * @param revisionCursor The cursor to get the next chunk of revisions.
	 * @param userIdentity The identity to perform the auditable item graph operation with.
	 * @param nodeIdentity The node identity to use for vault operations.
	 * @returns The documents and revisions if requested, ordered by revision descending, cursor is set if there are more document revisions.
	 */
	public async get(
		identifier: string,
		options?: {
			includeBlobStorageMetadata?: boolean;
			includeBlobStorageData?: boolean;
			includeAttestation?: boolean;
			maxRevisionCount?: number;
		},
		revisionCursor?: string,
		userIdentity?: string,
		nodeIdentity?: string
	): Promise<IDocumentList> {
		Urn.guard(this.CLASS_NAME, nameof(identifier), identifier);

		try {
			const documentIdParts = this.parseDocumentId(identifier);

			const vertex = await this._auditableItemGraphComponent.get(
				documentIdParts.auditableItemGraphId
			);

			// Get all the docs from the AIG vertex
			const vertexDocs = this.filterDocumentsFromVertex(vertex);

			// Reduce the list to those with a matching id and code
			const matchingDocIds = this.findMatchingDocs(
				vertexDocs,
				documentIdParts.documentId,
				documentIdParts.documentCode
			);

			const includeBlobStorageMetadata = options?.includeBlobStorageMetadata ?? false;
			const includeBlobStorageData = options?.includeBlobStorageData ?? false;
			if (includeBlobStorageMetadata || includeBlobStorageData) {
				const blobEntry = await this._blobStorageComponent.get(
					matchingDocIds[0].blobStorageId,
					includeBlobStorageData,
					userIdentity,
					nodeIdentity
				);
				matchingDocIds[0].blobStorageEntry = blobEntry;
			}

			const includeAttestation = options?.includeAttestation ?? false;
			if (includeAttestation && Is.stringValue(matchingDocIds[0].attestationId)) {
				const attestationInformation = await this._attestationComponent.get(
					matchingDocIds[0].attestationId
				);
				matchingDocIds[0].attestationInformation = attestationInformation;
			}

			const docList: IDocumentList = {
				"@context": [
					DocumentTypes.ContextRoot,
					DocumentTypes.ContextRootCommon,
					SchemaOrgTypes.ContextRoot
				],
				type: DocumentTypes.DocumentList,
				documents: matchingDocIds
			};

			return JsonLdProcessor.compact(docList);
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
	 * @param identifier The identifier of the document to remove.
	 * @param userIdentity The identity to perform the auditable item graph operation with.
	 * @param nodeIdentity The node identity to use for vault operations.
	 * @returns Nothing.
	 */
	public async remove(
		identifier: string,
		userIdentity?: string,
		nodeIdentity?: string
	): Promise<void> {}

	/**
	 * Query an auditable item graph vertex for documents.
	 * @param auditableItemGraphId The auditable item graph vertex to get the documents from.
	 * @param documentCodes The document codes to query for, if undefined gets all document codes.
	 * @param cursor The cursor to get the next chunk of documents.
	 * @param userIdentity The identity to perform the auditable item graph operation with.
	 * @param nodeIdentity The node identity to use for vault operations.
	 * @returns The most recent revisions of each document, cursor is set if there are more documents.
	 */
	public async query(
		auditableItemGraphId: string,
		documentCodes?: UneceDocumentCodes[],
		cursor?: string,
		userIdentity?: string,
		nodeIdentity?: string
	): Promise<IDocumentList> {
		return {} as IDocumentList;
	}

	/**
	 * Create a full identifier for a document.
	 * @param auditableItemGraphId The auditable item graph identifier.
	 * @param documentCode The document code.
	 * @param documentId The document identifier.
	 * @param documentRevision The document revision.
	 * @returns The full identifier.
	 * @internal
	 */
	private createIdentifier(
		auditableItemGraphId: string,
		documentCode: UneceDocumentCodes,
		documentId: string,
		documentRevision: number
	): string {
		const docCode = this.parseDocumentCode(documentCode);
		return `${auditableItemGraphId}:${docCode}:${documentId}:${documentRevision}`;
	}

	/**
	 * Parse the document identifier from the full identifier.
	 * @param identifier The full identifier to parse.
	 * @returns The document identifier.
	 * @internal
	 */
	private parseDocumentId(identifier: string): {
		auditableItemGraphId: string;
		documentCode: UneceDocumentCodes;
		documentId: string;
		documentRevision?: number;
	} {
		const urn = Urn.fromValidString(identifier);
		const auditableItemGraphId = `${urn.namespaceIdentifier()}:${urn.namespaceMethod()}`;
		const remainingParts = urn.namespaceSpecificParts();

		if (remainingParts.length < 3) {
			throw new GeneralError(this.CLASS_NAME, "invalidDocumentId", { identifier });
		}

		const documentCode = `unece:DocumentCodeList#${remainingParts[1]}`;
		const documentId = remainingParts[2];
		const documentRevision =
			remainingParts.length === 4 ? Number.parseInt(remainingParts[3], 10) : undefined;

		return { auditableItemGraphId, documentCode, documentId, documentRevision };
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
	 * @returns The matching documents.
	 * @internal
	 */
	private findMatchingDocs(
		documents: (IDocument & IJsonLdNodeObject)[],
		documentId: string,
		documentCode: string
	): (IDocument & IJsonLdNodeObject)[] {
		return documents
			.filter(
				d =>
					ObjectHelper.extractProperty(d, ["@id", "id"], false) === documentId &&
					d.documentCode === documentCode
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
}
