// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import {
	HttpParameterHelper,
	type ICreatedResponse,
	type IHttpRequestContext,
	type INoContentResponse,
	type INotFoundResponse,
	type IRestRoute,
	type ITag
} from "@twin.org/api-models";
import { Coerce, ComponentFactory, Converter, Guards } from "@twin.org/core";
import {
	DocumentTypes,
	type IDocumentManagementComponent,
	type IDocumentManagementGetRequest,
	type IDocumentManagementGetResponse,
	type IDocumentManagementQueryRequest,
	type IDocumentManagementQueryResponse,
	type IDocumentManagementRemoveRequest,
	type IDocumentManagementSetRequest
} from "@twin.org/document-management-models";
import { nameof } from "@twin.org/nameof";
import { SchemaOrgTypes } from "@twin.org/standards-schema-org";
import { UneceDocumentCodes } from "@twin.org/standards-unece";
import { HeaderTypes, HttpStatusCode, MimeTypes } from "@twin.org/web";

/**
 * The source used when communicating about these routes.
 */
const ROUTES_SOURCE = "documentManagementStorageRoutes";

/**
 * The tag to associate with the routes.
 */
export const tagsDocumentManagement: ITag[] = [
	{
		name: "Document Management",
		description: "Endpoints which are modelled to access a document management contract."
	}
];

/**
 * The REST routes for document management.
 * @param baseRouteName Prefix to prepend to the paths.
 * @param componentName The name of the component to use in the routes stored in the ComponentFactory.
 * @returns The generated routes.
 */
