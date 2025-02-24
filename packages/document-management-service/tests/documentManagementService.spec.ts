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
			"test-doc-id:aaa",
			undefined,
			UneceDocumentCodes.BillOfLading,
			Converter.utf8ToBytes("Hello World"),
			{ "@context": "https://schema.org", type: "DigitalDocument", name: "bill-of-lading" },
			true,
			TEST_USER_IDENTITY,
			TEST_NODE_IDENTITY
		);
		expect(documentId).toEqual("documents:705:test-doc-id:aaa:rev-0");

		const nftStore = nftEntityStorage.getStore();
		expect(nftStore).toEqual([
			{
				id: "5858585858585858585858585858585858585858585858585858585858585858",
				immutableMetadata: {
					proof:
						"eyJraWQiOiJkaWQ6ZW50aXR5LXN0b3JhZ2U6MHg2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzI2F0dGVzdGF0aW9uLWFzc2VydGlvbiIsInR5cCI6IkpXVCIsImFsZyI6IkVkRFNBIn0.eyJpc3MiOiJkaWQ6ZW50aXR5LXN0b3JhZ2U6MHg2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzIiwibmJmIjoxNzI0MzAwMDAwLCJzdWIiOiJkb2N1bWVudHM6NzA1OnRlc3QtZG9jLWlkOmFhYTpyZXYtMCIsInZjIjp7IkBjb250ZXh0IjpbImh0dHBzOi8vd3d3LnczLm9yZy9ucy9jcmVkZW50aWFscy92MiIsImh0dHBzOi8vc2NoZW1hLnR3aW5kZXYub3JnL2RvY3VtZW50cy8iLCJodHRwczovL3NjaGVtYS50d2luZGV2Lm9yZy9jb21tb24vIiwiaHR0cHM6Ly9zY2hlbWEub3JnIl0sInR5cGUiOlsiVmVyaWZpYWJsZUNyZWRlbnRpYWwiLCJEb2N1bWVudCJdLCJjcmVkZW50aWFsU3ViamVjdCI6eyJkb2N1bWVudElkIjoidGVzdC1kb2MtaWQ6YWFhIiwiZG9jdW1lbnRDb2RlIjoidW5lY2U6RG9jdW1lbnRDb2RlTGlzdCM3MDUiLCJkb2N1bWVudFJldmlzaW9uIjowLCJibG9iU3RvcmFnZUlkIjoiYmxvYjptZW1vcnk6YTU5MWE2ZDQwYmY0MjA0MDRhMDExNzMzY2ZiN2IxOTBkNjJjNjViZjBiY2RhMzJiNTdiMjc3ZDlhZDlmMTQ2ZSIsImJsb2JIYXNoIjoic2hhMjU2OnBaR20xQXYwSUVCS0FSY3p6N2V4a05Zc1piOEx6YU1yVjdKMzJhMmZGRzQ9IiwiZGF0ZUNyZWF0ZWQiOiIyMDI0LTA4LTIyVDA0OjEzOjIwLjAwMFoiLCJub2RlSWRlbnRpdHkiOiJkaWQ6ZW50aXR5LXN0b3JhZ2U6MHg2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzIn19fQ.p5phii2IZMjkRCl3FNYbUyqAyPP79EjQ4bpKJ0BlvqIyyn2aXZEeQXQyzHU-quh8EfFG_BJtrHSKKYkMkk4XCw",
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

	test("can update a documents annotation object without creating a new revision", async () => {
		const aigId = await auditableItemGraphComponent.create(
			{},
			TEST_USER_IDENTITY,
			TEST_NODE_IDENTITY
		);

		const service = new DocumentManagementService();
		const documentId = await service.set(
			aigId,
			"test-doc-id:aaa",
			undefined,
			UneceDocumentCodes.BillOfLading,
			Converter.utf8ToBytes("Hello World"),
			{ "@context": "https://schema.org", type: "DigitalDocument", name: "bill-of-lading" },
			true,
			TEST_USER_IDENTITY,
			TEST_NODE_IDENTITY
		);

		const doc = await service.get(aigId, documentId, { maxRevisionCount: 100 });
		expect(doc.annotationObject?.name).toEqual("bill-of-lading");
		expect(doc.revisions).toBeUndefined();

		await service.set(
			aigId,
			"test-doc-id:aaa",
			undefined,
			UneceDocumentCodes.BillOfLading,
			Converter.utf8ToBytes("Hello World"),
			{ "@context": "https://schema.org", type: "DigitalDocument", name: "bill-of-lading-2" },
			true,
			TEST_USER_IDENTITY,
			TEST_NODE_IDENTITY
		);

		const doc2 = await service.get(aigId, documentId, { maxRevisionCount: 100 });
		expect(doc2.annotationObject?.name).toEqual("bill-of-lading-2");
		expect(doc2.revisions).toBeUndefined();
	});

	test("can update a documents blob data and create a new revision", async () => {
		const aigId = await auditableItemGraphComponent.create(
			{},
			TEST_USER_IDENTITY,
			TEST_NODE_IDENTITY
		);

		const service = new DocumentManagementService();
		const documentId = await service.set(
			aigId,
			"test-doc-id:aaa",
			undefined,
			UneceDocumentCodes.BillOfLading,
			Converter.utf8ToBytes("Hello World"),
			{ "@context": "https://schema.org", type: "DigitalDocument", name: "bill-of-lading" },
			true,
			TEST_USER_IDENTITY,
			TEST_NODE_IDENTITY
		);

		const doc = await service.get(aigId, documentId, { maxRevisionCount: 100 });
		expect(doc.annotationObject?.name).toEqual("bill-of-lading");
		expect(doc.revisions).toBeUndefined();

		await service.set(
			aigId,
			"test-doc-id:aaa",
			undefined,
			UneceDocumentCodes.BillOfLading,
			Converter.utf8ToBytes("Hello World2"),
			{ "@context": "https://schema.org", type: "DigitalDocument", name: "bill-of-lading" },
			true,
			TEST_USER_IDENTITY,
			TEST_NODE_IDENTITY
		);

		const doc2 = await service.get(aigId, documentId, { maxRevisionCount: 100 });
		expect(doc2.revisions?.length).toEqual(1);
	});

	test("can fail to set an object when the AIG does not exist", async () => {
		const service = new DocumentManagementService();
		await expect(
			service.set(
				"aig:000000",
				"test-doc-id:aaa",
				undefined,
				UneceDocumentCodes.BillOfLading,
				Converter.utf8ToBytes("Hello World"),
				{ "@context": "https://schema.org", type: "DigitalDocument", name: "bill-of-lading" },
				true,
				TEST_USER_IDENTITY,
				TEST_NODE_IDENTITY
			)
		).rejects.toMatchObject({
			name: "GeneralError",
			message: "auditableItemGraphService.getFailed",
			inner: {
				name: "NotFoundError",
				message: "auditableItemGraphService.vertexNotFound"
			}
		});
	});

	test("can fail to set an object when a sub component throws", async () => {
		const aigId = await auditableItemGraphComponent.create(
			{},
			TEST_USER_IDENTITY,
			TEST_NODE_IDENTITY
		);

		// eslint-disable-next-line no-restricted-syntax
		blobStorageConnector.set = vi.fn().mockRejectedValue(new Error("blobStorageService.setFailed"));

		const service = new DocumentManagementService();
		await expect(
			service.set(
				aigId,
				"test-doc-id:aaa",
				undefined,
				UneceDocumentCodes.BillOfLading,
				Converter.utf8ToBytes("Hello World"),
				{ "@context": "https://schema.org", type: "DigitalDocument", name: "bill-of-lading" },
				true,
				TEST_USER_IDENTITY,
				TEST_NODE_IDENTITY
			)
		).rejects.toMatchObject({
			name: "GeneralError",
			message: "documentManagementService.setFailed",
			inner: {
				name: "GeneralError",
				message: "blobStorageService.createFailed",
				inner: {
					name: "Error",
					message: "blobStorageService.setFailed"
				}
			}
		});
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
			"test-doc-id:aaa",
			undefined,
			UneceDocumentCodes.BillOfLading,
			Converter.utf8ToBytes("Hello World"),
			{ "@context": "https://schema.org", type: "DigitalDocument", name: "bill-of-lading" },
			true,
			TEST_USER_IDENTITY,
			TEST_NODE_IDENTITY
		);
		expect(documentId).toEqual("documents:705:test-doc-id:aaa:rev-0");

		const doc = await service.get(
			aigId,
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
			id: "documents:705:test-doc-id:aaa:rev-0",
			documentId: "test-doc-id:aaa",
			type: "Document",
			annotationObject: {
				"@context": "https://schema.org",
				type: "DigitalDocument",
				name: "bill-of-lading"
			},
			attestationId:
				"attestation:nft:bmZ0OmVudGl0eS1zdG9yYWdlOjU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg=",
			blobHash: "sha256:pZGm1Av0IEBKARczz7exkNYsZb8LzaMrV7J32a2fFG4=",
			blobStorageId: "blob:memory:a591a6d40bf420404a011733cfb7b190d62c65bf0bcda32b57b277d9ad9f146e",
			documentCode: "unece:DocumentCodeList#705",
			documentRevision: 0,
			dateCreated: "2024-08-22T04:13:20.000Z",
			nodeIdentity:
				"did:entity-storage:0x6363636363636363636363636363636363636363636363636363636363636363"
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
			"test-doc-id:aaa",
			undefined,
			UneceDocumentCodes.BillOfLading,
			Converter.utf8ToBytes("Hello World"),
			{ "@context": "https://schema.org", type: "DigitalDocument", name: "bill-of-lading" },
			true,
			TEST_USER_IDENTITY,
			TEST_NODE_IDENTITY
		);
		expect(documentId).toEqual("documents:705:test-doc-id:aaa:rev-0");

		const doc = await service.get(
			aigId,
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
			id: "documents:705:test-doc-id:aaa:rev-0",
			documentId: "test-doc-id:aaa",
			type: "Document",
			annotationObject: {
				"@context": "https://schema.org",
				type: "DigitalDocument",
				name: "bill-of-lading"
			},
			attestationId:
				"attestation:nft:bmZ0OmVudGl0eS1zdG9yYWdlOjU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg=",
			blobHash: "sha256:pZGm1Av0IEBKARczz7exkNYsZb8LzaMrV7J32a2fFG4=",
			blobStorageId: "blob:memory:a591a6d40bf420404a011733cfb7b190d62c65bf0bcda32b57b277d9ad9f146e",
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
			"test-doc-id:aaa",
			undefined,
			UneceDocumentCodes.BillOfLading,
			Converter.utf8ToBytes("Hello World"),
			{ "@context": "https://schema.org", type: "DigitalDocument", name: "bill-of-lading" },
			true,
			TEST_USER_IDENTITY,
			TEST_NODE_IDENTITY
		);
		expect(documentId).toEqual("documents:705:test-doc-id:aaa:rev-0");

		const doc = await service.get(
			aigId,
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
			id: "documents:705:test-doc-id:aaa:rev-0",
			documentId: "test-doc-id:aaa",
			type: "Document",
			annotationObject: {
				"@context": "https://schema.org",
				type: "DigitalDocument",
				name: "bill-of-lading"
			},
			attestationId:
				"attestation:nft:bmZ0OmVudGl0eS1zdG9yYWdlOjU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg=",
			blobHash: "sha256:pZGm1Av0IEBKARczz7exkNYsZb8LzaMrV7J32a2fFG4=",
			blobStorageId: "blob:memory:a591a6d40bf420404a011733cfb7b190d62c65bf0bcda32b57b277d9ad9f146e",
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
			"test-doc-id:aaa",
			undefined,
			UneceDocumentCodes.BillOfLading,
			Converter.utf8ToBytes("Hello World"),
			{ "@context": "https://schema.org", type: "DigitalDocument", name: "bill-of-lading" },
			true,
			TEST_USER_IDENTITY,
			TEST_NODE_IDENTITY
		);
		expect(documentId).toEqual("documents:705:test-doc-id:aaa:rev-0");

		const doc = await service.get(
			aigId,
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
			id: "documents:705:test-doc-id:aaa:rev-0",
			documentId: "test-doc-id:aaa",
			type: "Document",
			annotationObject: {
				"@context": "https://schema.org",
				type: "DigitalDocument",
				name: "bill-of-lading"
			},
			attestationId:
				"attestation:nft:bmZ0OmVudGl0eS1zdG9yYWdlOjU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg=",
			blobHash: "sha256:pZGm1Av0IEBKARczz7exkNYsZb8LzaMrV7J32a2fFG4=",
			blobStorageId: "blob:memory:a591a6d40bf420404a011733cfb7b190d62c65bf0bcda32b57b277d9ad9f146e",
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
					id: "documents:705:test-doc-id:aaa:rev-0",
					documentId: "test-doc-id:aaa",
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
						"eyJraWQiOiJkaWQ6ZW50aXR5LXN0b3JhZ2U6MHg2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzI2F0dGVzdGF0aW9uLWFzc2VydGlvbiIsInR5cCI6IkpXVCIsImFsZyI6IkVkRFNBIn0.eyJpc3MiOiJkaWQ6ZW50aXR5LXN0b3JhZ2U6MHg2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzIiwibmJmIjoxNzI0MzAwMDAwLCJzdWIiOiJkb2N1bWVudHM6NzA1OnRlc3QtZG9jLWlkOmFhYTpyZXYtMCIsInZjIjp7IkBjb250ZXh0IjpbImh0dHBzOi8vd3d3LnczLm9yZy9ucy9jcmVkZW50aWFscy92MiIsImh0dHBzOi8vc2NoZW1hLnR3aW5kZXYub3JnL2RvY3VtZW50cy8iLCJodHRwczovL3NjaGVtYS50d2luZGV2Lm9yZy9jb21tb24vIiwiaHR0cHM6Ly9zY2hlbWEub3JnIl0sInR5cGUiOlsiVmVyaWZpYWJsZUNyZWRlbnRpYWwiLCJEb2N1bWVudCJdLCJjcmVkZW50aWFsU3ViamVjdCI6eyJkb2N1bWVudElkIjoidGVzdC1kb2MtaWQ6YWFhIiwiZG9jdW1lbnRDb2RlIjoidW5lY2U6RG9jdW1lbnRDb2RlTGlzdCM3MDUiLCJkb2N1bWVudFJldmlzaW9uIjowLCJibG9iU3RvcmFnZUlkIjoiYmxvYjptZW1vcnk6YTU5MWE2ZDQwYmY0MjA0MDRhMDExNzMzY2ZiN2IxOTBkNjJjNjViZjBiY2RhMzJiNTdiMjc3ZDlhZDlmMTQ2ZSIsImJsb2JIYXNoIjoic2hhMjU2OnBaR20xQXYwSUVCS0FSY3p6N2V4a05Zc1piOEx6YU1yVjdKMzJhMmZGRzQ9IiwiZGF0ZUNyZWF0ZWQiOiIyMDI0LTA4LTIyVDA0OjEzOjIwLjAwMFoiLCJub2RlSWRlbnRpdHkiOiJkaWQ6ZW50aXR5LXN0b3JhZ2U6MHg2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzIn19fQ.p5phii2IZMjkRCl3FNYbUyqAyPP79EjQ4bpKJ0BlvqIyyn2aXZEeQXQyzHU-quh8EfFG_BJtrHSKKYkMkk4XCw"
				},
				verified: true
			}
		});
	});

	test("can get the most recent document from an AIG with multiple revisions", async () => {
		const aigId = await auditableItemGraphComponent.create(
			{},
			TEST_USER_IDENTITY,
			TEST_NODE_IDENTITY
		);

		const service = new DocumentManagementService();

		for (let i = 0; i < 5; i++) {
			const documentId = await service.set(
				aigId,
				"test-doc-id:aaa",
				undefined,
				UneceDocumentCodes.BillOfLading,
				Converter.utf8ToBytes(`Hello World${i}`),
				{ "@context": "https://schema.org", type: "DigitalDocument", name: "bill-of-lading" },
				false,
				TEST_USER_IDENTITY,
				TEST_NODE_IDENTITY
			);
			expect(documentId).toEqual(`documents:705:test-doc-id:aaa:rev-${i}`);
		}

		const doc = await service.get(
			"aig:5858585858585858585858585858585858585858585858585858585858585858",
			"documents:705:test-doc-id:aaa",
			undefined,
			undefined,
			TEST_USER_IDENTITY,
			TEST_NODE_IDENTITY
		);
		expect(doc.id).toEqual("documents:705:test-doc-id:aaa:rev-4");
		expect(doc.revisions).toBeUndefined();
	});

	test("can get a document from an AIG with multiple revisions", async () => {
		const aigId = await auditableItemGraphComponent.create(
			{},
			TEST_USER_IDENTITY,
			TEST_NODE_IDENTITY
		);

		const service = new DocumentManagementService();

		for (let i = 0; i < 5; i++) {
			const documentId = await service.set(
				aigId,
				"test-doc-id:aaa",
				undefined,
				UneceDocumentCodes.BillOfLading,
				Converter.utf8ToBytes(`Hello World${i}`),
				{ "@context": "https://schema.org", type: "DigitalDocument", name: "bill-of-lading" },
				false,
				TEST_USER_IDENTITY,
				TEST_NODE_IDENTITY
			);
			expect(documentId).toEqual(`documents:705:test-doc-id:aaa:rev-${i}`);
		}

		const doc = await service.get(
			aigId,
			"documents:705:test-doc-id:aaa",
			{ maxRevisionCount: 3 },
			undefined,
			TEST_USER_IDENTITY,
			TEST_NODE_IDENTITY
		);
		expect(doc.revisions?.length).toEqual(3);
		expect(doc.revisionCursor).toEqual("3");
		expect(doc.revisions?.[0].documentRevision).toEqual(3);
		expect(doc.revisions?.[1].documentRevision).toEqual(2);
		expect(doc.revisions?.[2].documentRevision).toEqual(1);

		const doc2 = await service.get(
			aigId,
			"documents:705:test-doc-id:aaa",
			{ maxRevisionCount: 3 },
			doc.revisionCursor,
			TEST_USER_IDENTITY,
			TEST_NODE_IDENTITY
		);
		expect(doc2.revisions?.length).toEqual(1);
		expect(doc2.revisionCursor).toBeUndefined();
		expect(doc2.revisions?.[0].documentRevision).toEqual(0);
	});

	test("can fail to get a document when revision has been deleted", async () => {
		const aigId = await auditableItemGraphComponent.create(
			{},
			TEST_USER_IDENTITY,
			TEST_NODE_IDENTITY
		);

		const service = new DocumentManagementService();

		const documentId = await service.set(
			aigId,
			"test-doc-id:aaa",
			undefined,
			UneceDocumentCodes.BillOfLading,
			Converter.utf8ToBytes("Hello World"),
			{ "@context": "https://schema.org", type: "DigitalDocument", name: "bill-of-lading" },
			false,
			TEST_USER_IDENTITY,
			TEST_NODE_IDENTITY
		);
		expect(documentId).toEqual("documents:705:test-doc-id:aaa:rev-0");

		await service.remove(
			aigId,
			"documents:705:test-doc-id:aaa:rev-0",
			undefined,
			TEST_USER_IDENTITY,
			TEST_NODE_IDENTITY
		);

		await expect(
			service.get(
				aigId,
				"documents:705:test-doc-id:aaa:rev-0",
				undefined,
				undefined,
				TEST_USER_IDENTITY,
				TEST_NODE_IDENTITY
			)
		).rejects.toMatchObject({
			name: "NotFoundError",
			message: "documentManagementService.documentRevisionNotFound"
		});

		const doc = await service.get(
			aigId,
			"documents:705:test-doc-id:aaa:rev-0",
			{ includeRemoved: true },
			undefined,
			TEST_USER_IDENTITY,
			TEST_NODE_IDENTITY
		);
		expect(doc.dateDeleted).toBeDefined();
	});

	test("can remove a specific revision document from an AIG with multiple revisions", async () => {
		const aigId = await auditableItemGraphComponent.create(
			{},
			TEST_USER_IDENTITY,
			TEST_NODE_IDENTITY
		);

		const service = new DocumentManagementService();

		for (let i = 0; i < 5; i++) {
			const documentId = await service.set(
				aigId,
				"test-doc-id:aaa",
				undefined,
				UneceDocumentCodes.BillOfLading,
				Converter.utf8ToBytes(`Hello World${i}`),
				{ "@context": "https://schema.org", type: "DigitalDocument", name: "bill-of-lading" },
				false,
				TEST_USER_IDENTITY,
				TEST_NODE_IDENTITY
			);
			expect(documentId).toEqual(`documents:705:test-doc-id:aaa:rev-${i}`);
		}

		await service.remove(
			aigId,
			"documents:705:test-doc-id:aaa:rev-2",
			undefined,
			TEST_USER_IDENTITY,
			TEST_NODE_IDENTITY
		);

		const doc = await service.get(
			aigId,
			"documents:705:test-doc-id:aaa",
			{ maxRevisionCount: 100 },
			undefined,
			TEST_USER_IDENTITY,
			TEST_NODE_IDENTITY
		);
		expect(doc.revisions?.length).toEqual(3);

		const docWithDeleted = await service.get(
			aigId,
			"documents:705:test-doc-id:aaa",
			{ includeRemoved: true, maxRevisionCount: 100 },
			undefined,
			TEST_USER_IDENTITY,
			TEST_NODE_IDENTITY
		);
		expect(docWithDeleted.revisions?.length).toEqual(4);
	});

	test("can remove all revisions of a document from an AIG with multiple revisions", async () => {
		const aigId = await auditableItemGraphComponent.create(
			{},
			TEST_USER_IDENTITY,
			TEST_NODE_IDENTITY
		);

		const service = new DocumentManagementService();

		for (let i = 0; i < 5; i++) {
			const documentId = await service.set(
				aigId,
				"test-doc-id:aaa",
				undefined,
				UneceDocumentCodes.BillOfLading,
				Converter.utf8ToBytes(`Hello World${i}`),
				{ "@context": "https://schema.org", type: "DigitalDocument", name: "bill-of-lading" },
				false,
				TEST_USER_IDENTITY,
				TEST_NODE_IDENTITY
			);
			expect(documentId).toEqual(`documents:705:test-doc-id:aaa:rev-${i}`);
		}

		await service.remove(
			aigId,
			"documents:705:test-doc-id:aaa:rev-2",
			{ removeAllRevisions: true },
			TEST_USER_IDENTITY,
			TEST_NODE_IDENTITY
		);

		await expect(
			service.get(
				aigId,
				"documents:705:test-doc-id:aaa",
				{ maxRevisionCount: 100 },
				undefined,
				TEST_USER_IDENTITY,
				TEST_NODE_IDENTITY
			)
		).rejects.toMatchObject({
			name: "NotFoundError",
			message: "documentManagementService.documentRevisionNotFound"
		});

		const doc = await service.get(
			aigId,
			"documents:705:test-doc-id:aaa",
			{ includeRemoved: true, maxRevisionCount: 100 },
			undefined,
			TEST_USER_IDENTITY,
			TEST_NODE_IDENTITY
		);
		expect(doc.revisions?.length).toEqual(4);
	});

	test("can query for documents without defining document codes", async () => {
		const aigId = await auditableItemGraphComponent.create(
			{},
			TEST_USER_IDENTITY,
			TEST_NODE_IDENTITY
		);

		const service = new DocumentManagementService();

		for (let i = 0; i < 40; i++) {
			await service.set(
				aigId,
				"test-doc-id:aaa",
				undefined,
				UneceDocumentCodes.BillOfLading,
				Converter.utf8ToBytes(`Hello World${i}`),
				{ "@context": "https://schema.org", type: "DigitalDocument", name: "bill-of-lading" },
				false,
				TEST_USER_IDENTITY,
				TEST_NODE_IDENTITY
			);
		}

		for (let i = 0; i < 40; i++) {
			await service.set(
				aigId,
				"test-cert-id:aaa",
				undefined,
				UneceDocumentCodes.Certificate,
				Converter.utf8ToBytes(`Hello World${i}`),
				{ "@context": "https://schema.org", type: "DigitalDocument", name: "cert" },
				false,
				TEST_USER_IDENTITY,
				TEST_NODE_IDENTITY
			);
		}

		const result = await service.query(
			"aig:5858585858585858585858585858585858585858585858585858585858585858",
			undefined,
			undefined,
			undefined,
			TEST_USER_IDENTITY,
			TEST_NODE_IDENTITY
		);

		expect(result.documents.length).toEqual(2);
		expect(result.documents[0]?.revisions).toBeUndefined();
		expect(result.documents[1]?.revisions).toBeUndefined();
		expect(result.cursor).toBeUndefined();
	});

	test("can query for documents defining document codes", async () => {
		const aigId = await auditableItemGraphComponent.create(
			{},
			TEST_USER_IDENTITY,
			TEST_NODE_IDENTITY
		);

		const service = new DocumentManagementService();

		for (let i = 0; i < 3; i++) {
			await service.set(
				aigId,
				"test-doc-id:aaa",
				undefined,
				UneceDocumentCodes.BillOfLading,
				Converter.utf8ToBytes(`Hello World${i}`),
				{ "@context": "https://schema.org", type: "DigitalDocument", name: "bill-of-lading" },
				false,
				TEST_USER_IDENTITY,
				TEST_NODE_IDENTITY
			);
		}

		for (let i = 0; i < 3; i++) {
			await service.set(
				aigId,
				"test-cert-id:aaa",
				undefined,
				UneceDocumentCodes.AccountingStatement,
				Converter.utf8ToBytes(`Hello World${i}`),
				{ "@context": "https://schema.org", type: "DigitalDocument", name: "statement" },
				false,
				TEST_USER_IDENTITY,
				TEST_NODE_IDENTITY
			);
		}

		for (let i = 0; i < 3; i++) {
			await service.set(
				aigId,
				"test-cert-id:aaa",
				undefined,
				UneceDocumentCodes.Certificate,
				Converter.utf8ToBytes(`Hello World${i}`),
				{ "@context": "https://schema.org", type: "DigitalDocument", name: "cert" },
				false,
				TEST_USER_IDENTITY,
				TEST_NODE_IDENTITY
			);
		}

		const result = await service.query(
			"aig:5858585858585858585858585858585858585858585858585858585858585858",
			[UneceDocumentCodes.BillOfLading, UneceDocumentCodes.Certificate],
			undefined,
			undefined,
			TEST_USER_IDENTITY,
			TEST_NODE_IDENTITY
		);

		expect(result.documents.length).toEqual(2);
		expect(result.documents[0]?.revisions).toBeUndefined();
		expect(result.documents[1]?.revisions).toBeUndefined();
		expect(result.cursor).toBeUndefined();
	});

	test("can query for documents defining document codes and include revisions", async () => {
		const aigId = await auditableItemGraphComponent.create(
			{},
			TEST_USER_IDENTITY,
			TEST_NODE_IDENTITY
		);

		const service = new DocumentManagementService();

		for (let i = 0; i < 10; i++) {
			await service.set(
				aigId,
				"test-doc-id:aaa",
				undefined,
				UneceDocumentCodes.BillOfLading,
				Converter.utf8ToBytes(`Hello World${i}`),
				{ "@context": "https://schema.org", type: "DigitalDocument", name: "bill-of-lading" },
				false,
				TEST_USER_IDENTITY,
				TEST_NODE_IDENTITY
			);
		}

		for (let i = 0; i < 10; i++) {
			await service.set(
				aigId,
				"test-cert-id:aaa",
				undefined,
				UneceDocumentCodes.AccountingStatement,
				Converter.utf8ToBytes(`Hello World${i}`),
				{ "@context": "https://schema.org", type: "DigitalDocument", name: "statement" },
				false,
				TEST_USER_IDENTITY,
				TEST_NODE_IDENTITY
			);
		}

		for (let i = 0; i < 10; i++) {
			await service.set(
				aigId,
				"test-cert-id:aaa",
				undefined,
				UneceDocumentCodes.Certificate,
				Converter.utf8ToBytes(`Hello World${i}`),
				{ "@context": "https://schema.org", type: "DigitalDocument", name: "cert" },
				false,
				TEST_USER_IDENTITY,
				TEST_NODE_IDENTITY
			);
		}

		const result = await service.query(
			"aig:5858585858585858585858585858585858585858585858585858585858585858",
			[UneceDocumentCodes.BillOfLading, UneceDocumentCodes.Certificate],
			{
				includeMostRecentRevisions: true
			},
			undefined,
			TEST_USER_IDENTITY,
			TEST_NODE_IDENTITY
		);

		expect(result.documents.length).toEqual(2);
		expect(result.documents[0]?.revisions?.length).toEqual(5);
		expect(result.documents[1]?.revisions?.length).toEqual(5);
		expect(result.cursor).toBeUndefined();
	});

	test("can query for documents defining document codes with large number of doc codes", async () => {
		const aigId = await auditableItemGraphComponent.create(
			{},
			TEST_USER_IDENTITY,
			TEST_NODE_IDENTITY
		);

		const service = new DocumentManagementService();

		const docCodes = Object.values(UneceDocumentCodes).slice(0, 50);
		for (let i = 0; i < docCodes.length; i++) {
			await service.set(
				aigId,
				"test-doc-id:aaa",
				undefined,
				docCodes[i],
				Converter.utf8ToBytes(`Hello World${i}`),
				{ "@context": "https://schema.org", type: "DigitalDocument", name: "bill-of-lading" },
				false,
				TEST_USER_IDENTITY,
				TEST_NODE_IDENTITY
			);
		}

		const result = await service.query(
			"aig:5858585858585858585858585858585858585858585858585858585858585858",
			undefined,
			undefined,
			undefined,
			TEST_USER_IDENTITY,
			TEST_NODE_IDENTITY
		);

		expect(result.documents.length).toEqual(20);
		expect(result.cursor).toEqual("20");

		const result2 = await service.query(
			"aig:5858585858585858585858585858585858585858585858585858585858585858",
			undefined,
			undefined,
			result.cursor,
			TEST_USER_IDENTITY,
			TEST_NODE_IDENTITY
		);

		expect(result2.documents.length).toEqual(20);
		expect(result.cursor).toEqual("20");

		const result3 = await service.query(
			"aig:5858585858585858585858585858585858585858585858585858585858585858",
			undefined,
			undefined,
			result2.cursor,
			TEST_USER_IDENTITY,
			TEST_NODE_IDENTITY
		);

		expect(result3.documents.length).toEqual(10);
		expect(result3.cursor).toBeUndefined();
	});
});
