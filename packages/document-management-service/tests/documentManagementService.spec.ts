// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import { NftAttestationConnector } from "@twin.org/attestation-connector-nft";
import { AttestationConnectorFactory } from "@twin.org/attestation-models";
import { AttestationService } from "@twin.org/attestation-service";
import {
	type AuditableItemGraphChangeset,
	AuditableItemGraphService,
	type AuditableItemGraphVertex,
	initSchema as initSchemaAuditableItemGraph
} from "@twin.org/auditable-item-graph-service";
import {
	type BackgroundTask,
	EntityStorageBackgroundTaskConnector,
	initSchema as initSchemaBackgroundTask
} from "@twin.org/background-task-connector-entity-storage";
import { BackgroundTaskConnectorFactory } from "@twin.org/background-task-models";
import { MemoryBlobStorageConnector } from "@twin.org/blob-storage-connector-memory";
import { BlobStorageConnectorFactory } from "@twin.org/blob-storage-models";
import {
	BlobStorageService,
	initSchema as initSchemaBlobStorage,
	type BlobStorageEntry
} from "@twin.org/blob-storage-service";
import { ComponentFactory, Converter } from "@twin.org/core";
import { MemoryEntityStorageConnector } from "@twin.org/entity-storage-connector-memory";
import { EntityStorageConnectorFactory } from "@twin.org/entity-storage-models";
import {
	type ImmutableProof,
	ImmutableProofService,
	initSchema as initSchemaImmutableProof
} from "@twin.org/immutable-proof-service";
import {
	EntityStorageImmutableStorageConnector,
	type ImmutableItem,
	initSchema as initSchemaImmutableStorage
} from "@twin.org/immutable-storage-connector-entity-storage";
import { ImmutableStorageConnectorFactory } from "@twin.org/immutable-storage-models";
import { ModuleHelper } from "@twin.org/modules";
import {
	EntityStorageNftConnector,
	initSchema as initSchemaNft,
	type Nft
} from "@twin.org/nft-connector-entity-storage";
import { NftConnectorFactory } from "@twin.org/nft-models";
import { UneceDocumentCodes } from "@twin.org/standards-unece";
import { setupTestEnv, TEST_NODE_IDENTITY, TEST_USER_IDENTITY } from "./setupTestEnv";
import { DocumentManagementService } from "../src/documentManagementService";

let immutableItemEntityStorage: MemoryEntityStorageConnector<ImmutableItem>;
let immutableStorageConnector: EntityStorageImmutableStorageConnector;
let immutableProofEntityStorage: MemoryEntityStorageConnector<ImmutableProof>;
let immutableProofComponent: ImmutableProofService;
let nftEntityStorage: MemoryEntityStorageConnector<Nft>;
let nftConnector: EntityStorageNftConnector;
let backgroundTaskStorage: MemoryEntityStorageConnector<BackgroundTask>;
let backgroundTaskConnector: EntityStorageBackgroundTaskConnector;
let blobEntryEntityStorage: MemoryEntityStorageConnector<BlobStorageEntry>;
let blobStorageConnector: MemoryBlobStorageConnector;
let blobStorageComponent: BlobStorageService;
let attestationComponent: AttestationService;
let attestationConnector: NftAttestationConnector;
let auditableItemGraphComponent: AuditableItemGraphService;
let vertexEntityStorage: MemoryEntityStorageConnector<AuditableItemGraphVertex>;
let changesetEntityStorage: MemoryEntityStorageConnector<AuditableItemGraphChangeset>;

