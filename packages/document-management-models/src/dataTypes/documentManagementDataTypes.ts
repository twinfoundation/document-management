// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import { DataTypeHandlerFactory } from "@twin.org/data-core";
import type { JSONSchema7 } from "json-schema";
import { DocumentContexts } from "../models/documentContexts";
import { DocumentTypes } from "../models/documentTypes";
import DocumentSchema from "../schemas/Document.json";

/**
 * Handle all the data types for document management.
 */
export class DocumentManagementDataTypes {
	/**
	 * Register all the data types.
	 */
	public static registerTypes(): void {
		DataTypeHandlerFactory.register(
			`${DocumentContexts.ContextRoot}${DocumentTypes.Document}`,
			() => ({
				context: DocumentContexts.ContextRoot,
				type: DocumentTypes.Document,
				defaultValue: {},
				jsonSchema: async () => DocumentSchema as JSONSchema7
			})
		);

		DataTypeHandlerFactory.register(
			`${DocumentContexts.ContextRoot}${DocumentTypes.DocumentAttestation}`,
			() => ({
				context: DocumentContexts.ContextRoot,
				type: DocumentTypes.DocumentAttestation,
				defaultValue: {},
				jsonSchema: async () => DocumentSchema as JSONSchema7
			})
		);
	}
}
