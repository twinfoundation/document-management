// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { IComponent } from "@twin.org/core";
import type { IJsonLdNodeObject } from "@twin.org/data-json-ld";
import type { UneceDocumentCodes } from "@twin.org/standards-unece";
import type { IDocumentList } from "./IDocumentList";

/**
 * Interface describing an document management contract.
 */
export interface IDocumentManagementComponent extends IComponent {
	/**
	 * Store a document in an auditable item graph vertex and add its content to blob storage.
	 * If the document id already exists and the blob data is different a new revision will be created.
	 * For any other changes the current revision will be updated.
	 * @param auditableItemGraphId The auditable item graph vertex id to create the document on.
	 * @param documentId The document id to create.
	 * @param documentIdFormat The format of the document identifier.
	 * @param documentCode The code for the document type.
	 * @param blob The data to create the document with.
	 * @param annotationObject Additional information to associate with the document.
	 * @param createAttestation Flag to create an attestation for the document, defaults to false.
	 * @param userIdentity The identity to perform the auditable item graph operation with.
	 * @param nodeIdentity The node identity to use for vault operations.
	 * @returns The identifier for the document which includes the auditable item graph identifier.
	 */
	set(
		auditableItemGraphId: string,
		documentId: string,
		documentIdFormat: string | undefined,
		documentCode: UneceDocumentCodes,
		blob: Uint8Array,
		annotationObject?: IJsonLdNodeObject,
		createAttestation?: boolean,
		userIdentity?: string,
		nodeIdentity?: string
	): Promise<string>;

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
	get(
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
	): Promise<IDocumentList>;

	/**
	 * Remove a specific document from an auditable item graph vertex.
	 * The documents dateDeleted will be set, but can still be queried with the includeRemoved flag.
	 * @param identifier The identifier of the document to remove.
	 * @param userIdentity The identity to perform the auditable item graph operation with.
	 * @param nodeIdentity The node identity to use for vault operations.
	 * @returns Nothing.
	 */
	remove(identifier: string, userIdentity?: string, nodeIdentity?: string): Promise<void>;

	/**
	 * Query an auditable item graph vertex for documents.
	 * @param auditableItemGraphId The auditable item graph vertex to get the documents from.
	 * @param documentCodes The document codes to query for, if undefined gets all document codes.
	 * @param cursor The cursor to get the next chunk of documents.
	 * @param userIdentity The identity to perform the auditable item graph operation with.
	 * @param nodeIdentity The node identity to use for vault operations.
	 * @returns The most recent revisions of each document, cursor is set if there are more documents.
	 */
	query(
		auditableItemGraphId: string,
		documentCodes?: UneceDocumentCodes[],
		cursor?: string,
		userIdentity?: string,
		nodeIdentity?: string
	): Promise<IDocumentList>;
}
