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
		 * The id of the document to get which includes the auditable item graph vertex.
		 */
		id: string;
	};
}
