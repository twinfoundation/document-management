# Interface: IDocument

Interface describing a document.

## Properties

### @context

> **@context**: \[`"https://schema.twindev.org/documents/"`, `"https://schema.twindev.org/common/"`, `"https://schema.org"`, `...IJsonLdContextDefinitionElement[]`\]

JSON-LD Context.

***

### id

> **id**: `string`

The id of the document.

***

### type

> **type**: `"Document"`

JSON-LD Type.

***

### documentIdFormat?

> `optional` **documentIdFormat**: `string`

The format of the document id.

***

### documentCode

> **documentCode**: `string`

The code for the document type.

***

### documentRevision

> **documentRevision**: `number`

The revision of the document as a 0 based index.

***

### annotationObject?

> `optional` **annotationObject**: `IJsonLdNodeObject`

Additional annotation information for the document.

***

### blobStorageId

> **blobStorageId**: `string`

The blob storage id for the document.

***

### blobHash

> **blobHash**: `string`

The hash of the blob data.

***

### blobStorageEntry?

> `optional` **blobStorageEntry**: `IBlobStorageEntry`

The additional JSON-LD for blob storage if it was requested.

***

### attestationId?

> `optional` **attestationId**: `string`

The attestation for the document if one was created.

***

### attestationInformation?

> `optional` **attestationInformation**: `IAttestationInformation`

The additional JSON-LD for attestation storage if it was requested.

***

### dateCreated

> **dateCreated**: `string`

The date/time of when the document was created.

***

### dateModified?

> `optional` **dateModified**: `string`

The date/time of when the document was modified.

***

### dateDeleted?

> `optional` **dateDeleted**: `string`

The date/time of when the document was deleted, as we never actually remove items.
