# Interface: IDocumentManagementComponent

Interface describing an document management contract.

## Extends

- `IComponent`

## Methods

### create()

> **create**(`documentId`, `documentIdFormat`, `documentCode`, `blob`, `annotationObject?`, `auditableItemGraphEdges?`, `options?`, `userIdentity?`, `nodeIdentity?`): `Promise`\<`string`\>

Create a document as an auditable item graph vertex and add its content to blob storage.
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

##### userIdentity?

`string`

The identity to perform the auditable item graph operation with.

##### nodeIdentity?

`string`

The node identity to use for vault operations.

#### Returns

`Promise`\<`string`\>

The auditable item graph vertex created for the document including its revision.

***

### update()

> **update**(`auditableItemGraphDocumentId`, `blob?`, `annotationObject?`, `auditableItemGraphEdges?`, `userIdentity?`, `nodeIdentity?`): `Promise`\<`void`\>

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

##### userIdentity?

`string`

The identity to perform the auditable item graph operation with.

##### nodeIdentity?

`string`

The node identity to use for vault operations.

#### Returns

`Promise`\<`void`\>

Nothing.

***

### get()

> **get**(`auditableItemGraphDocumentId`, `options?`, `cursor?`, `pageSize?`, `userIdentity?`, `nodeIdentity?`): `Promise`\<[`IDocumentList`](IDocumentList.md)\>

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

##### userIdentity?

`string`

The identity to perform the auditable item graph operation with.

##### nodeIdentity?

`string`

The node identity to use for vault operations.

#### Returns

`Promise`\<[`IDocumentList`](IDocumentList.md)\>

The documents and revisions if requested, ordered by revision descending, cursor is set if there are more document revisions.

***

### removeRevision()

> **removeRevision**(`auditableItemGraphDocumentId`, `revision`, `userIdentity?`, `nodeIdentity?`): `Promise`\<`void`\>

Remove an auditable item graph vertex using it's id.
The document dateDeleted will be set, but can still be queried with the includeRemoved flag.

#### Parameters

##### auditableItemGraphDocumentId

`string`

The auditable item graph vertex id which contains the document.

##### revision

`number`

The revision of the document to remove.

##### userIdentity?

`string`

The identity to perform the auditable item graph operation with.

##### nodeIdentity?

`string`

The node identity to use for vault operations.

#### Returns

`Promise`\<`void`\>

Nothing.

***

### query()

> **query**(`documentId`, `cursor?`, `pageSize?`, `userIdentity?`, `nodeIdentity?`): `Promise`\<`IAuditableItemGraphVertexList`\>

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

##### userIdentity?

`string`

The identity to perform the auditable item graph operation with.

##### nodeIdentity?

`string`

The node identity to use for vault operations.

#### Returns

`Promise`\<`IAuditableItemGraphVertexList`\>

The graph vertices that contain documents referencing the specified document id.
