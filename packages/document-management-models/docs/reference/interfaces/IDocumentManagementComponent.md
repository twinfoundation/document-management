# Interface: IDocumentManagementComponent

Interface describing an document management contract.

## Extends

- `IComponent`

## Methods

### set()

> **set**(`auditableItemGraphId`, `documentId`, `documentIdFormat`, `documentCode`, `blob`, `annotationObject`?, `createAttestation`?, `userIdentity`?, `nodeIdentity`?): `Promise`\<`string`\>

Store a document in an auditable item graph vertex and add its content to blob storage.
If the document id already exists and the blob data is different a new revision will be created.
For any other changes the current revision will be updated.

#### Parameters

##### auditableItemGraphId

`string`

The auditable item graph vertex id to create the document on.

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

##### createAttestation?

`boolean`

Flag to create an attestation for the document, defaults to false.

##### userIdentity?

`string`

The identity to perform the auditable item graph operation with.

##### nodeIdentity?

`string`

The node identity to use for vault operations.

#### Returns

`Promise`\<`string`\>

The identifier for the document which includes the auditable item graph identifier.

***

### get()

> **get**(`identifier`, `options`?, `revisionCursor`?, `userIdentity`?, `nodeIdentity`?): `Promise`\<[`IDocumentList`](IDocumentList.md)\>

Get a specific document from an auditable item graph vertex.

#### Parameters

##### identifier

`string`

The identifier of the document to get.

##### options?

Additional options for the get operation.

###### includeBlobStorageMetadata?

`boolean`

Flag to include the blob storage metadata for the document.

###### includeBlobStorageData?

`boolean`

Flag to include the blob storage data for the document.

###### includeAttestation?

`boolean`

Flag to include the attestation information for the document.

###### maxRevisionCount?

`number`

Max number of revisions to return, defaults to 0.

##### revisionCursor?

`string`

The cursor to get the next chunk of revisions.

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

### remove()

> **remove**(`identifier`, `userIdentity`?, `nodeIdentity`?): `Promise`\<`void`\>

Remove a specific document from an auditable item graph vertex.
The documents dateDeleted will be set, but can still be queried with the includeRemoved flag.

#### Parameters

##### identifier

`string`

The identifier of the document to remove.

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

> **query**(`auditableItemGraphId`, `documentCodes`?, `cursor`?, `userIdentity`?, `nodeIdentity`?): `Promise`\<[`IDocumentList`](IDocumentList.md)\>

Query an auditable item graph vertex for documents.

#### Parameters

##### auditableItemGraphId

`string`

The auditable item graph vertex to get the documents from.

##### documentCodes?

`string`[]

The document codes to query for, if undefined gets all document codes.

##### cursor?

`string`

The cursor to get the next chunk of documents.

##### userIdentity?

`string`

The identity to perform the auditable item graph operation with.

##### nodeIdentity?

`string`

The node identity to use for vault operations.

#### Returns

`Promise`\<[`IDocumentList`](IDocumentList.md)\>

The most recent revisions of each document, cursor is set if there are more documents.
