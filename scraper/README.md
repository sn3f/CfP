# Scraper

## Run with Gradle

Execute below to ran scraping, `--jsonMessage` and `--outputDir` supported, by default scrapes [MPTF](https://mptf.undp.org/page/funding-call-proposals):

`./gradlew runJarWithDebug`

## Run from CLI

### Direct CFP URL Template

Run scraper on specific <URL> using optional <OPTIONAL_SELECTOR>.

```
java -jar build/libs/scraper-0.1.0-SNAPSHOT.jar \
    --mode=run-target \
    --jsonMessage='{"executionId": "cli", "rootUri": "<URL>", "steps": [{"name":"step-0","operation":"VISIT","configuration":{"content-selector": "<OPTIONAL_SELECTOR>","scrap-attachments":"true"}},{"name":"step-1","operation":"SCRAP","configuration":{}}] }' \
    --outputDir=build/tmp/worker-output/direct-cfp
```

### EU Funding & Tenders Portal - Cross-border renewable energy works projects
https://ec.europa.eu/info/funding-tenders/opportunities/portal/screen/opportunities/topic-details/CEF-E-2026-CBRENEW-WORKS
```
java -jar build/libs/scraper-0.1.0-SNAPSHOT.jar \
    --mode=run-target \
    --jsonMessage='{"executionId": "cli", "rootUri": "https://ec.europa.eu/info/funding-tenders/opportunities/portal/screen/opportunities/topic-details/CEF-E-2026-CBRENEW-WORKS", "steps": [{"name":"step-0","operation":"VISIT","configuration":{"content-selector": "sedia-page-columns > div > div:nth-child(2) > div:nth-child(1), sedia-page-columns > div > div:nth-child(2) > div:nth-child(2), sedia-page-columns > div > div:nth-child(2) > div:nth-child(3), sedia-page-columns > div > div:nth-child(2) > div:nth-child(4)","scrap-attachments":"true"}},{"name":"step-1","operation":"SCRAP","configuration":{"follow-links":"false"}}] }' \
    --outputDir=build/tmp/worker-output/one-ec-europa
```
```json
{
  "steps": [
    {
      "name": "step-0",
      "operation": "VISIT",
      "configuration": {
        "content-selector": "sedia-page-columns > div > div:nth-child(2) > div:nth-child(1), sedia-page-columns > div > div:nth-child(2) > div:nth-child(2), sedia-page-columns > div > div:nth-child(2) > div:nth-child(3), sedia-page-columns > div > div:nth-child(2) > div:nth-child(4)",
        "scrap-attachments": "true"
      }
    },
    {
      "name": "step-1",
      "operation": "SCRAP",
      "configuration": {}
    }
  ]
}
```

### EU Funding & Tenders Portal - Forthcoming and Open for Submission
https://ec.europa.eu/info/funding-tenders/opportunities/portal/screen/opportunities/calls-for-proposals?order=DESC&pageNumber=1&pageSize=50&sortBy=startDate&isExactMatch=true&status=31094501,31094502
```
java -jar build/libs/scraper-0.1.0-SNAPSHOT.jar \
    --mode=run-target \
    --jsonMessage='{"executionId": "cli", "rootUri": "https://ec.europa.eu/info/funding-tenders/opportunities/portal/screen/opportunities/calls-for-proposals?order=DESC&pageNumber=1&pageSize=50&sortBy=startDate&isExactMatch=true&status=31094501,31094502", "steps":[{"name":"step-0","operation":"ITERATOR","configuration":{"item-selector":"eui-card","next-page-selector":"eui-paginator > div > div > button:has(span > eui-icon-svg[icon='eui-caret-right'])"}},{"name":"step-1","operation":"VISIT","configuration":{"content-selector":"sedia-page-columns > div > div:nth-child(2) > div:nth-child(1), sedia-page-columns > div > div:nth-child(2) > div:nth-child(2), sedia-page-columns > div > div:nth-child(2) > div:nth-child(3), sedia-page-columns > div > div:nth-child(2) > div:nth-child(4)","scrap-attachments":"true"}},{"name":"step-2","operation":"SCRAP","configuration":{}}]}' \
    --outputDir=build/tmp/worker-output/ec-europa
```
```json
{
  "steps": [
    {
      "name": "step-0",
      "operation": "ITERATOR",
      "configuration": {
        "item-selector": "eui-card",
        "next-page-selector": "eui-paginator > div > div > button:has(span > eui-icon-svg[icon='eui-caret-right'])"
      }
    },
    {
      "name": "step-1",
      "operation": "VISIT",
      "configuration": {
        "content-selector": "sedia-page-columns > div > div:nth-child(2) > div:nth-child(1), sedia-page-columns > div > div:nth-child(2) > div:nth-child(2), sedia-page-columns > div > div:nth-child(2) > div:nth-child(3), sedia-page-columns > div > div:nth-child(2) > div:nth-child(4)",
        "scrap-attachments": "true"
      }
    },
    {
      "name": "step-2",
      "operation": "SCRAP",
      "configuration": {}
    }
  ]
}
```

### European Union External Action - Ongoing grants
https://www.eeas.europa.eu/eeas/grants_en?f%5B0%5D=grant_status%3Aongoing

*Needs click events dispatched, not clicked - this slows down page iteration.*

*Needs slowing down - +126/225*

```
java -jar build/libs/scraper-0.1.0-SNAPSHOT.jar \
    --mode=run-target \
    --jsonMessage='{"executionId": "cli","rootUri": "https://www.eeas.europa.eu/eeas/grants_en?f%5B0%5D=grant_status%3Aongoing", "steps": [{"name": "step-0", "operation": "ITERATOR", "configuration": { "item-selector": "div.view-content > div > div[class*='card']", "next-page-selector": "li[class*='pager__item--next'] > a" }}, {"name": "step-1", "operation": "VISIT", "configuration": {"throttle-ms":"60000", "scrap-attachments": "true"}}, { "name": "step-2", "operation": "SCRAP", "configuration": { "follow-links": "false" } }]}' \
    --outputDir=build/tmp/worker-output/eeas
```
```json
{
  "steps": [
    {
      "name": "step-0",
      "operation": "ITERATOR",
      "configuration": {
        "item-selector": "div.view-content > div > div[class*='card']",
        "next-page-selector": "li[class*='pager__item--next'] > a"
      }
    },
    {
      "name": "step-1",
      "operation": "VISIT",
      "configuration": {
        "throttle-ms": "60000",
        "content-selector": "#block-eeas-website-content > article > div > section > div > div > div > div > div[class*=card-body]",
        "scrap-attachments": "true"
      }
    },
    {
      "name": "step-2",
      "operation": "SCRAP",
      "configuration": {}
    }
  ]
}
```

### African Development Bank Group - Initiatives and partnerships
https://www.afdb.org/en/topics-and-sectors/initiatives-partnerships

*Cloudflare present*

```
java -jar build/libs/scraper-0.1.0-SNAPSHOT.jar \
    --mode=run-target \
    --jsonMessage='{"executionId": "cli","rootUri": "https://www.afdb.org/en/topics-and-sectors/initiatives-partnerships", "steps": [{"name": "step-0", "operation": "ITERATOR", "configuration": {"item-selector": "#block-afdb-book-menu-afdb-book-menu > ul > li.has-child > ul > li:nth-child(n)"}}, {"name": "step-1", "operation": "CRAWLER", "configuration": {"max-depth": 3, "page-text-query": "Call for Proposals.", "page-score-threshold": "0.4", "url-text-query": "Call for Proposals.", "url-score-threshold": "0.4"}}, {"name": "step-2", "operation": "SCRAP", "configuration": {"follow-links": "false"}}] }' \
    --outputDir=build/tmp/worker-output/afdb
```
```json
{
  "steps": [
    {
      "name": "step-0",
      "operation": "ITERATOR",
      "configuration": {
        "item-selector": "#block-afdb-book-menu-afdb-book-menu > ul > li.has-child > ul > li:nth-child(n)"
      }
    },
    {
      "name": "step-1",
      "operation": "CRAWLER",
      "configuration": {
        "max-depth": 3,
        "page-text-query": "Call for Proposals.",
        "page-score-threshold": "0.4",
        "url-text-query": "Call for Proposals.",
        "url-score-threshold": "0.4"
      }
    },
    {
      "name": "step-2",
      "operation": "SCRAP",
      "configuration": {}
    }
  ]
}
```

### World Bank Group - Current Business Opportunities
https://projects.worldbank.org/en/projects-operations/opportunities?srce=both
```
java -jar build/libs/scraper-0.1.0-SNAPSHOT.jar \
    --mode=run-target \
    --jsonMessage='{"executionId": "cli","rootUri": "https://projects.worldbank.org/en/projects-operations/opportunities?srce=both", "steps": [{"name":"step-0","operation":"ITERATOR","configuration":{"item-selector":"div[class*='projects_list'] > div > div > table > tbody > tr:nth-child(n)","next-page-selector":"div > ul > li:has(> a > i[class*='fa-angle-right']) > a:has(i:only-child)"}},{"name":"step-1","operation":"VISIT","configuration":{"content-selector":"body > div.par","throttle-ms":"10000","scrap-attachments":"true"}},{"name":"step-2","operation":"SCRAP","configuration":{"follow-links":"true"}}] }' \
    --outputDir=build/tmp/worker-output/worldbank
```
```json
{
  "steps": [
    {
      "name": "step-0",
      "operation": "ITERATOR",
      "configuration": {
        "item-selector": "div[class*='projects_list'] > div > div > table > tbody > tr:nth-child(n)",
        "next-page-selector": "div > ul > li:has(> a > i[class*='fa-angle-right']) > a:has(i:only-child)"
      }
    },
    {
      "name": "step-1",
      "operation": "VISIT",
      "configuration": {
        "throttle-ms": "10000",
        "scrap-attachments": "true"
      }
    },
    {
      "name": "step-2",
      "operation": "SCRAP",
      "configuration": {}
    }
  ]
}
```

### UN Multi-Partner Trust Fund Office - Funding call for proposals
https://mptf.undp.org/page/funding-call-proposals
```
java -jar build/libs/scraper-0.1.0-SNAPSHOT.jar \
    --mode=run-target \
    --jsonMessage='{"executionId": "cli","rootUri": "https://mptf.undp.org/page/funding-call-proposals", "steps": [{"name": "step-0", "operation": "ITERATOR", "configuration": { "item-selector": "div[class*='bs_grid']:nth-child(n)"}}, { "name": "step-1", "operation": "SCRAP", "configuration": { "follow-links": "false" } }]}' \
    --outputDir=build/tmp/worker-output/mptf
```
```json
{
  "steps": [
    {
      "name": "step-0",
      "operation": "ITERATOR",
      "configuration": {
        "item-selector": "div[class*='bs_grid']",
        "scrap-attachments": "true"
      }
    },
    {
      "name": "step-1",
      "operation": "SCRAP",
      "configuration": {}
    }
  ]
}
```

### Grants.gov - Search Grants
https://www.grants.gov/search-grants
```
java -jar build/libs/scraper-0.1.0-SNAPSHOT.jar \
    --mode=run-target \
    --jsonMessage='{"executionId": "cli","rootUri": "https://www.grants.gov/search-grants", "steps": [{"name":"step-0","operation":"ITERATOR","configuration":{"item-selector":"div[class*='usa-table-container--scrollable'] > table > tbody > tr","next-page-selector":"nav > ul > li[class*='usa-pagination__arrow']:last-child > a[class*='usa-pagination__previous-page']"}},{"name":"step-1","operation":"VISIT","configuration":{"throttle-ms":"10000","content-selector": "#opportunity-container","scrap-attachments": "true"}},{"name":"step-2","operation":"SCRAP","configuration":{"follow-links":"false"}}] }' \
    --outputDir=build/tmp/worker-output/grants-gov
```
```json
{
  "steps": [
    {
      "name": "step-0",
      "operation": "ITERATOR",
      "configuration": {
        "item-selector": "div[class*='usa-table-container--scrollable'] > table > tbody > tr",
        "next-page-selector": "nav > ul > li[class*='usa-pagination__arrow']:last-child > a[class*='usa-pagination__previous-page']"
      }
    },
    {
      "name": "step-1",
      "operation": "VISIT",
      "configuration": {
        "throttle-ms": "10000",
        "content-selector": "#opportunity-container",
        "scrap-attachments": "true"
      }
    },
    {
      "name": "step-2",
      "operation": "SCRAP",
      "configuration": {}
    }
  ]
}
```

### Investing in rural people - Call For Proposals
https://www.ifad.org/en/call-for-proposals
```
java -jar build/libs/scraper-0.1.0-SNAPSHOT.jar \
    --mode=run-target \
    --jsonMessage='{"executionId": "cli","rootUri": "https://www.ifad.org/en/call-for-proposals", "steps": [{"name": "step-0", "operation": "ITERATOR", "configuration": { "item-selector": "div.general-feature-card", "next-page-selector": "ul[class*='\''pagination'\''] > li:last-child > a" }}, { "name": "step-1", "operation": "SCRAP", "configuration": { "follow-links": "false" } }]}' \
    --outputDir=build/tmp/worker-output/ifad
```
```json
{
  "steps": [
    {
      "name": "step-0",
      "operation": "ITERATOR",
      "configuration": {
        "item-selector": "div.general-feature-card",
        "next-page-selector": "ul[class*='pagination'] > li:last-child > a"
      }
    },
    {
      "name": "step-1",
      "operation": "VISIT",
      "configuration": {
        "throttle-ms": "10000",
        "content-selector": "div[class=component-html]",
        "scrap-attachments": "true"
      }
    },
    {
      "name": "step-2",
      "operation": "SCRAP",
      "configuration": {}
    }
  ]
}
```

### UK PACT - Apply now
https://www.ukpact.co.uk/apply-now


```
java -jar build/libs/scraper-0.1.0-SNAPSHOT.jar \
    --mode=run-target \
    --jsonMessage='{"executionId": "cli","rootUri": "https://www.ukpact.co.uk/apply-now", "steps": [{"name":"step-0","operation":"ITERATOR","configuration":{"item-selector":"div.section__story--container"}},{"name":"step-1","operation":"CRAWLER","configuration":{"max-depth":1,"page-text-query":"Call for Proposals.","page-score-threshold":"0.4","url-text-query":"Call for Proposals.","url-score-threshold":"0.4"}},{"name":"step-2","operation":"SCRAP","configuration":{"follow-links":"false"}}] }' \
    --outputDir=build/tmp/worker-output/uk-pact
```
```json
{
  "steps": [
    {
      "name": "step-0",
      "operation": "ITERATOR",
      "configuration": {
        "item-selector": "div.section__story--container"
      }
    },
    {
      "name": "step-1",
      "operation": "VISIT",
      "configuration": {
        "throttle-ms": "10000",
        "scrap-attachments": "true"
      }
    },
    {
      "name": "step-2",
      "operation": "SCRAP",
      "configuration": {}
    }
  ]
}
```

### Joint SDG Fund - Explore Opportunities
https://invest.jointsdgfund.org/#opportunities

*Infinite scroll.*
*Are there CfPs?*

```
java -jar build/libs/scraper-0.1.0-SNAPSHOT.jar \
    --mode=run-target \
    --jsonMessage='{"executionId": "cli","rootUri": "https://invest.jointsdgfund.org/#opportunities", "steps": [{"name":"step-0","operation":"ITERATOR","configuration":{"item-selector":"#main > div.elementor.elementor-9 > div.elementor-element > div > div > div:nth-child(2):has(> div:nth-of-type(3):last-of-type)"}},{"name":"step-1","operation":"VISIT","configuration":{"throttle-ms":"10000"}},{"name":"step-2","operation":"SCRAP","configuration":{"follow-links":"false"}}] }' \
    --outputDir=build/tmp/worker-output/jointsdgfund
```
```json
{
  "steps": [
    {
      "name": "step-0",
      "operation": "ITERATOR",
      "configuration": {
        "item-selector": "#main > div.elementor.elementor-9 > div.elementor-element > div > div > div:nth-child(2):has(> div:nth-of-type(3):last-of-type)"
      }
    },
    {
      "name": "step-1",
      "operation": "VISIT",
      "configuration": {
        "throttle-ms": "10000",
        "scrap-attachments": "true"
      }
    },
    {
      "name": "step-2",
      "operation": "SCRAP",
      "configuration": {}
    }
  ]
}
```

### United Kingdom - gov.uk
https://www.gov.uk/international-development-funding?fund_state%5B%5D=open

```
java -jar build/libs/scraper-0.1.0-SNAPSHOT.jar \
    --mode=run-target \
    --jsonMessage='{"executionId": "cli","rootUri": "https://www.gov.uk/international-development-funding?fund_state%5B%5D=open", "steps": [{"name":"step-0","operation":"ITERATOR","configuration":{"item-selector":"#js-results > div > ul > li:nth-child(n)"}},{"name":"step-1","operation":"VISIT","configuration":{"throttle-ms":"10000"}},{"name":"step-2","operation":"SCRAP","configuration":{"follow-links":"false"}}] }' \
    --outputDir=build/tmp/worker-output/gov-uk
```
```json
{
  "steps": [
    {
      "name": "step-0",
      "operation": "ITERATOR",
      "configuration": {
        "item-selector": "#js-results > div > ul > li:nth-child(n)"
      }
    },
    {
      "name": "step-1",
      "operation": "VISIT",
      "configuration": {
        "throttle-ms": "10000"
      }
    },
    {
      "name": "step-2",
      "operation": "SCRAP",
      "configuration": {}
    }
  ]
}
```

### Apply to the Resilient, Inclusive and Sustainable Environments
https://genderandenvironment.org/rise-challenge/call/

```
java -jar build/libs/scraper-0.1.0-SNAPSHOT.jar \
    --mode=run-target \
    --jsonMessage='{"executionId": "cli","rootUri": "https://genderandenvironment.org/rise-challenge/call/", "steps": [{"name":"step-1","operation":"VISIT","configuration":{"throttle-ms":"10000"}},{"name":"step-2","operation":"SCRAP","configuration":{"follow-links":"false"}}] }' \
    --outputDir=build/tmp/worker-output/rise-challenge
```
```json
{
  "steps": [
    {
      "name": "step-1",
      "operation": "VISIT",
      "configuration": {
        "throttle-ms": "10000"
      }
    },
    {
      "name": "step-2",
      "operation": "SCRAP",
      "configuration": {}
    }
  ]
}
```

### We-Fi's 6th Round of Funding to Support Women Entrepreneurs in the Care Economy
https://we-fi.org/sixth-funding-call/

```
java -jar build/libs/scraper-0.1.0-SNAPSHOT.jar \
    --mode=run-target \
    --jsonMessage='{"executionId": "cli","rootUri": "https://we-fi.org/sixth-funding-call/", "steps": [{"name":"step-1","operation":"VISIT","configuration":{"throttle-ms":"10000"}},{"name":"step-2","operation":"SCRAP","configuration":{"follow-links":"false"}}] }' \
    --outputDir=build/tmp/worker-output/we-fi-6th-round
```
```json
{
  "steps": [
    {
      "name": "step-1",
      "operation": "VISIT",
      "configuration": {
        "throttle-ms": "10000"
      }
    },
    {
      "name": "step-2",
      "operation": "SCRAP",
      "configuration": {}
    }
  ]
}
```

### Norad - Open Calls
https://grants.mfa.no/#calls/opencalls

```
java -jar build/libs/scraper-0.1.0-SNAPSHOT.jar \
    --mode=run-target \
    --jsonMessage='{"executionId": "cli","rootUri": "https://grants.mfa.no/#calls/opencalls", "steps": [{"name":"step-0","operation":"ITERATOR","configuration":{"item-selector":"#main > div > div.row.mb-3 > div > div > div > div > table > tbody > tr"}},{"name":"step-1","operation":"VISIT","configuration":{"throttle-ms":"10000","scrap-attachments":"true"}},{"name":"step-2","operation":"SCRAP","configuration":{"follow-links":"false"}}] }' \
    --outputDir=build/tmp/worker-output/norad
```
```json
{
  "steps": [
    {
      "name": "step-0",
      "operation": "ITERATOR",
      "configuration": {
        "item-selector": "#main > div > div.row.mb-3 > div > div > div > div > table > tbody > tr"
      }
    },
    {
      "name": "step-1",
      "operation": "VISIT",
      "configuration": {
        "throttle-ms": "10000",
        "scrap-attachments": "true"
      }
    },
    {
      "name": "step-2",
      "operation": "SCRAP",
      "configuration": {}
    }
  ]
}
```

### Norad - Call for proposals
https://www.norad.no/en/for-partners/guides-and-tools/calls-for-proposals2/?tab=active&page=1

```
java -jar build/libs/scraper-0.1.0-SNAPSHOT.jar \
    --mode=run-target \
    --jsonMessage='{"executionId": "cli","rootUri": "https://www.norad.no/en/for-partners/guides-and-tools/calls-for-proposals2/?tab=active&page=1", "steps": [{"name":"step-0","operation":"ITERATOR","configuration":{"item-selector":"li[class*='\''list-item-call-for-proposals-norad'\'']"}},{"name":"step-1","operation":"VISIT","configuration":{"throttle-ms":"10000","scrap-attachments":"true"}},{"name":"step-2","operation":"SCRAP","configuration":{"follow-links":"false"}}] }' \
    --outputDir=build/tmp/worker-output/norad-2
```
```json
{
  "steps": [
    {
      "name": "step-0",
      "operation": "ITERATOR",
      "configuration": {
        "item-selector": "li[class*='list-item-call-for-proposals-norad ']"
      }
    },
    {
      "name": "step-1",
      "operation": "VISIT",
      "configuration": {
        "throttle-ms": "10000",
        "scrap-attachments": "true"
      }
    },
    {
      "name": "step-2",
      "operation": "SCRAP",
      "configuration": {}
    }
  ]
}
```

### Um.dk - Tematiske NGO runder
https://um.dk/danida/samarbejspartnere/civ-org/stoetteform/tematiske-ngo-runder

```
java -jar build/libs/scraper-0.1.0-SNAPSHOT.jar \
    --mode=run-target \
    --jsonMessage='{"executionId": "cli","rootUri": "https://um.dk/danida/samarbejspartnere/civ-org/stoetteform/tematiske-ngo-runder", "steps": [{"name":"step-0","operation":"ITERATOR","configuration":{"item-selector":"#ContentZone > div > div > div > div > div > div > ul > li:nth-child(n)"}},{"name":"step-1","operation":"VISIT","configuration":{"throttle-ms":"10000"}},{"name":"step-2","operation":"SCRAP","configuration":{"follow-links":"false"}}] }' \
    --outputDir=build/tmp/worker-output/um-dk
```
```json
{
  "steps": [
    {
      "name": "step-0",
      "operation": "ITERATOR",
      "configuration": {
        "item-selector": "#ContentZone > div > div > div > div > div > div > ul > li:nth-child(n)"
      }
    },
    {
      "name": "step-1",
      "operation": "VISIT",
      "configuration": {
        "throttle-ms": "10000",
        "scrap-attachments": "true"
      }
    },
    {
      "name": "step-2",
      "operation": "SCRAP",
      "configuration": {}
    }
  ]
}
```

### Australian Gov
https://www.tenders.gov.au/atm?filter=published&orderBy=&Number=&Keyword=DFAT

```
java -jar build/libs/scraper-0.1.0-SNAPSHOT.jar \
    --mode=run-target \
    --jsonMessage='{"executionId": "cli","rootUri": "https://www.tenders.gov.au/atm?filter=published&orderBy=&Number=&Keyword=DFAT", "steps": [{"name":"step-0","operation":"ITERATOR","configuration":{"item-selector":"#mainContent > div > div:nth-child(11) > div > div:nth-child(n)"}},{"name":"step-1","operation":"VISIT","configuration":{"throttle-ms":"10000"}},{"name":"step-2","operation":"SCRAP","configuration":{"follow-links":"false"}}] }' \
    --outputDir=build/tmp/worker-output/aus-gov
```
```json
{
  "steps": [
    {
      "name": "step-0",
      "operation": "ITERATOR",
      "configuration": {
        "item-selector": "#mainContent > div > div:nth-child(11) > div > div:nth-child(n)"
      }
    },
    {
      "name": "step-1",
      "operation": "VISIT",
      "configuration": {
        "throttle-ms": "10000"
      }
    },
    {
      "name": "step-2",
      "operation": "SCRAP",
      "configuration": {}
    }
  ]
}
```

### Haeavustuksia

```
java -jar build/libs/scraper-0.1.0-SNAPSHOT.jar \
    --mode=run-target \
    --jsonMessage='{"executionId": "cli","rootUri": "https://www.haeavustuksia.fi/en/", "steps":[{"name":"step-0","operation":"ITERATOR","configuration":{"item-selector":"#content-main > div > div > ul > li:nth-child(n)","next-page-selector":"#haku-haku-list-pagination-bottom > div.flex > button:nth-child(3)"}},{"name":"step-1","operation":"VISIT","configuration":{"throttle-ms":"10000","scrap-attachments":"true"}},{"name":"step-2","operation":"SCRAP","configuration":{}}] }' \
    --outputDir=build/tmp/worker-output/haeavustuksia
```
```json
{
  "steps": [
    {
      "name": "step-0",
      "operation": "ITERATOR",
      "configuration": {
        "item-selector": "#content-main > div > div > ul > li:nth-child(n)",
        "next-page-selector": "#haku-haku-list-pagination-bottom > div.flex > button:nth-child(3)"
      }
    },
    {
      "name": "step-1",
      "operation": "VISIT",
      "configuration": {
        "throttle-ms": "10000",
        "scrap-attachments": "true"
      }
    },
    {
      "name": "step-2",
      "operation": "SCRAP",
      "configuration": {}
    }
  ]
}
```

### CAF - Calls

```
java -jar build/libs/scraper-0.1.0-SNAPSHOT.jar \
    --mode=run-target \
    --jsonMessage='{"executionId": "cli","rootUri": "https://www.caf.com/en/work-with-us/calls/?from=&to=&enrollment=open", "steps":[{"name":"step-0","operation":"ITERATOR","configuration":{"item-selector":"body > main > section:nth-child(1) > div > article:nth-child(n)","next-page-selector":"section[class*=pagination] > div > p > a"}},{"name":"step-1","operation":"VISIT","configuration":{"throttle-ms":"10000","scrap-attachments":"true"}},{"name":"step-2","operation":"SCRAP","configuration":{}}] }' \
    --outputDir=build/tmp/worker-output/caf
```
```json
{
  "steps": [
    {
      "name": "step-0",
      "operation": "ITERATOR",
      "configuration": {
        "item-selector": "body > main > section:nth-child(1) > div > article:nth-child(n)",
        "next-page-selector": "section[class*=pagination] > div > p > a"
      }
    },
    {
      "name": "step-1",
      "operation": "VISIT",
      "configuration": {
        "throttle-ms": "10000",
        "scrap-attachments": "true"
      }
    },
    {
      "name": "step-2",
      "operation": "SCRAP",
      "configuration": {}
    }
  ]
}
```

### AICS

```
java -jar build/libs/scraper-0.1.0-SNAPSHOT.jar \
    --mode=run-target \
    --jsonMessage='{"executionId": "cli","rootUri": "https://aics.portaleamministrazionetrasparente.it/pagina952_bandi.html", "steps":[{"name":"step-0","operation":"ITERATOR","configuration":{"item-selector":"#regola_default > div > div > section > div > table > tbody > tr > td:nth-child(2) > div","next-page-selector":"#regola_default > div > div > section > div > a:last-child"}},{"name":"step-1","operation":"VISIT","configuration":{"content-selector": "#contenuto_automatico","throttle-ms":"10000","scrap-attachments":"true"}},{"name":"step-2","operation":"SCRAP","configuration":{}}] }' \
    --outputDir=build/tmp/worker-output/aics
```
```json
{
  "steps": [
    {
      "name": "step-0",
      "operation": "ITERATOR",
      "configuration": {
        "item-selector": "#regola_default > div > div > section > div > table > tbody > tr > td:nth-child(2) > div",
        "next-page-selector": "#regola_default > div > div > section > div > a:last-child"
      }
    },
    {
      "name": "step-1",
      "operation": "VISIT",
      "configuration": {
        "content-selector": "#contenuto_automatico",
        "throttle-ms": "30000",
        "scrap-attachments":"true"
      }
    },
    {
      "name": "step-2",
      "operation": "SCRAP",
      "configuration": {}
    }
  ]
}
```

### ADB

```
java -jar build/libs/scraper-0.1.0-SNAPSHOT.jar \
    --mode=run-target \
    --jsonMessage='{"executionId": "cli","rootUri": "https://www.adb.org/projects/tenders/group/goods/status/active-1576", "steps": [{"name":"step-0","operation":"ITERATOR","configuration":{"item-selector":"body > div.dialog-off-canvas-main-canvas > div > div.adb-main-wrapper > main > article > div > div > div.list > div:nth-child(n)","next-page-selector":"body > div.dialog-off-canvas-main-canvas > div > div.adb-main-wrapper > main > article > div > div > nav > ul > li.pager__item.pager__item--next > a"}},{"name":"step-1","operation":"VISIT","configuration":{"throttle-ms":"10000"}},{"name":"step-2","operation":"SCRAP","configuration":{"follow-links":"false"}}] }' \
    --outputDir=build/tmp/worker-output/adb
```
```json
{
  "steps": [
    {
      "name": "step-0",
      "operation": "ITERATOR",
      "configuration": {
        "item-selector": "body > div.dialog-off-canvas-main-canvas > div > div.adb-main-wrapper > main > article > div > div > div.list > div:nth-child(n)",
        "next-page-selector": "body > div.dialog-off-canvas-main-canvas > div > div.adb-main-wrapper > main > article > div > div > nav > ul > li.pager__item.pager__item--next > a"
      }
    },
    {
      "name": "step-1",
      "operation": "VISIT",
      "configuration": {
        "throttle-ms": "10000"
      }
    },
    {
      "name": "step-2",
      "operation": "SCRAP",
      "configuration": {}
    }
  ]
}
```

### EIB

```
java -jar build/libs/scraper-0.1.0-SNAPSHOT.jar \
    --mode=run-target \
    --jsonMessage='{"executionId": "cli","rootUri": "https://www.eib.org/en/about/procurement/all/index.htm?q=&sortColumn=configuration.contentStart&sortDir=desc&pageNumber=0&itemPerPage=25&pageable=true&la=EN&deLa=EN&yearTo=&orYearTo=true&yearFrom=&orYearFrom=true&procurementStatus=onGoing&or_g_procurementInformations_type=true", "steps": [{"name":"step-0","operation":"ITERATOR","configuration":{"item-selector":"#mainlist > article:nth-child(n)","next-page-selector":"a[class*=nextPagination]"}},{"name":"step-1","operation":"VISIT","configuration":{"throttle-ms":"10000"}},{"name":"step-2","operation":"SCRAP","configuration":{"follow-links":"false"}}] }' \
    --outputDir=build/tmp/worker-output/eib
```
```json
{
  "steps": [
    {
      "name": "step-0",
      "operation": "ITERATOR",
      "configuration": {
        "item-selector": "#mainlist > article:nth-child(n)",
        "next-page-selector": "a[class*=nextPagination]"
      }
    },
    {
      "name": "step-1",
      "operation": "VISIT",
      "configuration": {
        "throttle-ms": "10000"
      }
    },
    {
      "name": "step-2",
      "operation": "SCRAP",
      "configuration": {}
    }
  ]
}
```

### EBRD

```
java -jar build/libs/scraper-0.1.0-SNAPSHOT.jar \
    --mode=run-target \
    --jsonMessage='{"executionId": "cli","rootUri": "https://www.ebrd.com/home/work-with-us/project-procurement/procurement-notices.html", "steps": [{"name":"step-0","operation":"ITERATOR","configuration":{"item-selector":"div[class*=procurement-notices-card]"}},{"name":"step-1","operation":"VISIT","configuration":{"throttle-ms":"10000","scrap-attachments":true}},{"name":"step-2","operation":"SCRAP","configuration":{}}] }' \
    --outputDir=build/tmp/worker-output/ebrd
```
```json
{
  "steps": [
    {
      "name": "step-0",
      "operation": "ITERATOR",
      "configuration": {
        "item-selector": "div[class*=procurement-notices-card]"
      }
    },
    {
      "name": "step-1",
      "operation": "VISIT",
      "configuration": {
        "throttle-ms": "10000",
        "scrap-attachments": true
      }
    },
    {
      "name": "step-2",
      "operation": "SCRAP",
      "configuration": {}
    }
  ]
}
```

### IsDB - Project Procurement: Tenders

```
java -jar build/libs/scraper-0.1.0-SNAPSHOT.jar \
    --mode=run-target \
    --jsonMessage='{"executionId": "cli","rootUri": "https://www.isdb.org/project-procurement/tenders?loc=&tender_type=&status=active", "steps": [{"name":"step-0","operation":"ITERATOR","configuration":{"item-selector":"div[class*=views-row]","next-page-selector":"li[class*=pager__item--next] > a"}},{"name":"step-1","operation":"VISIT","configuration":{"throttle-ms":"10000","content-selector": "div > main","scrap-attachments": true}},{"name":"step-2","operation":"SCRAP","configuration":{}}] }' \
    --outputDir=build/tmp/worker-output/isdb
```
```json
{
  "steps": [
    {
      "name": "step-0",
      "operation": "ITERATOR",
      "configuration": {
        "item-selector": "div[class*=views-row]",
        "next-page-selector": "li[class*=pager__item--next] > a"
      }
    },
    {
      "name": "step-1",
      "operation": "VISIT",
      "configuration": {
        "throttle-ms": "10000",
        "content-selector": "div > main",
        "scrap-attachments": true
      }
    },
    {
      "name": "step-2",
      "operation": "SCRAP",
      "configuration": {}
    }
  ]
}
```

### AfD

```
java -jar build/libs/scraper-0.1.0-SNAPSHOT.jar \
    --mode=run-target \
    --jsonMessage='{"executionId": "cli","rootUri": "https://www.afd.fr/en/calls-for-projects/list?status%5Bongoing%5D=ongoing&status%5Bsoon%5D=soon", "steps":[{"name":"step-0","operation":"ITERATOR","configuration":{"item-selector":"div[class*=views-row]","next-page-selector":"a[class*=fr-pagination__link--next]"}},{"name":"step-1","operation":"VISIT","configuration":{"throttle-ms":"10000","scrap-attachments":true}},{"name":"step-2","operation":"SCRAP","configuration":{}}] }' \
    --outputDir=build/tmp/worker-output/afd
```
```json
{
  "steps": [
    {
      "name": "step-0",
      "operation": "ITERATOR",
      "configuration": {
        "item-selector": "div[class*=views-row]",
        "next-page-selector": "a[class*=fr-pagination__link--next]"
      }
    },
    {
      "name": "step-1",
      "operation": "VISIT",
      "configuration": {
        "throttle-ms": "10000",
        "scrap-attachments": true
      }
    },
    {
      "name": "step-2",
      "operation": "SCRAP",
      "configuration": {}
    }
  ]
}
```

### IKI Find funding

```
java -jar build/libs/scraper-0.1.0-SNAPSHOT.jar \
    --mode=run-target \
    --jsonMessage='{"executionId": "cli","rootUri": "https://www.international-climate-initiative.com/en/find-funding/", "steps":[{"name":"step-0","operation":"ITERATOR","configuration":{"item-selector":"div:has( > a.c-button.c-button--sec4)"}},{"name":"step-1","operation":"VISIT","configuration":{"throttle-ms":"10000","scrap-attachments":"true"}},{"name":"step-2","operation":"SCRAP","configuration":{}}] }' \
    --outputDir=build/tmp/worker-output/iki-find-funding
```
```json
{
  "steps": [
    {
      "name": "step-0",
      "operation": "ITERATOR",
      "configuration": {
        "item-selector": "div:has( > a.c-button.c-button--sec4)"
      }
    },
    {
      "name": "step-1",
      "operation": "VISIT",
      "configuration": {
        "throttle-ms": "10000",
        "scrap-attachments": "true"
      }
    },
    {
      "name": "step-2",
      "operation": "SCRAP",
      "configuration": {}
    }
  ]
}
```

### Canada - Funding opportunities for international assistance

```
java -jar build/libs/scraper-0.1.0-SNAPSHOT.jar \
    --mode=run-target \
    --jsonMessage='{"executionId": "cli","rootUri": "https://www.international.gc.ca/world-monde/funding-financement/open_calls-appels_ouverts.aspx?lang=eng#a1", "steps":[{"name":"step-0","operation":"ITERATOR","configuration":{"item-selector":"main > table:nth-of-type(1) > tbody > tr > td:nth-child(1)"}},{"name":"step-1","operation":"VISIT","configuration":{"throttle-ms":"10000","scrap-attachments":"true"}},{"name":"step-2","operation":"SCRAP","configuration":{}}]  }' \
    --outputDir=build/tmp/worker-output/canada-international
```
```json
{
  "steps": [
    {
      "name": "step-0",
      "operation": "ITERATOR",
      "configuration": {
        "item-selector": "main > table:nth-of-type(1) > tbody > tr > td:nth-child(1)"
      }
    },
    {
      "name": "step-1",
      "operation": "VISIT",
      "configuration": {
        "throttle-ms": "10000",
        "scrap-attachments": "true"
      }
    },
    {
      "name": "step-2",
      "operation": "SCRAP",
      "configuration": {}
    }
  ]
}
```

### Fundsforngos - First page Only

```
java -jar build/libs/scraper-0.1.0-SNAPSHOT.jar \
    --mode=run-target \
    --jsonMessage='{"executionId": "cli","rootUri": "https://www2.fundsforngos.org/", "steps":[{"name":"step-0","operation":"ITERATOR","configuration":{"item-selector":"article > header"}},{"name":"step-1","operation":"VISIT","configuration":{"throttle-ms":"10000","scrap-attachments":"false"}},{"name":"step-2","operation":"SCRAP","configuration":{}}] }' \
    --outputDir=build/tmp/worker-output/fundsforngos-first
```
```json
{
  "steps": [
    {
      "name": "step-0",
      "operation": "ITERATOR",
      "configuration": {
        "item-selector": "article > header"
      }
    },
    {
      "name": "step-1",
      "operation": "VISIT",
      "configuration": {
        "throttle-ms": "10000",
        "scrap-attachments": "false"
      }
    },
    {
      "name": "step-2",
      "operation": "SCRAP",
      "configuration": {}
    }
  ]
}
```

### US State Department - ECA Grant Opportunities

```
java -jar build/libs/scraper-0.1.0-SNAPSHOT.jar \
    --mode=run-target \
    --jsonMessage='{"executionId": "cli","rootUri": "https://www.state.gov/eca-grant-opportunities/", "steps":[{"name":"step-0","operation":"ITERATOR","configuration":{"item-selector":"div:nth-child(4) > div > details","scrap-attachments":"true"}},{"name":"step-1","operation":"SCRAP","configuration":{}}] }' \
    --outputDir=build/tmp/worker-output/us-state-eca
```
```json
{
  "steps": [
    {
      "name": "step-0",
      "operation": "ITERATOR",
      "configuration": {
        "item-selector": "div:nth-child(4) > div > details",
        "scrap-attachments": "true"
      }
    },
    {
      "name": "step-1",
      "operation": "SCRAP",
      "configuration": {}
    }
  ]
}
```

### EIB - All Ongoing

```
java -jar build/libs/scraper-0.1.0-SNAPSHOT.jar \
    --mode=run-target \
    --jsonMessage='{"executionId": "cli","rootUri": "https://www.eib.org/en/about/procurement/all/index.htm?q=&sortColumn=configuration.contentStart&sortDir=desc&pageNumber=0&itemPerPage=25&pageable=true&la=EN&deLa=EN&yearTo=&orYearTo=true&yearFrom=&orYearFrom=true&procurementStatus=onGoing&or_g_procurementInformations_type=true", "steps":[{"name":"step-0","operation":"ITERATOR","configuration":{"item-selector":"article","next-page-selector":"a[class*=nextPagination]"}},{"name":"step-1","operation":"VISIT","configuration":{"throttle-ms":"10000","scrap-attachments":"true","content-selector":"main.container"}},{"name":"step-2","operation":"SCRAP","configuration":{}}] }' \
    --outputDir=build/tmp/worker-output/eib-all-ongoing
```
```json
{
  "steps": [
    {
      "name": "step-0",
      "operation": "ITERATOR",
      "configuration": {
        "item-selector": "article",
        "next-page-selector": "a[class*=nextPagination]"
      }
    },
    {
      "name": "step-1",
      "operation": "VISIT",
      "configuration": {
        "throttle-ms": "10000",
        "scrap-attachments": "true",
        "content-selector": "main.container"
      }
    },
    {
      "name": "step-2",
      "operation": "SCRAP",
      "configuration": {}
    }
  ]
}
```

### Simple Pagination Template

```
java -jar build/libs/scraper-0.1.0-SNAPSHOT.jar \
    --mode=run-target \
    --jsonMessage='{"executionId": "cli","rootUri": "", "steps":  }' \
    --outputDir=build/tmp/worker-output/
```
```json
{
  "steps": [
    {
      "name": "step-0",
      "operation": "ITERATOR",
      "configuration": {
        "item-selector": "",
        "next-page-selector": ""
      }
    },
    {
      "name": "step-1",
      "operation": "VISIT",
      "configuration": {
        "throttle-ms": "10000",
        "scrap-attachments": "true",
        "content-selector": ""
      }
    },
    {
      "name": "step-2",
      "operation": "SCRAP",
      "configuration": {}
    }
  ]
}
```