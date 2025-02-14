// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.

/**
 * The types of document management objects.
 */
// eslint-disable-next-line @typescript-eslint/naming-convention
export const DocumentTypes = {
	/**
	 * The context root for the auditable item graph types.
	 */
	ContextRoot: "https://schema.twindev.org/documents/",

	/**
	 * Represents a document.
	 */
	Document: "Document"
} as const;

/**
 * The types of document management objects.
 */
export type DocumentTypes = (typeof DocumentTypes)[keyof typeof DocumentTypes];
