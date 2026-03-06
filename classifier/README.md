# Classifier Service

This service classifies the content from RabbitMQ queue `classification_target_queue` and puts results 
on `classification_result_queue` for further processing

## **Format Documentation**

This section outlines the expected JSON output format from the AI and a message format that is sent to the result.

### RabbitMQ Output Message Format

This document describes the `classification_result` object and the full message published to the `classification_result_queue`

---

### **Message Structure**

```json
{
  "original_message": {
    "content": "<The original HTML/text content that was processed>",
    "url": "<The URL of the content>",
    "...": "(any other fields from the input message)"
  },
  "classification_result": {
    "eligible": false,
    "exclusion_reason": "Deadline for submitting applications has passed (16 February 2021).",
    "classification_summary": "...",
    "criteria": {},
    "extracted_data": {},
    "confidence_score": 0.65
  }
}
```

### **Root Level Fields**

The top-level JSON object contains the following fields:

| Field                    | Type          | Description                                                                                                  |
|:-------------------------|:--------------|:-------------------------------------------------------------------------------------------------------------|
| `eligible`               | Boolean       | `true` if the CfP is eligible, `false` otherwise, based on hard exclusion criteria.                          |
| `exclusion_reason`       | String / Null | A one-sentence explanation if `eligible` is `false`. `null` if `eligible` is `true`.                         |
| `classification_summary` | String        | A narrative summary explaining the final eligible status and the critical criteria that led to the decision. |
| `criteria`               | Object        | An object containing the evaluation status for each classification criterion.                                |
| `extracted_data`         | Object        | An object containing key data points extracted from the CfP text.                                            |
| `confidence_score`       | Float         | A score (0.0-1.0) indicating the model's confidence in its analysis.                                         |

### **`criteria` Object**

This object contains a key for each criterion being evaluated. The key is the criterion's name, and the value is an object with the following structure:

| Field      | Type          | Description                                                                                               |
|:-----------|:--------------|:----------------------------------------------------------------------------------------------------------|
| `status`   | String / Null | The result of the evaluation: `"true"`, `"false"`, or `null` if undetermined.                             |
| `evidence` | String / Null | A short explanation in English justifying the status, often with a translated quote from the source text. |

### **`extracted_data` Object**

This object contains all the structured data extracted from the document.

| Field                  | Type          | Description                                                                                                                                                                     |
|:-----------------------|:--------------|:--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `deadline`             | String / Null | The final submission date, formatted as `YYYY-MM-DD`. null if ambiguous or not found.                                                                                           |
| `deadline_text`        | String / Null | The deadline as it appears verbatim in the original text.                                                                                                                       |
| `funding_min`          | Number / Null | The minimum funding amount as a number, without symbols.                                                                                                                        |
| `funding_max`          | Number / Null | The maximum funding amount as a number, without symbols.                                                                                                                        |
| `funding_currency`     | String / Null | The 3-letter ISO currency code (e.g., `USD`, `EUR`).                                                                                                                            |
| `organization`         | String / Null | The full, official name of the funding organization. Acronyms are spelled out.                                                                                                  |
| `contact`              | String / Null | Relevant contact information (e.g., email address, contact page URL).                                                                                                           |
| `country`              | Array[String] | A list of relevant country names.                                                                                                                                               |
| `theme`                | Array[String] | A list of themes selected from a predefined list (e.g., `Labour Migration`, `Skills Development & Vocational Training`).                                                        |
| `organization_type`    | Array[String] | A list of eligible organization types (e.g., `Public bodies`, `Non-profit-making private entities`).                                                                            |
| `applicationProcess`   | Array[Object] | A list of key milestones. Each object has date (`YYYY-MM-DD` or `null`) and `description` (String).                                                                             |
| `implementationPeriod` | String / Null | The project's required duration as stated in the text (e.g., "24 months").                                                                                                      |
| `eligibleActivities`   | Array[String] | A list of strings describing supported activities and eligible costs.                                                                                                           |
| `fundingRestrictions`  | Array[String] | A list of strings describing ineligible costs or funding limitations.                                                                                                           |
| `proposal_summary`     | String        | A comprehensive narrative summary of the CfP's key details in a single paragraph.                                                                                               |
| `regions`              | Array[String] | Relevant regions (e.g. `"EU"`, `"Europe and Central Asia"`) as defined in `regionData.py`                                                                                       |
| `title`                | String / Null | The title of the proposal. As a first priority AI extracts the title from the document. If not found it tries to deduct the title. If that's also impossible it will use `null` |

### **Example AI Response**

