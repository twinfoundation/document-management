// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import { DocumentManagementClient } from "../src/documentManagementClient";

describe("DocumentManagementClient", () => {
	test("Can create an instance", async () => {
		const client = new DocumentManagementClient({ endpoint: "http://localhost:8080" });
		expect(client).toBeDefined();
	});
});
