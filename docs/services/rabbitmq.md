# RabbitMQ

## Scraping Request Message

The message is sent on `scraper_target_queue`, using exchange `scraper_target_exchange` and routing key `scraper_target_routing_key`.

It's produced by **management app** to request a Scraping Activity of a single source URL. 

It's consumed by **scraper worker** and starts a Scraping Activity of a single source URL.

```json5
{
  "executionId": "string",          // Not null, the Identification of this Scraping Activity execution.,
  "rootUri": "string",              // Not null, the URI to start the Scraping Activity from.,
  "configuration": "json_object"    // Not null, the Scraping Activity configuration.
}
```

## Scraping Result Message

The message is sent on `scraper_result_queue`, using exchange `scraper_result_exchange` and routing key `scraper_result_routing_key`.

It's produced by **scraper worker** and contains one result of Scraping Activity of a single source URL. 
One Scraping Activity produces Multiple results.

It's consumed by **management app** for further processing.

```json5
{
  "executionId": "string",        // Not null, the Identification of this Scraping Activity execution.
  "uri": "string",                // Not null, the URI of the scraped Call for Proposal web page.
  "subId": "string",              // Nullable, in case if there are multiple Call for Proposals under the same URI, this is used to distinguish them - not part of URL. 
  "pageMarkdown": "string",       // Not null, BIG string, the scraped Call for Proposal, formated in markdown.
  "attachments": [                // Not null, can be empty, the list of attachments found for the Call for Proposal.
    {
      "label": "string",          // Not null, an anchor text of the attachment.
      "uri": "string",            // Not null, a URI of the attachment.
      "subId": "string",          // Nullable, in case attachments are under the same URI, this is used to distinguish them - not part of URL.
      "encodedContent": "string"  // Not null, BIG string, the content of attachment encoded in base64.
    }
  ]
}
```

## Classification Request Message

The message is sent on `classification_target_queue`, using exchange `classification_target_exchange` and routing key `classification_target_routing_key`.

It's produced by **management app** to request a Classification Activity of a single Call for Proposal.

It's consumed by **classifier worker** and starts a Classification Activity of a single Call for Proposal.

```json5
{
  "executionId": "string",        // Not null, the Identification of this Scraping Activity execution.
  "cfpId": "string",              // Not null, unique Identifier of this specific CfP. This should be included in the 'cfpAnalysis' entity and be available to the frontend client
  "url": "string",                // Not null, the URI with 
  "content": "string",            // Not null, BIG string, the textual content of a context passed to classification prompt as-is.
}
```

## Classification Result Message

The message is sent on `classification_result_queue`, using exchange `classification_result_exchange` and routing key `classification_result_routing_key`.

It's produced by **classifier worker** and contains one result of Classification Activity of a single Call for Proposal.
One Classification Activity produces One result.

It's consumed by **management app** for user's presentation.

```json5
{
  "original_message": "json_object",                  // Not null, the Classification Request Message as-is.
  "classification_result": {
    "eligible": "boolean",                            // Not null, whenever the ILO is eligible for this Call for Proposal.
    "exclusion_reason": "string",                     // Nullable, optional reason, why ILO is not eligible for this Call for Proposal.
    "classification_summary": "string",               // Not null, the summary of this Call for Proposal.
    "criteria": {
      "fieldName_1": {                                // Property name equals a criteria field name.
        "status": "string",                           // Nullable, the string containing one of true|false|null.
        "evidence": "string"                          // Nullable, the text with evidence of the status.
      },
      "fieldName_N": {                                // Property name equals a criteria field name.
        "status": "string",                           // Nullable, the string containing one of true|false|null.
        "evidence": "string"                          // Nullable, the text with evidence of the status.
      }
    },
    "extracted_data": "json_object",                  // Not null, the object contain various data records extracted from this Call for Proposal.
    "confidence_score": "number"                      // Not null, decimal 0.0-1.0, the confidence score.
  }
}
```
