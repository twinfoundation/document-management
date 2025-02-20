// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { HeaderTypes, MimeTypes } from "@twin.org/web";

/**
 * Request to get a document from an auditable item graph vertex.
 */
export interface IDocumentManagementGetRequest {
	/**
	 * The headers which can be used to determine the response data type.
	 */
	headers?: {
		[HeaderTypes.Accept]: typeof MimeTypes.Json | typeof MimeTypes.JsonLd;
	};

	/**
	 * The path parameters.
	 */
	pathParams: {
		/**
		 * The id of the document to get which includes the auditable item graph vertex.
		 */
		id: string;
	};

	/**
	 * The query parameters.
	 */
	query?: {
		/**
		 * Include the blob storage metadata in the response.
		 * @default false
		 */
		includeBlobStorageMetadata?: boolean;

		/**
		 * Include the blob storage data in the response.
		 * @default false
		 */
		includeBlobStorageData?: boolean;

		/**
		 * Include the attestation information in the response.
		 * @default false
		 */

		includeAttestation?: boolean;

		/**
		 * Max number of revisions to return.
		 * @default 0
		 */
		maxRevisionCount?: number;

		/**
		 * The cursor to get the next chunk of revisions.
		 */
		revisionCursor?: string;
	};
}