Here is a full example of the JSON output:
```json
{  
  "eligible": false,  
  "exclusion_reason": "Deadline for submitting applications has passed (16 February 2021).",  
  "classification_summary": "This European Commission grant call (Asylum, Migration and Integration Fund, AMIF-2020-AG-CALL) supports transnational projects across six topics related to asylum, migration and integration. It is a grant-based funding instrument with a mandated co-financing component (up to 90% of eligible costs). The call requires minimum consortium sizes depending on topic, and includes provisions for international organisations as lead or co-applicants for certain topics. The first mandatory submission deadline has already passed, which makes aplicações ineligible at this time. The call is not procurement or a pure consultancy tender, and it requires eligible entities from multiple Member States (including the United Kingdom under the withdrawal arrangement) but not from Denmark. The International Labour Organization (ILO) would be eligible only for certain topics as an international organisation, not restricted to non-UN entities.",  
  "criteria": {  
    "ILO Eligibility": {  
      "status": "true",  
      "evidence": "International organisations are eligible for AMIF-2020-AG-CALL-04 and AMIF-2020-AG-CALL-06; lead applicants may include international organisations for these topics."  
    },  
    "Funding instrument is grant": {  
      "status": "true",  
      "evidence": "The call describes grant-based funding with grant agreements, co-financing rules, and related procedures."  
    },  
    "Grant size above threshold": {  
      "status": "true",  
      "evidence": "Per-topic grant ranges include minimums such as 300,000 EUR for some topics, well above the USD 50,000 threshold."  
    },  
    "Deadline is future": {  
      "status": "false",  
      "evidence": "Deadline for submitting applications is 16 February 2021, which is in the past relative to today."  
    },  
    "Is procurement or tender": {  
      "status": "false",  
      "evidence": "The document is a call for proposals for grants, not a procurement or consultancy tender."  
    },  
    "Requires cofinancing": {  
      "status": "true",  
      "evidence": "EU grant is limited to 90% of total eligible costs; co-financing is required."  
    },  
    "Requires specific accreditation": {  
      "status": "false",  
      "evidence": "No specific accreditation requirement is stated beyond standard eligibility criteria."  
    },  
    "Has consortium leadership rules": {  
      "status": "false",  
      "evidence": "Lead applicants may be public bodies, non-profit private entities, profit-making entities for certain topics, and international organisations for topics 04 and 06; no rule mandating a non-UN leadership."  
    },  
    "Applicant origin is restricted": {  
      "status": "false",  
      "evidence": "Eligible countries include EU member states (excluding Denmark) plus United Kingdom; UK entities are eligible due to the Withdrawal Agreement. Denmark is excluded."  
    }  
  },  
  "extracted_data": {  
    "deadline": "2021-02-16",  
    "deadline_text": "Deadline for submitting applications 16 February 2021 – 17:00 Brussels Time",  
    "funding_min": 300000,  
    "funding_max": 2000000,  
    "funding_currency": "EUR",  
    "organization": "European Commission",  
    "contact": "HOME-AMIF-UNIONACTIONS@ec.europa.eu",  
    "country": [  
      "Austria",  
      "Belgium",  
      "Bulgaria",  
      "Croatia",  
      "Cyprus",  
      "Czechia",  
      "United Kingdom",  
      "Estonia",  
      "Finland",  
      "France",  
      "Germany",  
      "Greece",  
      "Hungary",  
      "Ireland",  
      "Italy",  
      "Latvia",  
      "Lithuania",  
      "Luxembourg",  
      "Malta",  
      "Netherlands",  
      "Poland",  
      "Portugal",  
      "Romania",  
      "Slovakia",  
      "Slovenia",  
      "Spain",  
      "Sweden"  
    ],  
    "theme": [  
      "Labour Migration",  
      "Skills Development & Vocational Training",  
      "Social Protection",  
      "Working Conditions & Equality"  
    ],  
    "organization_type": [  
      "Public bodies",  
      "Non-profit-making private entities",  
      "Profit-making private entities",  
      "International organisations"  
    ],  
    "applicationProcess": [  
      {  
        "date": "2020-10-15",  
        "description": "Publication of the call"  
      },  
      {  
        "date": "2020-11-26",  
        "description": "Info sessions for potential applicants (webcast)"  
      },  
      {  
        "date": "2021-02-16",  
        "description": "Deadline for submitting applications"  
      },  
      {  
        "date": "2021-03-01",  
        "description": "Evaluation period (March–June 2021)"  
      },  
      {  
        "date": "2021-07-01",  
        "description": "Information to applicants"  
      },  
      {  
        "date": "2021-10-01",  
        "description": "Signature of grant agreement"  
      },  
      {  
        "date": "2021-12-01",  
        "description": "Provisional starting date of the action"  
      },  
      {  
        "date": "2022-01-31",  
        "description": "Kick-off meeting in Brussels – project coordinators"  
      }  
    ],  
    "implementationPeriod": "36 months",  
    "eligibleActivities": [  
      "Consultation activities for the design of the local integration strategy",  
      "Trainings, workshops and mutual learning activities",  
      "Technical assistance and peer review for setting up and implementing a local integration strategy",  
      "Transfer of knowledge activities between members of the partnership",  
      "Awareness raising activities and events",  
      "Creation of tools or platforms to disseminate know-how and best practices"  
    ],  
    "fundingRestrictions": [  
      "No financial support to third parties",  
      "EU grant covers up to 90 percent of total eligible costs; co-financing required"  
    ],  
    "proposal_summary": "The European Commission, through the Asylum, Migration and Integration Fund, calls for proposals under AMIF-2020-AG-CALL to support transnational actions across six topics ( AMIF-2020-AG-CALL-01 to \-06 ) aimed at improving local integration strategies, access to basic services for third-country nationals, migrant participation in policy design, complementary pathways for people in need of protection, support for victims of trafficking, and migrant children's transition to adulthood. Eligible countries include most European Union member states (excluding Denmark) with the United Kingdom also eligible due to the Brexit withdrawal arrangement. The total budget is around 32.7 million euros, with per-topic grant ranges (e.g., 300,000 to 600,000 EUR for several topics up to 2,000,000 EUR for others). Projects may last up to 36 months for topics 01, 02 and 04, and up to 24 months for topics 03, 05 and 06\. Applicants must form transnational consortia (minimum numbers vary by topic) and may include public authorities, non-profit private entities, profit-making entities for certain topics, and international organisations for topics 04 and 06\. The funding requires co-financing (up to 90 percent of eligible costs), and no financial support to third parties is allowed. The primary deadline for full proposals was 16 February 2021, and information sessions were held on 26 November 2020\. The call is not a procurement exercise; it is a grant program with evaluation based on relevance, quality, cost-effectiveness, European added value, and dissemination impact.",  
    "confidence_score": 0.65,  
    "regions": [  
      "EU",  
      "Europe and Central Asia"  
    ]  
  },  
  "confidence_score": 0.65  
}  
```
