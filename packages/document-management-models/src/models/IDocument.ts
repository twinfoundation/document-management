// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { IJsonLdContextDefinitionElement, IJsonLdNodeObject } from "@twin.org/data-json-ld";
import type { UneceDocumentCodes } from "@twin.org/standards-unece";
import type { DocumentTypes } from "./documentDataTypes";

/**
 * Interface describing a document.
 */
export interface IDocument {
	/**
	 * JSON-LD Context.
	 */
	"@context":
		| typeof DocumentTypes.ContextRoot
		| [typeof DocumentTypes.ContextRoot, ...IJsonLdContextDefinitionElement[]];

	/**
	 * The id of the document.
	 */
	id: string;

	/**
	 * JSON-LD Type.
	 */
	type: typeof DocumentTypes.Document;

	/**
	 * The format of the document id.
	 */
	documentIdFormat?: string;

	/**
	 * The code for the document type.
	 */
	documentCode: UneceDocumentCodes;

	/**
	 * The revision of the document.
	 */
	documentRevision?: number;

	/**
	 * Additional annotation information for the document.
	 */
	annotationObject?: IJsonLdNodeObject;

	/**
	 * The blob storage id for the document.
	 */
	blobStorageId: string;

	/**
	 * The attestation for the document if one was created.
	 */
	attestationId?: string;

	/**
	 * The date/time of when the element was created.
	 */
	dateCreated: string;

	/**
	 * The date/time of when the element was modified.
	 */
	dateModified?: string;

	/**
	 * The date/time of when the element was deleted, as we never actually remove items.
	 */
	dateDeleted?: string;
}