describe("document-management-service", async () => {
	beforeAll(async () => {
		await setupTestEnv();
	});

	beforeEach(async () => {
		initSchemaImmutableStorage();
		initSchemaImmutableProof();
		initSchemaBackgroundTask();
		initSchemaAuditableItemGraph();
		initSchemaNft();
		initSchemaBlobStorage();

		immutableItemEntityStorage = new MemoryEntityStorageConnector({
			entitySchema: "ImmutableItem"
		});
		EntityStorageConnectorFactory.register("immutable-item", () => immutableItemEntityStorage);

		immutableStorageConnector = new EntityStorageImmutableStorageConnector();
		ImmutableStorageConnectorFactory.register("immutable-storage", () => immutableStorageConnector);

		backgroundTaskStorage = new MemoryEntityStorageConnector<BackgroundTask>({
			entitySchema: "BackgroundTask"
		});
		EntityStorageConnectorFactory.register("background-task", () => backgroundTaskStorage);

		backgroundTaskConnector = new EntityStorageBackgroundTaskConnector();
		BackgroundTaskConnectorFactory.register("background-task", () => backgroundTaskConnector);
		await backgroundTaskConnector.start(TEST_NODE_IDENTITY);

		immutableProofEntityStorage = new MemoryEntityStorageConnector({
			entitySchema: "ImmutableProof"
		});
		EntityStorageConnectorFactory.register("immutable-proof", () => immutableProofEntityStorage);

		immutableProofComponent = new ImmutableProofService();
		ComponentFactory.register("immutable-proof", () => immutableProofComponent);

		vertexEntityStorage = new MemoryEntityStorageConnector<AuditableItemGraphVertex>({
			entitySchema: "AuditableItemGraphVertex"
		});
		EntityStorageConnectorFactory.register(
			"auditable-item-graph-vertex",
			() => vertexEntityStorage
		);

		changesetEntityStorage = new MemoryEntityStorageConnector<AuditableItemGraphChangeset>({
			entitySchema: "AuditableItemGraphChangeset"
		});

		EntityStorageConnectorFactory.register(
			"auditable-item-graph-changeset",
			() => changesetEntityStorage
		);

		auditableItemGraphComponent = new AuditableItemGraphService();
		ComponentFactory.register("auditable-item-graph", () => auditableItemGraphComponent);

		blobEntryEntityStorage = new MemoryEntityStorageConnector<BlobStorageEntry>({
			entitySchema: "BlobStorageEntry"
		});
		EntityStorageConnectorFactory.register("blob-storage-entry", () => blobEntryEntityStorage);

		blobStorageConnector = new MemoryBlobStorageConnector();
		BlobStorageConnectorFactory.register("memory", () => blobStorageConnector);

		blobStorageComponent = new BlobStorageService();
		ComponentFactory.register("blob-storage", () => blobStorageComponent);

		nftEntityStorage = new MemoryEntityStorageConnector<Nft>({
			entitySchema: "Nft"
		});
		EntityStorageConnectorFactory.register("nft", () => nftEntityStorage);

		nftConnector = new EntityStorageNftConnector();
		NftConnectorFactory.register("nft", () => nftConnector);

		attestationConnector = new NftAttestationConnector();
		AttestationConnectorFactory.register("nft", () => attestationConnector);

		attestationComponent = new AttestationService();
		ComponentFactory.register("attestation", () => attestationComponent);

		// Mock the module helper to execute the method in the same thread, so we don't have to create an engine
		// and the background tasks will run in this thread
		ModuleHelper.execModuleMethodThread = vi
			.fn()
			.mockImplementation(async (module, method, args) =>
				ModuleHelper.execModuleMethod(module, method, args)
			);

		// Mock Date.now so that timestamps always return the same value
		const BASE_TICK = 1724300000000;
		Date.now = vi.fn().mockImplementation(() => BASE_TICK);
	});

	test("can create the service", async () => {
		const service = new DocumentManagementService();
		expect(service).toBeDefined();
	});

	test("can add a document to an AIG", async () => {
		const aigId = await auditableItemGraphComponent.create(
			{},
			TEST_USER_IDENTITY,
			TEST_NODE_IDENTITY
		);

		const service = new DocumentManagementService();
		const documentId = await service.set(
			aigId,
			"test-doc-id-1",
			undefined,
			UneceDocumentCodes.BillOfLading,
			Converter.utf8ToBytes("Hello World"),
			{ "@context": "https://schema.org", type: "DigitalDocument", name: "bill-of-lading" },
			true,
			TEST_USER_IDENTITY,
			TEST_NODE_IDENTITY
		);
		expect(documentId).toEqual(
			"aig:5858585858585858585858585858585858585858585858585858585858585858:705:test-doc-id-1:0"
		);

		const nftStore = nftEntityStorage.getStore();
		expect(nftStore).toEqual([
			{
				id: "5858585858585858585858585858585858585858585858585858585858585858",
				immutableMetadata: {
					proof:
						"eyJraWQiOiJkaWQ6ZW50aXR5LXN0b3JhZ2U6MHg2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzI2F0dGVzdGF0aW9uLWFzc2VydGlvbiIsInR5cCI6IkpXVCIsImFsZyI6IkVkRFNBIn0.eyJpc3MiOiJkaWQ6ZW50aXR5LXN0b3JhZ2U6MHg2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzIiwibmJmIjoxNzI0MzAwMDAwLCJzdWIiOiJ0ZXN0LWRvYy1pZC0xIiwidmMiOnsiQGNvbnRleHQiOlsiaHR0cHM6Ly93d3cudzMub3JnL25zL2NyZWRlbnRpYWxzL3YyIiwiaHR0cHM6Ly9zY2hlbWEudHdpbmRldi5vcmcvZG9jdW1lbnRzLyIsImh0dHBzOi8vc2NoZW1hLnR3aW5kZXYub3JnL2NvbW1vbi8iLCJodHRwczovL3NjaGVtYS5vcmciXSwidHlwZSI6WyJWZXJpZmlhYmxlQ3JlZGVudGlhbCIsIkRvY3VtZW50Il0sImNyZWRlbnRpYWxTdWJqZWN0Ijp7ImRvY3VtZW50Q29kZSI6InVuZWNlOkRvY3VtZW50Q29kZUxpc3QjNzA1IiwiZG9jdW1lbnRSZXZpc2lvbiI6MCwiYmxvYlN0b3JhZ2VJZCI6ImJsb2I6bWVtb3J5OmE1OTFhNmQ0MGJmNDIwNDA0YTAxMTczM2NmYjdiMTkwZDYyYzY1YmYwYmNkYTMyYjU3YjI3N2Q5YWQ5ZjE0NmUiLCJibG9iSGFzaCI6InNoYTI1NjpwWkdtMUF2MElFQktBUmN6ejdleGtOWXNaYjhMemFNclY3SjMyYTJmRkc0PSIsImRhdGVDcmVhdGVkIjoiMjAyNC0wOC0yMlQwNDoxMzoyMC4wMDBaIiwibm9kZUlkZW50aXR5IjoiZGlkOmVudGl0eS1zdG9yYWdlOjB4NjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MyJ9fX0.M4xdj5rsH_bxOs5qcAeoUwbD_jztT3o9VnYveBK7TEUiZn9iSt3RJ_ZpWt7bzI8yUInxqabLMXUtK6vXOllSDA",
					version: "1"
				},
				issuer:
					"did:entity-storage:0x5858585858585858585858585858585858585858585858585858585858585858",
				metadata: {},
				owner:
					"did:entity-storage:0x5858585858585858585858585858585858585858585858585858585858585858",
				tag: "TWIN-ATTESTATION"
			}
		]);

		const blobStore = blobEntryEntityStorage.getStore();
		expect(blobStore).toEqual([
			{
				blobSize: 11,
				blobHash: "sha256:pZGm1Av0IEBKARczz7exkNYsZb8LzaMrV7J32a2fFG4=",
				dateCreated: "2024-08-22T04:13:20.000Z",
				encodingFormat: "text/plain",
				fileExtension: "txt",
				id: "blob:memory:a591a6d40bf420404a011733cfb7b190d62c65bf0bcda32b57b277d9ad9f146e",
				nodeIdentity:
					"did:entity-storage:0x6363636363636363636363636363636363636363636363636363636363636363",
				userIdentity:
					"did:entity-storage:0x5858585858585858585858585858585858585858585858585858585858585858"
			}
		]);
	});

	test("can get a document from an AIG", async () => {
		const aigId = await auditableItemGraphComponent.create(
			{},
			TEST_USER_IDENTITY,
			TEST_NODE_IDENTITY
		);

		const service = new DocumentManagementService();
		const documentId = await service.set(
			aigId,
			"test-doc-id-1",
			undefined,
			UneceDocumentCodes.BillOfLading,
			Converter.utf8ToBytes("Hello World"),
			{ "@context": "https://schema.org", type: "DigitalDocument", name: "bill-of-lading" },
			true,
			TEST_USER_IDENTITY,
			TEST_NODE_IDENTITY
		);
		expect(documentId).toEqual(
			"aig:5858585858585858585858585858585858585858585858585858585858585858:705:test-doc-id-1:0"
		);

		const doc = await service.get(
			documentId,
			undefined,
			undefined,
			TEST_USER_IDENTITY,
			TEST_NODE_IDENTITY
		);
		expect(doc).toEqual({
			"@context": [
				"https://schema.twindev.org/documents/",
				"https://schema.twindev.org/common/",
				"https://schema.org"
			],
			type: "DocumentList",
			documents: [
				{
					id: "test-doc-id-1",
					type: "Document",
					annotationObject: {
						type: "DigitalDocument",
						name: "bill-of-lading"
					},
					attestationId:
						"attestation:nft:bmZ0OmVudGl0eS1zdG9yYWdlOjU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg=",
					blobHash: "sha256:pZGm1Av0IEBKARczz7exkNYsZb8LzaMrV7J32a2fFG4=",
					blobStorageId:
						"blob:memory:a591a6d40bf420404a011733cfb7b190d62c65bf0bcda32b57b277d9ad9f146e",
					documentCode: "unece:DocumentCodeList#705",
					documentRevision: 0,
					dateCreated: "2024-08-22T04:13:20.000Z",
					nodeIdentity:
						"did:entity-storage:0x6363636363636363636363636363636363636363636363636363636363636363"
				}
			]
		});
	});

	test("can get a document from an AIG with blob metadata", async () => {
		const aigId = await auditableItemGraphComponent.create(
			{},
			TEST_USER_IDENTITY,
			TEST_NODE_IDENTITY
		);

		const service = new DocumentManagementService();
		const documentId = await service.set(
			aigId,
			"test-doc-id-1",
			undefined,
			UneceDocumentCodes.BillOfLading,
			Converter.utf8ToBytes("Hello World"),
			{ "@context": "https://schema.org", type: "DigitalDocument", name: "bill-of-lading" },
			true,
			TEST_USER_IDENTITY,
			TEST_NODE_IDENTITY
		);
		expect(documentId).toEqual(
			"aig:5858585858585858585858585858585858585858585858585858585858585858:705:test-doc-id-1:0"
		);

		const doc = await service.get(
			documentId,
			{ includeBlobStorageMetadata: true },
			undefined,
			TEST_USER_IDENTITY,
			TEST_NODE_IDENTITY
		);
		expect(doc).toEqual({
			"@context": [
				"https://schema.twindev.org/documents/",
				"https://schema.twindev.org/common/",
				"https://schema.org",
				"https://schema.twindev.org/blob-storage/"
			],
			type: "DocumentList",
			documents: [
				{
					id: "test-doc-id-1",
					type: "Document",
					annotationObject: {
						type: "DigitalDocument",
						name: "bill-of-lading"
					},
					attestationId:
						"attestation:nft:bmZ0OmVudGl0eS1zdG9yYWdlOjU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg=",
					blobHash: "sha256:pZGm1Av0IEBKARczz7exkNYsZb8LzaMrV7J32a2fFG4=",
					blobStorageId:
						"blob:memory:a591a6d40bf420404a011733cfb7b190d62c65bf0bcda32b57b277d9ad9f146e",
					documentCode: "unece:DocumentCodeList#705",
					documentRevision: 0,
					dateCreated: "2024-08-22T04:13:20.000Z",
					nodeIdentity:
						"did:entity-storage:0x6363636363636363636363636363636363636363636363636363636363636363",
					blobStorageEntry: {
						type: "BlobStorageEntry",
						id: "blob:memory:a591a6d40bf420404a011733cfb7b190d62c65bf0bcda32b57b277d9ad9f146e",
						blobSize: 11,
						blobHash: "sha256:pZGm1Av0IEBKARczz7exkNYsZb8LzaMrV7J32a2fFG4=",
						dateCreated: "2024-08-22T04:13:20.000Z",
						encodingFormat: "text/plain",
						fileExtension: "txt"
					}
				}
			]
		});
	});

	test("can get a document from an AIG with blob metadata and content", async () => {
		const aigId = await auditableItemGraphComponent.create(
			{},
			TEST_USER_IDENTITY,
			TEST_NODE_IDENTITY
		);

		const service = new DocumentManagementService();
		const documentId = await service.set(
			aigId,
			"test-doc-id-1",
			undefined,
			UneceDocumentCodes.BillOfLading,
			Converter.utf8ToBytes("Hello World"),
			{ "@context": "https://schema.org", type: "DigitalDocument", name: "bill-of-lading" },
			true,
			TEST_USER_IDENTITY,
			TEST_NODE_IDENTITY
		);
		expect(documentId).toEqual(
			"aig:5858585858585858585858585858585858585858585858585858585858585858:705:test-doc-id-1:0"
		);

		const doc = await service.get(
			documentId,
			{ includeBlobStorageMetadata: true, includeBlobStorageData: true },
			undefined,
			TEST_USER_IDENTITY,
			TEST_NODE_IDENTITY
		);
		expect(doc).toEqual({
			"@context": [
				"https://schema.twindev.org/documents/",
				"https://schema.twindev.org/common/",
				"https://schema.org",
				"https://schema.twindev.org/blob-storage/"
			],
			type: "DocumentList",
			documents: [
				{
					id: "test-doc-id-1",
					type: "Document",
					annotationObject: {
						type: "DigitalDocument",
						name: "bill-of-lading"
					},
					attestationId:
						"attestation:nft:bmZ0OmVudGl0eS1zdG9yYWdlOjU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg=",
					blobHash: "sha256:pZGm1Av0IEBKARczz7exkNYsZb8LzaMrV7J32a2fFG4=",
					blobStorageId:
						"blob:memory:a591a6d40bf420404a011733cfb7b190d62c65bf0bcda32b57b277d9ad9f146e",
					documentCode: "unece:DocumentCodeList#705",
					documentRevision: 0,
					dateCreated: "2024-08-22T04:13:20.000Z",
					nodeIdentity:
						"did:entity-storage:0x6363636363636363636363636363636363636363636363636363636363636363",
					blobStorageEntry: {
						type: "BlobStorageEntry",
						id: "blob:memory:a591a6d40bf420404a011733cfb7b190d62c65bf0bcda32b57b277d9ad9f146e",
						blobSize: 11,
						blobHash: "sha256:pZGm1Av0IEBKARczz7exkNYsZb8LzaMrV7J32a2fFG4=",
						dateCreated: "2024-08-22T04:13:20.000Z",
						encodingFormat: "text/plain",
						fileExtension: "txt",
						blob: "SGVsbG8gV29ybGQ="
					}
				}
			]
		});
	});

	test("can get a document from an AIG with blob metadata, content and attestation", async () => {
		const aigId = await auditableItemGraphComponent.create(
			{},
			TEST_USER_IDENTITY,
			TEST_NODE_IDENTITY
		);

		const service = new DocumentManagementService();
		const documentId = await service.set(
			aigId,
			"test-doc-id-1",
			undefined,
			UneceDocumentCodes.BillOfLading,
			Converter.utf8ToBytes("Hello World"),
			{ "@context": "https://schema.org", type: "DigitalDocument", name: "bill-of-lading" },
			true,
			TEST_USER_IDENTITY,
			TEST_NODE_IDENTITY
		);
		expect(documentId).toEqual(
			"aig:5858585858585858585858585858585858585858585858585858585858585858:705:test-doc-id-1:0"
		);

		const doc = await service.get(
			documentId,
			{ includeBlobStorageMetadata: true, includeBlobStorageData: true, includeAttestation: true },
			undefined,
			TEST_USER_IDENTITY,
			TEST_NODE_IDENTITY
		);
		expect(doc).toEqual({
			"@context": [
				"https://schema.twindev.org/documents/",
				"https://schema.twindev.org/common/",
				"https://schema.org",
				"https://schema.twindev.org/blob-storage/",
				"https://schema.twindev.org/attestation/"
			],
			type: "DocumentList",
			documents: [
				{
					id: "test-doc-id-1",
					type: "Document",
					annotationObject: {
						type: "DigitalDocument",
						name: "bill-of-lading"
					},
					attestationId:
						"attestation:nft:bmZ0OmVudGl0eS1zdG9yYWdlOjU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg=",
					blobHash: "sha256:pZGm1Av0IEBKARczz7exkNYsZb8LzaMrV7J32a2fFG4=",
					blobStorageId:
						"blob:memory:a591a6d40bf420404a011733cfb7b190d62c65bf0bcda32b57b277d9ad9f146e",
					documentCode: "unece:DocumentCodeList#705",
					documentRevision: 0,
					dateCreated: "2024-08-22T04:13:20.000Z",
					nodeIdentity:
						"did:entity-storage:0x6363636363636363636363636363636363636363636363636363636363636363",
					blobStorageEntry: {
						type: "BlobStorageEntry",
						id: "blob:memory:a591a6d40bf420404a011733cfb7b190d62c65bf0bcda32b57b277d9ad9f146e",
						blobSize: 11,
						blobHash: "sha256:pZGm1Av0IEBKARczz7exkNYsZb8LzaMrV7J32a2fFG4=",
						dateCreated: "2024-08-22T04:13:20.000Z",
						encodingFormat: "text/plain",
						fileExtension: "txt",
						blob: "SGVsbG8gV29ybGQ="
					},
					attestationInformation: {
						type: "Information",
						attestationObject: {
							type: "Document",
							blobHash: "sha256:pZGm1Av0IEBKARczz7exkNYsZb8LzaMrV7J32a2fFG4=",
							blobStorageId:
								"blob:memory:a591a6d40bf420404a011733cfb7b190d62c65bf0bcda32b57b277d9ad9f146e",
							dateCreated: "2024-08-22T04:13:20.000Z",
							documentCode: "unece:DocumentCodeList#705",
							documentRevision: 0,
							id: "test-doc-id-1",
							nodeIdentity:
								"did:entity-storage:0x6363636363636363636363636363636363636363636363636363636363636363"
						},
						dateCreated: "2024-08-22T04:13:20.000Z",
						holderIdentity:
							"did:entity-storage:0x6363636363636363636363636363636363636363636363636363636363636363",
						id: "attestation:nft:bmZ0OmVudGl0eS1zdG9yYWdlOjU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg=",
						ownerIdentity:
							"did:entity-storage:0x6363636363636363636363636363636363636363636363636363636363636363",
						proof: {
							type: "JwtProof",
							value:
								"eyJraWQiOiJkaWQ6ZW50aXR5LXN0b3JhZ2U6MHg2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzI2F0dGVzdGF0aW9uLWFzc2VydGlvbiIsInR5cCI6IkpXVCIsImFsZyI6IkVkRFNBIn0.eyJpc3MiOiJkaWQ6ZW50aXR5LXN0b3JhZ2U6MHg2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzIiwibmJmIjoxNzI0MzAwMDAwLCJzdWIiOiJ0ZXN0LWRvYy1pZC0xIiwidmMiOnsiQGNvbnRleHQiOlsiaHR0cHM6Ly93d3cudzMub3JnL25zL2NyZWRlbnRpYWxzL3YyIiwiaHR0cHM6Ly9zY2hlbWEudHdpbmRldi5vcmcvZG9jdW1lbnRzLyIsImh0dHBzOi8vc2NoZW1hLnR3aW5kZXYub3JnL2NvbW1vbi8iLCJodHRwczovL3NjaGVtYS5vcmciXSwidHlwZSI6WyJWZXJpZmlhYmxlQ3JlZGVudGlhbCIsIkRvY3VtZW50Il0sImNyZWRlbnRpYWxTdWJqZWN0Ijp7ImRvY3VtZW50Q29kZSI6InVuZWNlOkRvY3VtZW50Q29kZUxpc3QjNzA1IiwiZG9jdW1lbnRSZXZpc2lvbiI6MCwiYmxvYlN0b3JhZ2VJZCI6ImJsb2I6bWVtb3J5OmE1OTFhNmQ0MGJmNDIwNDA0YTAxMTczM2NmYjdiMTkwZDYyYzY1YmYwYmNkYTMyYjU3YjI3N2Q5YWQ5ZjE0NmUiLCJibG9iSGFzaCI6InNoYTI1NjpwWkdtMUF2MElFQktBUmN6ejdleGtOWXNaYjhMemFNclY3SjMyYTJmRkc0PSIsImRhdGVDcmVhdGVkIjoiMjAyNC0wOC0yMlQwNDoxMzoyMC4wMDBaIiwibm9kZUlkZW50aXR5IjoiZGlkOmVudGl0eS1zdG9yYWdlOjB4NjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MyJ9fX0.M4xdj5rsH_bxOs5qcAeoUwbD_jztT3o9VnYveBK7TEUiZn9iSt3RJ_ZpWt7bzI8yUInxqabLMXUtK6vXOllSDA"
						},
						verified: true
					}
				}
			]
		});
	});
});
