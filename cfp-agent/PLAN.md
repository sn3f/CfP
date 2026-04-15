# Plan: CfP Agent PoC (OpenAI Agents SDK + OpenRouter)

## TL;DR

Remplacer les 6+ services du projet actuel par un agent Python unique schedulé via GitHub Actions.
L'agent utilise Jina Reader pour scraper (anti-bot résolu), le SDK OpenAI Agents avec OpenRouter
comme provider LLM, et produit un `results/latest.json`. Les 9 critères ILO sont versionnés dans
`criteria.yaml` au lieu d'une base de données.

## Décisions techniques

| Choix | Décision |
|---|---|
| LLM | `google/gemini-2.0-flash-001` via OpenRouter (1M context → pas besoin de RAG) |
| Scraping | Jina Reader (`https://r.jina.ai/{url}`) — gratuit, sans API key, retourne Markdown |
| Structured output | Pydantic via `instructor` (mode JSON, compatible OpenRouter) |
| Scheduling | GitHub Actions `schedule: cron` |
| Output | `results/latest.json` committé dans le repo |
| UI | Aucune pour le PoC |

---

## Fichiers à créer

```
cfp-agent/
  PLAN.md                          ← ce fichier
  pyproject.toml                   # deps Python (uv)
  .env.example                     # OPENROUTER_API_KEY
  .gitignore
  sources.yaml                     # 44 sources (URL + stratégie d'accès)
  criteria.yaml                    # 9 critères ILO versionnés
  models.py                        # Pydantic: CriterionResult, CfpResult
  tools.py                         # scrape_url(), fetch_via_api(), find_cfp_links()
  agent.py                         # OpenAI Agents SDK + prompt consolidé
  region_map.py                    # COUNTRY_REGION_MAP (depuis classifier existant)
  main.py                          # entrypoint: --dry-run, --source <name>
  results/
    latest.json                    # output final (committé par GitHub Actions)

.github/
  workflows/
    cfp-weekly-scan.yml            # cron monday 6h UTC + commit results
```

---

## Phases d'implémentation

### Phase 1 — Scaffold
1. `cfp-agent/pyproject.toml` — deps: `openai-agents`, `instructor`, `openai`, `httpx`, `pydantic`, `pyyaml`, `python-dotenv`
2. `cfp-agent/.env.example` — `OPENROUTER_API_KEY=sk-or-...`
3. `cfp-agent/.gitignore` — `.env`, `__pycache__/`, `results/*.json` sauf `!results/latest.json`

### Phase 2 — Configuration versionnée
4. `sources.yaml` — 44 sources avec `api_url` optionnel pour les sources avec API publique
5. `criteria.yaml` — 9 critères extraits de `classifier/app/baseClassifier.py`

### Phase 3 — Modèles Pydantic
6. `models.py`:
   - `CriterionResult(status: str, evidence: str)`
   - `CfpResult(title, url, deadline, funding_min, funding_max, funding_currency, countries, regions, themes, eligible, exclusion_reason, criteria: dict[str, CriterionResult], ilo_match_score, proposal_summary, scraped_at)`

### Phase 4 — Outils de scraping
7. `tools.py`:
   - `scrape_url(url)` → `GET https://r.jina.ai/{url}` → Markdown
   - `fetch_via_api(source)` → parse JSON natif selon `api_type`
   - `find_cfp_links(markdown, base_url)` → liste d'URLs de CfPs individuels

### Phase 5 — Agent
8. `agent.py`:
   - Client `AsyncOpenAI(base_url="https://openrouter.ai/api/v1")`
   - `set_default_openai_client(client)` (OpenAI Agents SDK)
   - Modèle: `google/gemini-2.0-flash-001`
   - System prompt consolidant les 3 prompts actuels en 1 (classification + ILO eligibility + ILO match)
   - `output_type=CfpResult`

### Phase 6 — Entrypoint
9. `main.py` — lit `sources.yaml`, route vers API ou scraping, run agent, écrit `results/latest.json`
10. `region_map.py` — `COUNTRY_REGION_MAP` copié de `classifier/app/regionData.py`
11. Support `--dry-run` (1 seul CfP, pas de sauvegarde) et `--source <name>`

### Phase 7 — GitHub Actions
12. `.github/workflows/cfp-weekly-scan.yml`:
    - Trigger: `schedule: cron: '0 6 * * 1'` + `workflow_dispatch`
    - Steps: checkout → setup uv → install deps → run `main.py` → commit `results/latest.json`

---

## Stratégie d'accès aux sources

`sources.yaml` contient un champ `api_url` optionnel. Si présent, `fetch_via_api()` est utilisé au lieu de Jina Reader.

### Sources avec API publique confirmée (sans clé)

| Source | API endpoint | api_type |
|---|---|---|
| **Grants.gov** | `https://grantsapi.grants.gov/v1/api/search` | `grants_gov` |
| **EU Funding & Tenders** | `https://api.tech.ec.europa.eu/search-api/prod/rest/search` | `eu_tenders` |
| **World Bank Procurement** | `https://search.worldbank.org/api/v2/procnotices` | `world_bank` |
| **AusTender (DFAT)** | `https://www.tenders.gov.au/api/atm` | `austender` |
| **GEF** | `https://www.thegef.org/api/projects` | `gef` (à vérifier) |

