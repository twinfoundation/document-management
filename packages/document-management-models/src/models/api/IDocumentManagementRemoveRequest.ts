// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.

/**
 * Request to remove a document from an auditable item graph.
 */
export interface IDocumentManagementRemoveRequest {
	/**
	 * The path parameters.
	 */
	pathParams: {
		/**
		 * The id of the auditable item graph vertex to remove the document from.
		 */
		auditableItemGraphId: string;

		/**
		 * The full id of the document to remove.
		 */
		documentId: string;
	};

	/**
	 * The query parameters.
	 */
	query?: {
		/**
		 * Flag to remove all revisions of the document.
		 * @default false
		 */
		removeAllRevisions?: boolean;
	};
}
