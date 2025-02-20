// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { IJsonLdContextDefinitionElement } from "@twin.org/data-json-ld";
import type { DocumentTypes } from "./documentDataTypes";
import type { IDocument } from "./IDocument";

/**
 * Interface describing a document entry list.
 */
export interface IDocumentList {
	/**
	 * JSON-LD Context.
	 */
	"@context": [
		typeof DocumentTypes.ContextRoot,
		typeof DocumentTypes.ContextRootCommon,
		...IJsonLdContextDefinitionElement[]
	];

	/**
	 * JSON-LD Type.
	 */
	type: typeof DocumentTypes.DocumentList;

	/**
	 * The list of documents.
	 */
	documents: IDocument[];

	/**
	 * The cursor to get the next chunk of documents.
	 */
	cursor?: string;
}