### 39 sources restantes → Jina Reader scraping

---

## 44 Sources

```yaml
sources:
  - name: "UNDP MPTF - Call for Proposals"
    url: "https://mptf.undp.org/page/funding-call-proposals"

  - name: "EU Funding & Tenders Portal"
    url: "https://ec.europa.eu/info/funding-tenders/opportunities/portal/screen/opportunities/calls-for-proposals?isExactMatch=true&status=31094501,31094502,31094503&order=DESC&pageNumber=1&pageSize=50&sortBy=startDate"
    api_url: "https://api.tech.ec.europa.eu/search-api/prod/rest/search"
    api_type: "eu_tenders"

  - name: "EU External Action Service - Grants"
    url: "https://www.eeas.europa.eu/eeas/grants_en"

  - name: "African Development Bank - Initiatives"
    url: "https://www.afdb.org/en/topics-and-sectors/initiatives-partnerships"

  - name: "World Bank - Procurement"
    url: "https://www.worldbank.org/en/projects-operations/procurement"
    api_url: "https://search.worldbank.org/api/v2/procnotices"
    api_type: "world_bank"

  - name: "UK FCDO - International Development Funding"
    url: "https://www.gov.uk/international-development-funding"

  - name: "UK PACT"
    url: "https://www.ukpact.co.uk/apply-now"

  - name: "Canada - CFLI"
    url: "https://www.international.gc.ca/world-monde/funding-financement/cfli-fcil/index.aspx?lang=eng"

  - name: "RISE Challenge - Gender & Environment"
    url: "https://genderandenvironment.org/rise-challenge/call/"

  - name: "Women Entrepreneurs Finance Initiative"
    url: "https://we-fi.org/sixth-funding-call/"

  - name: "International Climate Initiative"
    url: "https://www.international-climate-initiative.com/en/find-funding/"

  - name: "Norway MFA - Open Calls"
    url: "https://grants.mfa.no/#calls/opencalls"

  - name: "Norad - Calls for Proposals"
    url: "https://www.norad.no/en/for-partners/guides-and-tools/calls-for-proposals2/?tab=active&page=1"

  - name: "US Grants.gov"
    url: "https://www.grants.gov/"
    api_url: "https://grantsapi.grants.gov/v1/api/search"
    api_type: "grants_gov"

  - name: "Canada - Open Calls"
    url: "https://www.international.gc.ca/world-monde/funding-financement/open_calls-appels_ouverts.aspx?lang=eng#a1"

  - name: "Sweden Sida - Calls"
    url: "https://www.sida.se/en/for-partners/calls-and-announcements"

  - name: "Denmark Danida - NGO Rounds"
    url: "https://um.dk/danida/samarbejspartnere/civ-org/stoetteform/tematiske-ngo-runder"

  - name: "IFAD - Call for Proposals"
    url: "https://www.ifad.org/en/call-for-proposals"

  - name: "Australia DFAT - Tenders"
    url: "https://www.tenders.gov.au/atm?filter=published&orderBy=&Number=&Keyword=DFAT"
    api_url: "https://www.tenders.gov.au/api/atm"
    api_type: "austender"

  - name: "Finland - Grants"
    url: "https://www.haeavustuksia.fi/en/"

  - name: "UN Road Safety Fund"
    url: "https://roadsafetyfund.un.org/call-proposals"

  - name: "CAF Development Bank - Calls"
    url: "https://www.caf.com/es/trabaja-con-nosotros/convocatorias/"

  - name: "Italy AICS - Tenders"
    url: "https://aics.portaleamministrazionetrasparente.it/pagina952_bandi.html"

  - name: "Global Disability Fund"
    url: "https://globaldisabilityfund.org/funding-calls/"

  - name: "Joint SDG Fund"
    url: "https://invest.jointsdgfund.org/"

  - name: "Ibero-American Triangular Cooperation Fund"
    url: "https://fondo-cooperacion-triangular.net/"

  - name: "Funds for NGOs"
    url: "https://www2.fundsforngos.org/"

  - name: "US State Dept - Grants"
    url: "https://www.state.gov/policy-issues/grants-and-funding-opportunities"

  - name: "ADB - Tenders (Goods)"
    url: "https://www.adb.org/projects/tenders/group/goods"

  - name: "ADB - Self Service Portal"
    url: "https://selfservice.adb.org/OA_HTML/OA.jsp?page=/adb/oracle/apps/xxcrs/csrn/webui/CsrnHomePG&OAPB=ADBPOS_CMS_ISP_BRAND&_ti=1541137852&oapc=9&oas=LpXr4wCZC6SaqRfuqt3bdQ"

  - name: "ADB - Procurement Notices"
    url: "https://www.adb.org/business/institutional-procurement/notices"

  - name: "AfDB - Procurement"
    url: "https://www.afdb.org/en/projects-and-operations/procurement"

  - name: "IDB - Regional Public Goods"
    url: "https://www.iadb.org/en/who-we-are/how-we-are-organized/departments-offices-and-sectors/vice-presidency-countries/regional-public-goods-initiative"

  - name: "EIB - Procurement"
    url: "https://www.eib.org/en/about/procurement/all/index.htm?q=&sortColumn=configuration.contentStart&sortDir=desc&pageNumber=0&itemPerPage=25&pageable=true&la=EN&deLa=EN&yearTo=&orYearTo=true&yearFrom=&orYearFrom=true&procurementStatus=All&or_g_procurementInformations_type=true"

  - name: "EBRD - Procurement Notices"
    url: "https://www.ebrd.com/home/work-with-us/project-procurement/procurement-notices.html"

  - name: "IsDB - Tenders EOI"
    url: "https://www.isdb.org/project-procurement/tenders?tender_type=EOI"

  - name: "AFD - Appels à Projets (FR)"
    url: "https://www.afd.fr/fr/appels-a-projets/liste?status%5Bongoing%5D=ongoing&status%5Bsoon%5D=soon&status%5Bclosed%5D=closed"

  - name: "AFD - Calls for Projects (EN)"
    url: "https://www.afd.fr/en/calls-projects"

  - name: "Switzerland SECO"
    url: "https://www.seco.admin.ch/"

  - name: "Global Environment Facility"
    url: "https://www.thegef.org/"

  - name: "Adaptation Fund"
    url: "https://www.adaptation-fund.org/"

  - name: "MCC - Cooperative Agreements"
    url: "https://www.mcc.gov/work-with-us/partnerships/cooperative-agreements/"

  - name: "UN Migration Network MPTF"
    url: "https://migrationnetwork.un.org/mptf"

  - name: "Expertise France - POPS"
    url: "https://pops.expertisefrance.fr/sdm/ent2/gen/accueil.action?tp=1761184818439"
```

