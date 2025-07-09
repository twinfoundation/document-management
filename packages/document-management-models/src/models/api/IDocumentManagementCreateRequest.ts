// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { IJsonLdNodeObject } from "@twin.org/data-json-ld";
import type { UneceDocumentCodes } from "@twin.org/standards-unece";

/**
 * Request to create a document as an auditable item graph vertex.
 */
export interface IDocumentManagementCreateRequest {
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
		 * The auditable item graph vertices to connect the document to.
		 */
		auditableItemGraphEdges?: {
			id: string;
			addAlias?: boolean;
			aliasAnnotationObject?: IJsonLdNodeObject;
		}[];

		/**
		 * Flag to create an attestation for the document, defaults to false.
		 */
		createAttestation?: boolean;

		/**
		 * Flag to add the document id as an alias to the aig vertex, defaults to true.
		 */
		addAlias?: boolean;

		/**
		 * Annotation object for the alias.
		 */
		aliasAnnotationObject?: IJsonLdNodeObject;
	};
}