export function generateRestRoutesDocumentManagement(
	baseRouteName: string,
	componentName: string
): IRestRoute[] {
	const documentManagementSetRoute: IRestRoute<IDocumentManagementSetRequest, ICreatedResponse> = {
		operationId: "DocumentManagementSet",
		summary:
			"Store a document in an auditable item graph vertex and add its content to blob storage.",
		tag: tagsDocumentManagement[0].name,
		method: "POST",
		path: `${baseRouteName}/:id`,
		handler: async (httpRequestContext, request) =>
			documentManagementSet(httpRequestContext, componentName, request),
		requestType: {
			type: nameof<IDocumentManagementSetRequest>(),
			examples: [
				{
					id: "DocumentManagementSetRequestExample",
					request: {
						pathParams: {
							id: "aig:123456"
						},
						body: {
							documentId: "2721000",
							documentIdFormat: "bol",
							documentCode: UneceDocumentCodes.BillOfLading,
							blob: "SGVsbG8gV29ybGQ=",
							annotationObject: {
								"@context": "https://schema.org",
								"@type": "DigitalDocument",
								name: "myfile.pdf"
							},
							createAttestation: true
						}
					}
				}
			]
		},
		responseType: [
			{
				type: nameof<ICreatedResponse>(),
				examples: [
					{
						id: "DocumentManagementSetResponseExample",
						response: {
							statusCode: HttpStatusCode.created,
							headers: {
								[HeaderTypes.Location]: "documents:123456:705:2721000"
							}
						}
					}
				]
			}
		]
	};

	const documentManagementGetRoute: IRestRoute<
		IDocumentManagementGetRequest,
		IDocumentManagementGetResponse
	> = {
		operationId: "DocumentManagementGet",
		summary: "Get the data for a document from document management",
		tag: tagsDocumentManagement[0].name,
		method: "GET",
		path: `${baseRouteName}/:id`,
		handler: async (httpRequestContext, request) =>
			documentManagementGet(httpRequestContext, componentName, request),
		requestType: {
			type: nameof<IDocumentManagementGetRequest>(),
			examples: [
				{
					id: "DocumentManagementGetRequestExample",
					request: {
						pathParams: {
							id: "documents:123456:705:2721000"
						}
					}
				}
			]
		},
		responseType: [
			{
				type: nameof<IDocumentManagementGetResponse>(),
				examples: [
					{
						id: "DocumentManagementGetResponseExample",
						response: {
							body: {
								"@context": [
									DocumentTypes.ContextRoot,
									DocumentTypes.ContextRootCommon,
									SchemaOrgTypes.ContextRoot
								],
								type: DocumentTypes.DocumentList,
								documents: [
									{
										"@context": [
											DocumentTypes.ContextRoot,
											DocumentTypes.ContextRootCommon,
											SchemaOrgTypes.ContextRoot
										],
										type: DocumentTypes.Document,
										id: "documents:123456:705:2721000",
										documentIdFormat: "bol",
										documentCode: UneceDocumentCodes.BillOfLading,
										documentRevision: 0,
										blobStorageId:
											"blob-memory:c57d94b088f4c6d2cb32ded014813d0c786aa00134c8ee22f84b1e2545602a70",
										blobHash: "sha256:123456",
										dateCreated: "2024-01-01T00:00:00Z",
										annotationObject: {
											"@context": "https://schema.org",
											"@type": "DigitalDocument",
											name: "myfile.pdf"
										}
									}
								]
							}
						}
					}
				]
			},
			{
				type: nameof<IDocumentManagementGetResponse>(),
				mimeType: MimeTypes.JsonLd,
				examples: [
					{
						id: "DocumentManagementGetResponseExample",
						response: {
							body: {
								"@context": [DocumentTypes.ContextRoot, DocumentTypes.ContextRootCommon],
								type: DocumentTypes.DocumentList,
								documents: [
									{
										"@context": [
											DocumentTypes.ContextRoot,
											DocumentTypes.ContextRootCommon,
											SchemaOrgTypes.ContextRoot
										],
										type: DocumentTypes.Document,
										id: "documents:123456:705:2721000",
										documentIdFormat: "bol",
										documentCode: UneceDocumentCodes.BillOfLading,
										documentRevision: 0,
										blobStorageId:
											"blob-memory:c57d94b088f4c6d2cb32ded014813d0c786aa00134c8ee22f84b1e2545602a70",
										blobHash: "sha256:123456",
										dateCreated: "2024-01-01T00:00:00Z",
										annotationObject: {
											"@context": "https://schema.org",
											"@type": "DigitalDocument",
											name: "myfile.pdf"
										}
									}
								]
							}
						}
					}
				]
			},
			{
				type: nameof<INotFoundResponse>()
			}
		]
	};

	const documentManagementRemoveRoute: IRestRoute<
		IDocumentManagementRemoveRequest,
		INoContentResponse
	> = {
		operationId: "DocumentManagementRemove",
		summary: "Remove an document from an auditable item graph vertex",
		tag: tagsDocumentManagement[0].name,
		method: "DELETE",
		path: `${baseRouteName}/:id`,
		handler: async (httpRequestContext, request) =>
			documentManagementRemove(httpRequestContext, componentName, request),
		requestType: {
			type: nameof<IDocumentManagementRemoveRequest>(),
			examples: [
				{
					id: "DocumentManagementRemoveRequestExample",
					request: {
						pathParams: {
							id: "documents:123456:705:2721000"
						}
					}
				}
			]
		},
		responseType: [
			{
				type: nameof<INoContentResponse>()
			},
			{
				type: nameof<INotFoundResponse>()
			}
		]
	};

	const documentManagementQueryRoute: IRestRoute<
		IDocumentManagementQueryRequest,
		IDocumentManagementQueryResponse
	> = {
		operationId: "DocumentManagementQuery",
		summary: "Query the items from an auditable item graph vertex",
		tag: tagsDocumentManagement[0].name,
		method: "GET",
		path: `${baseRouteName}/query/:id`,
		handler: async (httpRequestContext, request) =>
			documentManagementQuery(httpRequestContext, componentName, request),
		requestType: {
			type: nameof<IDocumentManagementQueryRequest>(),
			examples: [
				{
					id: "DocumentManagementQueryRequestExample",
					request: {
						pathParams: {
							id: "aig:123456"
						}
					}
				}
			]
		},
		responseType: [
			{
				type: nameof<IDocumentManagementQueryResponse>(),
				examples: [
					{
						id: "DocumentManagementQueryResponseExample",
						response: {
							body: {
								"@context": [DocumentTypes.ContextRoot, DocumentTypes.ContextRootCommon],
								type: DocumentTypes.DocumentList,
								documents: [
									{
										"@context": [
											DocumentTypes.ContextRoot,
											DocumentTypes.ContextRootCommon,
											SchemaOrgTypes.ContextRoot
										],
										type: DocumentTypes.Document,
										id: "documents:123456:705:2721000",
										documentIdFormat: "bol",
										documentCode: UneceDocumentCodes.BillOfLading,
										documentRevision: 0,
										blobStorageId:
											"blob-memory:c57d94b088f4c6d2cb32ded014813d0c786aa00134c8ee22f84b1e2545602a70",
										blobHash: "sha256:123456",
										dateCreated: "2024-01-01T00:00:00Z",
										annotationObject: {
											"@context": "https://schema.org",
											"@type": "DigitalDocument",
											name: "myfile.pdf"
										}
									}
								]
							}
						}
					}
				]
			},
			{
				type: nameof<IDocumentManagementQueryResponse>(),
				mimeType: MimeTypes.JsonLd,
				examples: [
					{
						id: "DocumentManagementListResponseJsonLdExample",
						response: {
							body: {
								"@context": [DocumentTypes.ContextRoot, DocumentTypes.ContextRootCommon],
								type: DocumentTypes.DocumentList,
								documents: [
									{
										"@context": [
											DocumentTypes.ContextRoot,
											DocumentTypes.ContextRootCommon,
											SchemaOrgTypes.ContextRoot
										],
										type: DocumentTypes.Document,
										id: "documents:123456:705:2721000",
										documentIdFormat: "bol",
										documentCode: UneceDocumentCodes.BillOfLading,
										documentRevision: 0,
										blobStorageId:
											"blob-memory:c57d94b088f4c6d2cb32ded014813d0c786aa00134c8ee22f84b1e2545602a70",
										blobHash: "sha256:123456",
										dateCreated: "2024-01-01T00:00:00Z",
										annotationObject: {
											"@context": "https://schema.org",
											"@type": "DigitalDocument",
											name: "myfile.pdf"
										}
									}
								]
							}
						}
					}
				]
			}
		]
	};

	return [
		documentManagementSetRoute,
		documentManagementGetRoute,
		documentManagementRemoveRoute,
		documentManagementQueryRoute
	];
}

