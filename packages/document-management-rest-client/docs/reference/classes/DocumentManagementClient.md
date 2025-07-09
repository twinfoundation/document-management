# Class: DocumentManagementClient

Client for performing document management through to REST endpoints.

## Extends

- `BaseRestClient`

## Implements

- `IDocumentManagementComponent`

## Constructors

### Constructor

> **new DocumentManagementClient**(`config`): `DocumentManagementClient`

Create a new instance of DocumentManagementClient.

#### Parameters

##### config

`IBaseRestClientConfig`

The configuration for the client.

#### Returns

`DocumentManagementClient`

#### Overrides

`BaseRestClient.constructor`

## Properties

### CLASS\_NAME

> `readonly` **CLASS\_NAME**: `string` = `DocumentManagementClient._CLASS_NAME`

Runtime name for the class.

#### Implementation of

`IDocumentManagementComponent.CLASS_NAME`

## Methods

### create()

> **create**(`documentId`, `documentIdFormat`, `documentCode`, `blob`, `annotationObject?`, `auditableItemGraphEdges?`, `options?`): `Promise`\<`string`\>

Store a document as an auditable item graph vertex and add its content to blob storage.
If the document id already exists and the blob data is different a new revision will be created.
For any other changes the current revision will be updated.

#### Parameters

##### documentId

`string`

The document id to create.

##### documentIdFormat

The format of the document identifier.

`undefined` | `string`

##### documentCode

`string`

The code for the document type.

##### blob

`Uint8Array`

The data to create the document with.

##### annotationObject?

`IJsonLdNodeObject`

Additional information to associate with the document.

##### auditableItemGraphEdges?

`object`[]

The auditable item graph vertices to connect the document to.

##### options?

Additional options for the set operation.

###### createAttestation?

`boolean`

Flag to create an attestation for the document, defaults to false.

###### addAlias?

`boolean`

Flag to add the document id as an alias to the aig vertex, defaults to true.

###### aliasAnnotationObject?

`IJsonLdNodeObject`

Annotation object for the alias.

#### Returns

`Promise`\<`string`\>

The auditable item graph vertex created for the document including its revision.

#### Implementation of

`IDocumentManagementComponent.create`

***

### update()

> **update**(`auditableItemGraphDocumentId`, `blob?`, `annotationObject?`, `auditableItemGraphEdges?`): `Promise`\<`void`\>

Update a document as an auditable item graph vertex and add its content to blob storage.
If the blob data is different a new revision will be created.
For any other changes the current revision will be updated.

#### Parameters

##### auditableItemGraphDocumentId

`string`

The auditable item graph vertex id which contains the document.

##### blob?

`Uint8Array`\<`ArrayBufferLike`\>

The data to update the document with.

##### annotationObject?

`IJsonLdNodeObject`

Additional information to associate with the document.

##### auditableItemGraphEdges?

`object`[]

The auditable item graph vertices to connect the document to, if undefined retains current connections.

#### Returns

`Promise`\<`void`\>

Nothing.

#### Implementation of

`IDocumentManagementComponent.update`

***

### get()

> **get**(`auditableItemGraphDocumentId`, `options?`, `cursor?`, `pageSize?`): `Promise`\<`IDocumentList`\>

Get a document using it's auditable item graph vertex id and optional revision.

#### Parameters

##### auditableItemGraphDocumentId

`string`

The auditable item graph vertex id which contains the document.

##### options?

Additional options for the get operation.

###### includeBlobStorageMetadata?

`boolean`

Flag to include the blob storage metadata for the document, defaults to false.

###### includeBlobStorageData?

`boolean`

Flag to include the blob storage data for the document, defaults to false.

###### includeAttestation?

`boolean`

Flag to include the attestation information for the document, defaults to false.

###### includeRemoved?

`boolean`

Flag to include deleted documents, defaults to false.

###### extractRuleGroupId?

`string`

If provided will extract data from the document using the specified rule group id.

###### extractMimeType?

`string`

By default extraction will auto detect the mime type of the document, this can be used to override the detection.

##### cursor?

`string`

The cursor to get the next chunk of revisions.

##### pageSize?

`number`

Page size of items to return, defaults to 1 so only most recent is returned.

#### Returns

`Promise`\<`IDocumentList`\>

The documents and revisions if requested, ordered by revision descending, cursor is set if there are more document revisions.

#### Implementation of

`IDocumentManagementComponent.get`

***

### getRevision()

> **getRevision**(`auditableItemGraphDocumentId`, `revision`, `options?`): `Promise`\<`IDocument`\>

Get a document revision using it's auditable item graph vertex id.

#### Parameters

##### auditableItemGraphDocumentId

`string`

The auditable item graph vertex id which contains the document.

##### revision

`number`

The revision id for the document.

##### options?

Additional options for the get operation.

###### includeBlobStorageMetadata?

`boolean`

Flag to include the blob storage metadata for the document, defaults to false.

###### includeBlobStorageData?

`boolean`

Flag to include the blob storage data for the document, defaults to false.

###### includeAttestation?

`boolean`

Flag to include the attestation information for the document, defaults to false.

###### extractRuleGroupId?

`string`

If provided will extract data from the document using the specified rule group id.

###### extractMimeType?

`string`

By default extraction will auto detect the mime type of the document, this can be used to override the detection.

#### Returns

`Promise`\<`IDocument`\>

The documents and revisions if requested, ordered by revision descending, cursor is set if there are more document revisions.

#### Implementation of

`IDocumentManagementComponent.getRevision`

***

### removeRevision()

> **removeRevision**(`auditableItemGraphDocumentId`, `revision`): `Promise`\<`void`\>

Remove an auditable item graph vertex using it's id.
The document dateDeleted will be set, but can still be queried with the includeRemoved flag.

#### Parameters

##### auditableItemGraphDocumentId

`string`

The auditable item graph vertex id which contains the document.

##### revision

`number`

The revision of the document to remove.

#### Returns

`Promise`\<`void`\>

Nothing.

#### Implementation of

`IDocumentManagementComponent.removeRevision`

***

### query()

> **query**(`documentId`, `cursor?`, `pageSize?`): `Promise`\<`IAuditableItemGraphVertexList`\>

Find all the document with a specific id.

#### Parameters

##### documentId

`string`

The document id to find in the graph.

##### cursor?

`string`

The cursor to get the next chunk of documents.

##### pageSize?

`number`

The page size to get the next chunk of documents.

#### Returns

`Promise`\<`IAuditableItemGraphVertexList`\>

The graph vertices that contain documents referencing the specified document id.

#### Implementation of

`IDocumentManagementComponent.query`
