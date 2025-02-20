// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import path from "node:path";
import { Is, RandomHelper } from "@twin.org/core";
import { Bip39 } from "@twin.org/crypto";
import { MemoryEntityStorageConnector } from "@twin.org/entity-storage-connector-memory";
import { EntityStorageConnectorFactory } from "@twin.org/entity-storage-models";
import {
	EntityStorageIdentityConnector,
	type IdentityDocument,
	initSchema as initSchemaIdentity
} from "@twin.org/identity-connector-entity-storage";
import { IdentityConnectorFactory } from "@twin.org/identity-models";
import { nameof } from "@twin.org/nameof";
import {
	EntityStorageVaultConnector,
	initSchema as initSchemaVault,
	type VaultKey,
	type VaultSecret
} from "@twin.org/vault-connector-entity-storage";
import { VaultConnectorFactory, VaultKeyType } from "@twin.org/vault-models";
import {
	EntityStorageWalletConnector,
	initSchema as initSchemaWallet,
	type WalletAddress
} from "@twin.org/wallet-connector-entity-storage";
import { WalletConnectorFactory } from "@twin.org/wallet-models";
import * as dotenv from "dotenv";

console.debug("Setting up test environment from .env and .env.dev files");

dotenv.config({ path: [path.join(__dirname, ".env"), path.join(__dirname, ".env.dev")] });

if (!Is.stringValue(process.env.TEST_MNEMONIC)) {
	// eslint-disable-next-line no-restricted-syntax
	throw new Error(
		`Please define TEST_MNEMONIC as a 24 word mnemonic either as an environment variable or inside an .env.dev file
		 e.g. TEST_MNEMONIC="word0 word1 ... word23"
		 You can generate one using the following command
		 npx "@twin.org/crypto-cli" mnemonic --env ./tests/.env.dev --env-prefix TEST_`
	);
}

initSchemaVault();
initSchemaIdentity();
initSchemaWallet();

EntityStorageConnectorFactory.register(
	"vault-key",
	() =>
		new MemoryEntityStorageConnector<VaultKey>({
			entitySchema: nameof<VaultKey>()
		})
);
const secretEntityStorage = new MemoryEntityStorageConnector<VaultSecret>({
	entitySchema: nameof<VaultSecret>()
});
EntityStorageConnectorFactory.register("vault-secret", () => secretEntityStorage);

const identityDocumentEntityStorage = new MemoryEntityStorageConnector<IdentityDocument>({
	entitySchema: nameof<IdentityDocument>()
});
EntityStorageConnectorFactory.register("identity-document", () => identityDocumentEntityStorage);

const TEST_VAULT_CONNECTOR = new EntityStorageVaultConnector();
VaultConnectorFactory.register("vault", () => TEST_VAULT_CONNECTOR);

export const TEST_IDENTITY_CONNECTOR = new EntityStorageIdentityConnector();
IdentityConnectorFactory.register("identity", () => TEST_IDENTITY_CONNECTOR);

const walletAddressEntityStorage = new MemoryEntityStorageConnector<WalletAddress>({
	entitySchema: nameof<WalletAddress>()
});
EntityStorageConnectorFactory.register("wallet-address", () => walletAddressEntityStorage);

export const TEST_WALLET_CONNECTOR = new EntityStorageWalletConnector();
WalletConnectorFactory.register("wallet", () => TEST_WALLET_CONNECTOR);

export let TEST_NODE_IDENTITY: string;
export let TEST_USER_IDENTITY: string;
export let TEST_VAULT_KEY: string;

/**
 * Setup the test environment.
 */
export async function setupTestEnv(): Promise<void> {
	RandomHelper.generate = vi
		.fn()
		.mockImplementationOnce(length => new Uint8Array(length).fill(99))
		.mockImplementation(length => new Uint8Array(length).fill(88));
	Bip39.randomMnemonic = vi.fn().mockImplementation(() => process.env.TEST_MNEMONIC);

	const testIdentityConnector = IdentityConnectorFactory.get("identity");
	const testVaultConnector = VaultConnectorFactory.get("vault");

	const didNode = await testIdentityConnector.createDocument("test-node-identity");
	await testIdentityConnector.addVerificationMethod(
		"test-node-identity",
		didNode.id,
		"assertionMethod",
		"immutable-proof-assertion"
	);
	await testIdentityConnector.addVerificationMethod(
		"test-node-identity",
		didNode.id,
		"assertionMethod",
		"attestation-assertion"
	);
	const didUser = await testIdentityConnector.createDocument("test-node-identity");

	TEST_NODE_IDENTITY = didNode.id;
	TEST_USER_IDENTITY = didUser.id;
	TEST_VAULT_KEY = `${TEST_NODE_IDENTITY}/immutable-proof-hash`;

	await testVaultConnector.createKey(TEST_VAULT_KEY, VaultKeyType.Ed25519);
}