/**
 * Set a document in to an auditable item graph vertex.
 * @param httpRequestContext The request context for the API.
 * @param componentName The name of the component to use in the routes.
 * @param request The request.
 * @returns The response object with additional http response properties.
 */
export async function documentManagementSet(
	httpRequestContext: IHttpRequestContext,
	componentName: string,
	request: IDocumentManagementSetRequest
): Promise<ICreatedResponse> {
	Guards.object<IDocumentManagementSetRequest>(ROUTES_SOURCE, nameof(request), request);
	Guards.object<IDocumentManagementSetRequest["pathParams"]>(
		ROUTES_SOURCE,
		nameof(request.pathParams),
		request.pathParams
	);
	Guards.stringValue(ROUTES_SOURCE, nameof(request.pathParams.id), request.pathParams.id);
	Guards.object<IDocumentManagementSetRequest["body"]>(
		ROUTES_SOURCE,
		nameof(request.body),
		request.body
	);
	Guards.stringBase64(ROUTES_SOURCE, nameof(request.body.blob), request.body.blob);

	const component = ComponentFactory.get<IDocumentManagementComponent>(componentName);
	const id = await component.set(
		request.pathParams.id,
		request.body.documentId,
		request.body.documentIdFormat,
		request.body.documentCode,
		Converter.base64ToBytes(request.body.blob),
		request.body.annotationObject,
		request.body.createAttestation,
		httpRequestContext.userIdentity,
		httpRequestContext.nodeIdentity
	);

	return {
		statusCode: HttpStatusCode.created,
		headers: {
			location: id
		}
	};
}

/**
 * Get the document from the auditable item graph vertex.
 * @param httpRequestContext The request context for the API.
 * @param componentName The name of the component to use in the routes.
 * @param request The request.
 * @returns The response object with additional http response properties.
 */
