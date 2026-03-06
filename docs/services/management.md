# Management

# CfpAnalysis API Query Guide

This guide explains how to use the `search`, `sort`, and pagination parameters to query the `/api/cfp-analyses` endpoint.

## Pagination

You can control pagination with the following parameters:

* `page`: The page number to retrieve (0-indexed).

* `size`: The number of items per page.

**Example:** Get the first page with 5 items.
`/api/cfp-analyses?page=0&size=5`

## Sorting

You can sort the results by any field in the `CfpAnalysis` entity. Sorting on nested JSON properties is not supported.

* `sort`: A comma-separated list of properties to sort by, in the format `property,direction`.

* The direction can be `asc` (ascending) or `desc` (descending).

**Example:** Sort by timestamp in descending order, then by title in ascending order.
`/api/cfp-analyses?sort=timestamp,desc&sort=title,asc`

## Filtering (Searching)

The `search` parameter accepts an RSQL query string to filter the results.

### Supported Operators

| **Operator** | **Description** | **Example** |
| `==` | Equals | `eligible==true` |
| `!=` | Not Equals | `exclusionReason!=null` |
| `>`, `=gt=` | Greater Than | `confidenceScore>0.8` |
| `>=`, `=ge=` | Greater Than or Equal To | `confidenceScore>=0.8` |
| `<`, `=lt=` | Less Than | `timestamp<'2023-10-27T10:00:00Z'` |
| `<=`, `=le=` | Less Than or Equal To | `timestamp<='2023-10-27T10:00:00Z'` |
| `=in=` | In a list | `status=in=(true,false)` |
| `=out=` | Not in a list | `id=out=(1,5,10)` |

### Supported Fields

You can filter by fields directly on `CfpAnalysis` or on its related entities.

#### Direct Fields

* `id`

* `url`

* `title`

* `timestamp`

* `eligible`

* `exclusionReason`

* `confidenceScore`

#### Related Fields (via Joins)

Use dot notation to access fields on related entities.

* `criteria.status`: Filter by the status of any associated criterion.

* `criteria.type.fieldName`: Filter by the field name of the criterion's type.

* `criteria.type.hard`: Filter by the `hard` property of the criterion's type.

#### JSONB Fields (`extractedData`)

Use the `extractedData.json.` prefix to query properties within the JSONB column.

* `extractedData.json.<propertyName>`: Filter by a top-level property in the `extractedData` field.

### Combining Filters

You can combine filters using logical operators:

* `;` or `and`: Logical AND

* `,` or `or`: Logical OR

### Example API Calls

1. **Find all eligible analyses:**
   `/api/cfp-analyses?search=eligible==true`

2. **Find analyses that were processed after a specific date:**
   `/api/cfp-analyses?search=timestamp>'2023-01-01T00:00:00Z'`

3. **Find all analyses that have at least one criterion with the status 'false':**
   `/api/cfp-analyses?search=criteria.status=='false'`

4. **Find analyses where the extracted `organizationName` is 'United Nations':**
   `/api/cfp-analyses?search=extractedData.json.organizationName=='United Nations'`

5. **Find analyses where the extracted `maxBudget` is greater than 50000:**
   `/api/cfp-analyses?search=extractedData.json.maxBudget>50000`

6. **Complex: Find eligible analyses that have a high confidence score AND an extracted `isForProfit` flag set to false:**
   `/api/cfp-analyses?search=eligible==true;confidenceScore>0.8;extractedData.json.isForProfit==false`