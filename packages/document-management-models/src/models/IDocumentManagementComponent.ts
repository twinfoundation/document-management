// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { IComponent } from "@twin.org/core";

/**
 * Interface describing an document management contract.
 */
export interface IDocumentManagementComponent extends IComponent {
	/**
	 * Create a new document.
	 * @param data The data to create the document with.
	 * @returns Nothing.
	 */
	create(data: Uint8Array): Promise<void>;
}
