// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { IDocumentManagementServiceConfig } from "./IDocumentManagementServiceConfig";

/**
 * Options for the document management Service constructor.
 */
export interface IDocumentManagementServiceConstructorOptions {
	/**
	 * The type of the auditable item graph component.
	 * @default auditable-item-graph
	 */
	auditableItemGraphComponentType?: string;

	/**
	 * The type of the blob storage component.
	 * @default blob-storage
	 */
	blobStorageComponentType?: string;

	/**
	 * The type of the attestation component.
	 * @default attestation
	 */
	attestationComponentType?: string;

	/**
	 * The configuration for the service.
	 */
	config?: IDocumentManagementServiceConfig;
}