export async function documentManagementGet(
	httpRequestContext: IHttpRequestContext,
	componentName: string,
	request: IDocumentManagementGetRequest
): Promise<IDocumentManagementGetResponse> {
	Guards.object<IDocumentManagementGetRequest>(ROUTES_SOURCE, nameof(request), request);
	Guards.object<IDocumentManagementGetRequest["pathParams"]>(
		ROUTES_SOURCE,
		nameof(request.pathParams),
		request.pathParams
	);
	Guards.stringValue(ROUTES_SOURCE, nameof(request.pathParams.id), request.pathParams.id);

	const mimeType = request.headers?.[HeaderTypes.Accept] === MimeTypes.JsonLd ? "jsonld" : "json";

	const component = ComponentFactory.get<IDocumentManagementComponent>(componentName);

	const result = await component.get(
		request.pathParams.id,
		{
			includeBlobStorageMetadata: request.query?.includeBlobStorageMetadata,
			includeBlobStorageData: request.query?.includeBlobStorageData,
			includeAttestation: request.query?.includeAttestation,
			maxRevisionCount: Coerce.integer(request.query?.maxRevisionCount)
		},
		request.query?.revisionCursor,
		httpRequestContext.userIdentity,
		httpRequestContext.nodeIdentity
	);

	return {
		headers: {
			[HeaderTypes.ContentType]: mimeType === "json" ? MimeTypes.Json : MimeTypes.JsonLd
		},
		body: result
	};
}

/**
 * Remove the document from the auditable item graph vertex.
 * @param httpRequestContext The request context for the API.
 * @param componentName The name of the component to use in the routes.
 * @param request The request.
 * @returns The response object with additional http response properties.
 */
export async function documentManagementRemove(
	httpRequestContext: IHttpRequestContext,
	componentName: string,
	request: IDocumentManagementRemoveRequest
): Promise<INoContentResponse> {
	Guards.object<IDocumentManagementRemoveRequest>(ROUTES_SOURCE, nameof(request), request);
	Guards.object<IDocumentManagementRemoveRequest["pathParams"]>(
		ROUTES_SOURCE,
		nameof(request.pathParams),
		request.pathParams
	);
	Guards.stringValue(ROUTES_SOURCE, nameof(request.pathParams.id), request.pathParams.id);

	const component = ComponentFactory.get<IDocumentManagementComponent>(componentName);

	await component.remove(
		request.pathParams.id,
		httpRequestContext.userIdentity,
		httpRequestContext.nodeIdentity
	);

	return {
		statusCode: HttpStatusCode.noContent
	};
}

/**
 * Query the documents from an auditable item graph vertex.
 * @param httpRequestContext The request context for the API.
 * @param componentName The name of the component to use in the routes.
 * @param request The request.
 * @returns The response object with additional http response properties.
 */
export async function documentManagementQuery(
	httpRequestContext: IHttpRequestContext,
	componentName: string,
	request: IDocumentManagementQueryRequest
): Promise<IDocumentManagementQueryResponse> {
	Guards.object<IDocumentManagementQueryRequest>(ROUTES_SOURCE, nameof(request), request);
	Guards.object<IDocumentManagementQueryRequest["pathParams"]>(
		ROUTES_SOURCE,
		nameof(request.pathParams),
		request.pathParams
	);
	Guards.stringValue(ROUTES_SOURCE, nameof(request.pathParams.id), request.pathParams.id);

	const mimeType = request.headers?.[HeaderTypes.Accept] === MimeTypes.JsonLd ? "jsonld" : "json";

	const component = ComponentFactory.get<IDocumentManagementComponent>(componentName);

	const result = await component.query(
		request.pathParams.id,
		HttpParameterHelper.arrayFromString(request.query?.documentCodes),
		request.query?.cursor,
		httpRequestContext.userIdentity,
		httpRequestContext.nodeIdentity
	);

	return {
		headers: {
			[HeaderTypes.ContentType]: mimeType === "json" ? MimeTypes.Json : MimeTypes.JsonLd
		},
		body: result
	};
}