---

## 9 Critères ILO (depuis classifier/app/baseClassifier.py)

| # | fieldName | hard | Description |
|---|---|---|---|
| 1 | **ILO Eligibility** | ✅ | Vérifie si l'ILO (Organisation Internationale) est éligible. Si une liste stricte d'entités éligibles existe et que l'ILO n'y figure pas explicitement, EXCLURE. |
| 2 | **Funding instrument is grant** | ✅ | Exclure si le financement crée une obligation de remboursement. Inclure UNIQUEMENT si composante non-remboursable. |
| 3 | **Grant size above threshold** | ✅ | Exclure si le montant max est inférieur à 50 000 USD. |
| 4 | **Deadline is future** | ✅ | Exclure si la deadline de soumission est passée. |
| 5 | **Is procurement or tender** | ❌ | Signaler si c'est un appel d'offres/RFP/ITB plutôt qu'une subvention. |
| 6 | **Requires cofinancing** | ❌ | Signaler si le cofinancement est une condition obligatoire. |
| 7 | **Requires specific accreditation** | ❌ | Signaler si une accréditation préalable spécifique est requise (ex: GEF, GCF). |
| 8 | **Has consortium leadership rules** | ❌ | Signaler si le consortium doit être dirigé par une entité non-ONU. |
| 9 | **Applicant origin is restricted** | ❌ | Signaler si l'éligibilité est restreinte aux entités du pays du donateur. |

> ✅ `hard: true` → si non satisfait, `eligible: false`. ❌ `hard: false` → flag informatif uniquement.

---

## Vérification

1. `python main.py --dry-run --source "IFAD - Call for Proposals"` → affiche JSON sur 1 source sans sauvegarder
2. Vérifier que `eligible` et `ilo_match_score` sont cohérents
3. Déclencher `workflow_dispatch` sur GitHub Actions manuellement avant d'activer le cron

## Module Display — Struts2

Appli Java Struts2 séparée qui consomme `results/latest.json` (fichier statique, pas de DB).

### Fichiers à créer

```
cfp-display/
  pom.xml                          # Maven: struts2-core 2.5.33+, jackson-databind
  src/main/java/
    CfpResult.java                 # POJO mappé depuis le JSON (title, url, deadline, eligible, ilo_match_score...)
    CfpResultsAction.java          # Struts2 Action: lit latest.json via ObjectMapper
  src/main/resources/
    struts.xml                     # mapping action → JSP
  src/main/webapp/
    WEB-INF/web.xml
    results.jsp                    # tableau HTML: titre, source, deadline, badge eligible, score, lien
```

### Fonctionnement

- `CfpResultsAction.execute()` lit `latest.json` depuis le filesystem (chemin configurable via constante `struts.xml` ou system property)
- Jackson `ObjectMapper` désérialise vers `List<CfpResult>`
- JSP affiche un tableau : titre, source, deadline, `eligible` (badge vert/rouge), `ilo_match_score`, lien URL

### Sécurité Struts2

- Utiliser Struts2 **2.5.33+** (version patchée CVE)
- `devMode = false` en production
- Pas d'input utilisateur → surface OGNL injection minimale (lecture seule du fichier JSON)

---

## Scope exclu (délibérément)

- Auth Keycloak
- Base de données PostgreSQL
- Chat server Node.js
- RabbitMQ / Redis
- Feedback utilisateur
