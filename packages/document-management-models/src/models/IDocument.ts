// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { IAttestationInformation } from "@twin.org/attestation-models";
import type { IBlobStorageEntry } from "@twin.org/blob-storage-models";
import type { IJsonLdContextDefinitionElement, IJsonLdNodeObject } from "@twin.org/data-json-ld";
import type { SchemaOrgTypes } from "@twin.org/standards-schema-org";
import type { UneceDocumentCodes } from "@twin.org/standards-unece";
import type { DocumentTypes } from "./documentDataTypes";

/**
 * Interface describing a document.
 */
export interface IDocument {
	/**
	 * JSON-LD Context.
	 */
	"@context": [
		typeof DocumentTypes.ContextRoot,
		typeof DocumentTypes.ContextRootCommon,
		typeof SchemaOrgTypes.ContextRoot,
		...IJsonLdContextDefinitionElement[]
	];

	/**
	 * JSON-LD Type.
	 */
	type: typeof DocumentTypes.Document;

	/**
	 * The full id of the document.
	 */
	id: string;

	/**
	 * The id of the document.
	 */
	documentId: string;

	/**
	 * The format of the document id.
	 */
	documentIdFormat?: string;

	/**
	 * The code for the document type.
	 */
	documentCode: UneceDocumentCodes;

	/**
	 * The revision of the document as a 0 based index.
	 */
	documentRevision: number;

	/**
	 * Additional annotation information for the document.
	 */
	annotationObject?: IJsonLdNodeObject;

	/**
	 * The blob storage id for the document.
	 */
	blobStorageId: string;

	/**
	 * The hash of the blob data.
	 */
	blobHash: string;

	/**
	 * The additional JSON-LD for blob storage if it was requested.
	 */
	blobStorageEntry?: IBlobStorageEntry;

	/**
	 * The attestation for the document if one was created.
	 */
	attestationId?: string;

	/**
	 * The additional JSON-LD for attestation storage if it was requested.
	 */
	attestationInformation?: IAttestationInformation;

	/**
	 * The date/time of when the document was created.
	 */
	dateCreated: string;

	/**
	 * The date/time of when the document was modified.
	 */
	dateModified?: string;

	/**
	 * The date/time of when the document was deleted, as we never actually remove items.
	 */
	dateDeleted?: string;

	/**
	 * The node which added the document to the graph.
	 */
	nodeIdentity: string;

	/**
	 * The user who added the document to the graph.
	 */
	userIdentity: string;

	/**
	 * The previous revisions of the document.
	 */
	revisions?: IDocument[];

	/**
	 * The cursor to get the next chunk of revisions.
	 */
	revisionCursor?: string;
}
