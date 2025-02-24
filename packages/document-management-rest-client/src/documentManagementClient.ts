// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import { BaseRestClient } from "@twin.org/api-core";
import {
	HttpParameterHelper,
	type IBaseRestClientConfig,
	type ICreatedResponse,
	type INoContentResponse
} from "@twin.org/api-models";
import { Converter, Guards, Is, Urn } from "@twin.org/core";
import type { IJsonLdNodeObject } from "@twin.org/data-json-ld";
import type {
	IDocument,
	IDocumentList,
	IDocumentManagementComponent,
	IDocumentManagementGetRequest,
	IDocumentManagementGetResponse,
	IDocumentManagementQueryRequest,
	IDocumentManagementQueryResponse,
	IDocumentManagementRemoveRequest,
	IDocumentManagementSetRequest
} from "@twin.org/document-management-models";
import { nameof } from "@twin.org/nameof";
import { UneceDocumentCodes } from "@twin.org/standards-unece";

/**
 * Client for performing document management through to REST endpoints.
 */
export class DocumentManagementClient
	extends BaseRestClient
	implements IDocumentManagementComponent
{
	/**
	 * Runtime name for the class.
	 * @internal
	 */
	private static readonly _CLASS_NAME: string = nameof<DocumentManagementClient>();

	/**
	 * Runtime name for the class.
	 */
	public readonly CLASS_NAME: string = DocumentManagementClient._CLASS_NAME;

	/**
	 * Create a new instance of DocumentManagementClient.
	 * @param config The configuration for the client.
	 */
	constructor(config: IBaseRestClientConfig) {
		super(DocumentManagementClient._CLASS_NAME, config, "documents");
	}

	/**
	 * Store a document in an auditable item graph vertex and add its content to blob storage.
	 * If the document id already exists and the blob data is different a new revision will be created.
	 * For any other changes the current revision will be updated.
	 * @param auditableItemGraphId The auditable item graph vertex id to create the document on.
	 * @param documentId The document id to create.
	 * @param documentIdFormat The format of the document identifier.
	 * @param documentCode The code for the document type.
	 * @param blob The data to create the document.
	 * @param annotationObject Additional information to associate with the document.
	 * @param createAttestation Flag to create an attestation for the document, defaults to false.
	 * @returns The identifier for the document which includes the auditable item graph identifier.
	 */
	public async set(
		auditableItemGraphId: string,
		documentId: string,
		documentIdFormat: string | undefined,
		documentCode: UneceDocumentCodes,
		blob: Uint8Array,
		annotationObject?: IJsonLdNodeObject,
		createAttestation?: boolean
	): Promise<string> {
		Guards.stringValue(this.CLASS_NAME, nameof(auditableItemGraphId), auditableItemGraphId);
		Guards.stringValue(this.CLASS_NAME, nameof(documentId), documentId);
		Guards.arrayOneOf(
			this.CLASS_NAME,
			nameof(documentCode),
			documentCode,
			Object.values(UneceDocumentCodes)
		);
		Guards.uint8Array(this.CLASS_NAME, nameof(blob), blob);

		const response = await this.fetch<IDocumentManagementSetRequest, ICreatedResponse>(
			"/:auditableItemGraphId",
			"POST",
			{
				pathParams: {
					auditableItemGraphId
				},
				body: {
					documentId,
					documentIdFormat,
					documentCode,
					blob: Converter.bytesToBase64(blob),
					annotationObject,
					createAttestation
				}
			}
		);

		return response.headers.location;
	}

	/**
	 * Get a specific document from an auditable item graph vertex.
	 * @param auditableItemGraphId The auditable item graph vertex id to get the document from.
	 * @param identifier The identifier of the document to get.
	 * @param options Additional options for the get operation.
	 * @param options.includeBlobStorageMetadata Flag to include the blob storage metadata for the document, defaults to false.
	 * @param options.includeBlobStorageData Flag to include the blob storage data for the document, defaults to false.
	 * @param options.includeAttestation Flag to include the attestation information for the document, defaults to false.
	 * @param options.includeRemoved Flag to include deleted documents, defaults to false.
	 * @param options.maxRevisionCount Max number of revisions to return, defaults to 0.
	 * @param revisionCursor The cursor to get the next chunk of revisions.
	 * @returns The documents and revisions if requested, ordered by revision descending, cursor is set if there are more document revisions.
	 */
	public async get(
		auditableItemGraphId: string,
		identifier: string,
		options?: {
			includeBlobStorageMetadata?: boolean;
			includeBlobStorageData?: boolean;
			includeAttestation?: boolean;
			includeRemoved?: boolean;
			maxRevisionCount?: number;
		},
		revisionCursor?: string
	): Promise<IDocument> {
		Urn.guard(this.CLASS_NAME, nameof(auditableItemGraphId), auditableItemGraphId);
		Urn.guard(this.CLASS_NAME, nameof(identifier), identifier);

		const response = await this.fetch<
			IDocumentManagementGetRequest,
			IDocumentManagementGetResponse
		>("/:auditableItemGraphId/:documentId", "GET", {
			pathParams: {
				auditableItemGraphId,
				documentId: identifier
			},
			query: {
				includeBlobStorageMetadata: options?.includeBlobStorageMetadata,
				includeBlobStorageData: options?.includeBlobStorageData,
				includeAttestation: options?.includeAttestation,
				includeRemoved: options?.includeRemoved,
				maxRevisionCount: options?.maxRevisionCount,
				revisionCursor
			}
		});

		return response.body;
	}

	/**
	 * Remove a specific document from an auditable item graph vertex.
	 * The documents dateDeleted will be set, but can still be queried with the includeRemoved flag.
	 * @param auditableItemGraphId The auditable item graph vertex id to remove the document from.
	 * @param identifier The identifier of the document to remove.
	 * @param options Additional options for the remove operation.
	 * @param options.removeAllRevisions Flag to remove all revisions of the document, defaults to false.
	 * @returns Nothing.
	 */
	public async remove(
		auditableItemGraphId: string,
		identifier: string,
		options?: { removeAllRevisions?: boolean }
	): Promise<void> {
		Urn.guard(this.CLASS_NAME, nameof(auditableItemGraphId), auditableItemGraphId);
		Urn.guard(this.CLASS_NAME, nameof(identifier), identifier);

		await this.fetch<IDocumentManagementRemoveRequest, INoContentResponse>(
			"/:auditableItemGraphId/:documentId",
			"DELETE",
			{
				pathParams: {
					auditableItemGraphId,
					documentId: identifier
				},
				query: {
					removeAllRevisions: options?.removeAllRevisions
				}
			}
		);
	}

	/**
	 * Query an auditable item graph vertex for documents.
	 * @param auditableItemGraphId The auditable item graph vertex to get the documents from.
	 * @param documentCodes The document codes to query for, if undefined gets all document codes.
	 * @param options Additional options for the query operation.
	 * @param options.includeMostRecentRevisions Include the most recent 5 revisions, use the individual get to retrieve more.
	 * @param options.includeRemoved Flag to include deleted documents, defaults to false.
	 * @param cursor The cursor to get the next chunk of documents.
	 * @returns The most recent revisions of each document, cursor is set if there are more documents.
	 */
	public async query(
		auditableItemGraphId: string,
		documentCodes?: UneceDocumentCodes[],
		options?: {
			includeMostRecentRevisions?: boolean;
			includeRemoved?: boolean;
		},
		cursor?: string
	): Promise<IDocumentList> {
		Urn.guard(this.CLASS_NAME, nameof(auditableItemGraphId), auditableItemGraphId);

		const response = await this.fetch<
			IDocumentManagementQueryRequest,
			IDocumentManagementQueryResponse
		>("/:auditableItemGraphId", "GET", {
			pathParams: {
				auditableItemGraphId
			},
			query: {
				documentCodes: Is.arrayValue(documentCodes)
					? HttpParameterHelper.arrayToString(documentCodes)
					: undefined,
				includeMostRecentRevisions: options?.includeMostRecentRevisions,
				includeRemoved: options?.includeRemoved,
				cursor
			}
		});

		return response.body;
	}
}
