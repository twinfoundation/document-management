// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.

/**
 * The contexts of document management objects.
 */
// eslint-disable-next-line @typescript-eslint/naming-convention
export const DocumentContexts = {
	/**
	 * The context root for the document types.
	 */
	ContextRoot: "https://schema.twindev.org/documents/",

	/**
	 * The context root for the common types.
	 */
	ContextRootCommon: "https://schema.twindev.org/common/"
} as const;

/**
 * The contexts of document management objects.
 */
export type DocumentContexts = (typeof DocumentContexts)[keyof typeof DocumentContexts];
