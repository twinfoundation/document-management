// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { IJsonLdNodeObject } from "@twin.org/data-json-ld";
import type { UneceDocumentCodes } from "@twin.org/standards-unece";

/**
 * Request to set a document in an auditable item graph vertex.
 */
export interface IDocumentManagementSetRequest {
	/**
	 * The path parameters.
	 */
	pathParams: {
		/**
		 * The id of the auditable item graph vertex to store the document on.
		 */
		auditableItemGraphId: string;
	};

	/**
	 * The body parameters.
	 */
	body: {
		/**
		 * The document id to create.
		 */
		documentId: string;

		/**
		 * The format of the document identifier.
		 */
		documentIdFormat: string | undefined;

		/**
		 * The code for the document type.
		 */
		documentCode: UneceDocumentCodes;

		/**
		 * The data to create the document with, in base64.
		 */
		blob: string;

		/**
		 * Additional information to associate with the document.
		 */
		annotationObject?: IJsonLdNodeObject;

		/**
		 * Flag to create an attestation for the document, defaults to false
		 */
		createAttestation?: boolean;
	};
}
