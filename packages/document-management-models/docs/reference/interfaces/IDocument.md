# Interface: IDocument

Interface describing a document.

## Properties

### @context

> **@context**: `"https://schema.twindev.org/documents/"` \| \[`"https://schema.twindev.org/documents/"`, `...IJsonLdContextDefinitionElement[]`\]

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

### documentRevision?

> `optional` **documentRevision**: `number`

The revision of the document.

***

### annotationObject?

> `optional` **annotationObject**: `IJsonLdNodeObject`

Additional annotation information for the document.

***

### blobStorageId

> **blobStorageId**: `string`

The blob storage id for the document.

***

### attestationId?

> `optional` **attestationId**: `string`

The attestation for the document if one was created.

***

### dateCreated

> **dateCreated**: `string`

The date/time of when the element was created.

***

### dateModified?

> `optional` **dateModified**: `string`

The date/time of when the element was modified.

***

### dateDeleted?

> `optional` **dateDeleted**: `string`

The date/time of when the element was deleted, as we never actually remove items.
