// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { IComponent } from "@twin.org/core";
import type { IJsonLdNodeObject } from "@twin.org/data-json-ld";
import type { UneceDocumentCodes } from "@twin.org/standards-unece";
import type { IDocument } from "./IDocument";

/**
 * Interface describing an document management contract.
 */
export interface IDocumentManagementComponent extends IComponent {
	/**
	 * Add a new document to an auditable item graph vertex and add its content to blob storage.
	 * @param auditableItemGraphId The auditable item graph vertex id to create the document on.
	 * @param documentId The document id to create.
	 * @param documentIdFormat The format of the document identifier.
	 * @param documentCode The code for the document type.
	 * @param data The data to create the document with.
	 * @param annotationObject Additional information to associate with the document.
	 * @param createAttestation Flag to create an attestation for the document.
	 * @returns The identifier for the document which includes the auditable item graph identifier.
	 */
	create(
		auditableItemGraphId: string,
		documentId: string,
		documentIdFormat: string | undefined,
		documentCode: UneceDocumentCodes,
		data: Uint8Array,
		annotationObject: IJsonLdNodeObject | undefined,
		createAttestation: boolean
	): Promise<string>;

	/**
	 * Get a specific document from an auditable item graph vertex.
	 * @param identifier The identifier of the document to get.
	 * @param includeRevisions Flag to include the revisions of the document.
	 * @param includeRemoved Flag to include any removed documents, dateDeleted will be set for these documents.
	 * @returns The documents and revisions if requested.
	 */
	get(
		identifier: string,
		includeRevisions?: boolean,
		includeRemoved?: boolean
	): Promise<IDocument[]>;

	/**
	 * Remove a specific document from an auditable item graph vertex.
	 * @param identifier The identifier of the document to remove.
	 * @returns Nothing.
	 */
	remove(identifier: string): Promise<void>;

	/**
	 * Query an auditable item graph vertex for documents.
	 * @param auditableItemGraphId The auditable item graph vertex to get the documents from.
	 * @param documentCodes The document codes to filter by.
	 * @param includeRevisions Flag to include the revisions of the document.
	 * @param includeRemoved Flag to include any removed documents, dateDeleted will be set for these documents.
	 * @returns The documents and revisions if requested.
	 */
	query(
		auditableItemGraphId: string,
		documentCodes?: UneceDocumentCodes[],
		includeRevisions?: boolean,
		includeRemoved?: boolean
	): Promise<IDocument[]>;
}
