// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.

/**
 * Request to remove a document revision from an auditable item graph.
 */
export interface IDocumentManagementRemoveRequest {
	/**
	 * The path parameters.
	 */
	pathParams: {
		/**
		 * The id of the auditable item graph vertex to remove the revision from.
		 */
		auditableItemGraphDocumentId: string;

		/**
		 * The revision of the document to remove.
		 */
		revision: string;
	};
}
