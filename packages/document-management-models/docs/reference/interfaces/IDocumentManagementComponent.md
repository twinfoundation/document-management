# Interface: IDocumentManagementComponent

Interface describing an document management contract.

## Extends

- `IComponent`

## Methods

### create()

> **create**(`auditableItemGraphId`, `documentId`, `documentIdFormat`, `documentCode`, `data`, `annotationObject`, `createAttestation`): `Promise`\<`string`\>

Add a new document to an auditable item graph vertex and add its content to blob storage.

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

##### data

`Uint8Array`

The data to create the document with.

##### annotationObject

Additional information to associate with the document.

`undefined` | `IJsonLdNodeObject`

##### createAttestation

`boolean`

Flag to create an attestation for the document.

#### Returns

`Promise`\<`string`\>

The identifier for the document which includes the auditable item graph identifier.

***

### get()

> **get**(`identifier`, `includeRevisions`?, `includeRemoved`?): `Promise`\<[`IDocument`](IDocument.md)[]\>

Get a specific document from an auditable item graph vertex.

#### Parameters

##### identifier

`string`

The identifier of the document to get.

##### includeRevisions?

`boolean`

Flag to include the revisions of the document.

##### includeRemoved?

`boolean`

Flag to include any removed documents, dateDeleted will be set for these documents.

#### Returns

`Promise`\<[`IDocument`](IDocument.md)[]\>

The documents and revisions if requested.

***

### remove()

> **remove**(`identifier`): `Promise`\<`void`\>

Remove a specific document from an auditable item graph vertex.

#### Parameters

##### identifier

`string`

The identifier of the document to remove.

#### Returns

`Promise`\<`void`\>

Nothing.

***

### query()

> **query**(`auditableItemGraphId`, `documentCodes`?, `includeRevisions`?, `includeRemoved`?): `Promise`\<[`IDocument`](IDocument.md)[]\>

Query an auditable item graph vertex for documents.

#### Parameters

##### auditableItemGraphId

`string`

The auditable item graph vertex to get the documents from.

##### documentCodes?

`string`[]

The document codes to filter by.

##### includeRevisions?

`boolean`

Flag to include the revisions of the document.

##### includeRemoved?

`boolean`

Flag to include any removed documents, dateDeleted will be set for these documents.

#### Returns

`Promise`\<[`IDocument`](IDocument.md)[]\>

The documents and revisions if requested.
