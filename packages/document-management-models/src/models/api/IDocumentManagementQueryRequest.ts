// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { HeaderTypes, MimeTypes } from "@twin.org/web";

/**
 * Request to get a list of document from an auditable item graph vertex.
 */
export interface IDocumentManagementQueryRequest {
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
		 * The id of the auditable item graph vertex which contains the documents.
		 */
		auditableItemGraphId: string;
	};

	/**
	 * The query parameters.
	 */
	query?: {
		/**
		 * List of comma separated document codes to filter the query.
		 */
		documentCodes?: string;

		/**
		 * Include deleted documents in the response.
		 * @default false
		 */
		includeRemoved?: boolean;

		/**
		 * Include the most recent 5 revisions, use the individual get to retrieve more.
		 * @default false
		 */
		includeMostRecentRevisions?: boolean;

		/**
		 * The cursor to get the next chunk of documents.
		 */
		cursor?: string;
	};
}
