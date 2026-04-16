# Plan: CfP Agent — Scanner ILO d'appels à propositions

## TL;DR

Agent Python unique qui remplace les 6+ services du projet initial. Schedulé via GitHub Actions
(lundi 6h UTC), il scrape 44 sources avec Jina Reader, classifie via LLM (Gemini Flash / OpenRouter),
et produit un `results/latest.json` consommé par le module CfP de l'appli gimi (Struts2).

## Architecture

```
GitHub Actions (cron lundi 6h UTC)
       │
       ▼
  cfp-agent/main.py
       │
       ├── sources.yaml (44 sources)
       ├── Jina Reader (scraping) / APIs publiques (4 sources)
       ├── Gemini Flash via OpenRouter (classification + 9 critères)
       ├── _enforce_hard_criteria() (post-process Python)
       │
       ▼
  results/latest.json (committé dans le repo)
       │
       ▼
  raw.githubusercontent.com/sn3f/CfP/main/cfp-agent/results/latest.json
       │
       ▼
  gimi / ShowCfps.action (Struts2, fetch via proxy ILO)
```

## Décisions techniques

| Choix | Décision |
|---|---|
| LLM | `google/gemini-2.0-flash-001` via OpenRouter (1M context → pas besoin de RAG) |
| Scraping | Jina Reader (`https://r.jina.ai/{url}`) — gratuit, sans API key, retourne Markdown. Supporte les PDFs |
| Structured output | Pydantic via `instructor` (mode JSON, compatible OpenRouter) |
| Scheduling | GitHub Actions `schedule: cron` + `workflow_dispatch` |
| Output | `results/latest.json` committé dans le repo |
| Display | Module CfP dans gimi (Struts2 6.8.0, Jackson 3.x, JSP + DataTables) |
| Proxy | `proxyos.ilo.org:8080` (Java côté gimi, env vars côté Python) |

---

## Fichiers du projet

```
cfp-agent/
  PLAN.md                          ← ce fichier
  pyproject.toml                   ✅ deps Python (uv)
  .env.example                     ✅ OPENROUTER_API_KEY
  .gitignore                       ✅ exclut .env, inclut results/latest.json
  sources.yaml                     ✅ 44 sources (4 avec API, 40 Jina)
  criteria.yaml                    ✅ 9 critères ILO versionnés
  models.py                        ✅ Pydantic: CriterionResult, CfpClassification (35+ champs)
  tools.py                         ✅ scrape_url(), fetch_via_api() (4 fetchers)
  agent.py                         ✅ Classifier LLM + _enforce_hard_criteria()
  region_map.py                    ✅ COUNTRY_REGION_MAP
  main.py                          ✅ entrypoint: --dry-run, --source <name>
  results/
    latest.json                    ✅ output final (committé par GitHub Actions)

.github/
  workflows/
    cfp-weekly-scan.yml            ✅ cron lundi 6h UTC + workflow_dispatch

gimi (ILO-CMS) — module CfP:
  src/main/java/cfp/action/CfpAction.java      ✅ fetch JSON via proxy
  src/main/java/cfp/bean/CfpReport.java         ✅ root object
  src/main/java/cfp/bean/CfpResult.java          ✅ POJO mappé
  src/main/java/cfp/bean/CfpCriterion.java       ✅ status + evidence
  src/main/resources/struts-cfp.xml              ✅ route ShowCfps.action
  src/main/webapp/gess/service/cfp/cfpList.jsp   ✅ tableau DataTables
```

---

## Sources avec API publique (sans clé)

| Source | API endpoint | api_type |
|---|---|---|
| **Grants.gov** | `grantsapi.grants.gov/v1/api/search` | `grants_gov` |
| **EU Funding & Tenders** | `api.tech.ec.europa.eu/search-api/prod/rest/search` | `eu_tenders` |
| **World Bank** | `search.worldbank.org/api/v2/procnotices` | `world_bank` |
| **AusTender (DFAT)** | `www.tenders.gov.au/api/atm` | `austender` |

Les 40 sources restantes passent par Jina Reader (scraping).
Liste complète des 44 sources dans `sources.yaml`.

---

## 9 Critères ILO

| # | Critère | Hard | Description |
|---|---|---|---|
| 1 | **ILO Eligibility** | ✅ | L'ILO est-elle éligible ? Si liste stricte sans ILO → EXCLURE |
| 2 | **Funding instrument is grant** | ✅ | Exclure si obligation de remboursement |
| 3 | **Grant size above threshold** | ✅ | Exclure si < 50 000 USD |
| 4 | **Deadline is future** | ✅ | Exclure si deadline passée (vérifié en Python) |
| 5 | **Is procurement or tender** | ❌ | Flag si RFP/ITB plutôt que subvention |
| 6 | **Requires cofinancing** | ❌ | Flag si cofinancement obligatoire |
| 7 | **Requires specific accreditation** | ❌ | Flag si accréditation requise (GEF, GCF) |
| 8 | **Has consortium leadership rules** | ❌ | Flag si consortium dirigé par non-ONU |
| 9 | **Applicant origin is restricted** | ❌ | Flag si restreint au pays du donateur |

> ✅ `hard: true` → si non satisfait, `eligible: false` + `exclusion_reason`
> ❌ `hard: false` → flag informatif uniquement

---

## Vérification

```bash
# Dry run sur 1 source
python main.py --dry-run --source "IFAD - Call for Proposals"

# Scan complet (44 sources, ~30-60 min)
python main.py

# Ou via GitHub Actions
# Actions → CfP Weekly Scan → Run workflow
```

---

## Phase 2 — Améliorations planifiées

### A. Fiabilité du scan

| # | Quoi | Fichier | Effort |
|---|---|---|---|
| A1 | Retry automatique par source (`tenacity`, 2 tentatives) | `main.py`, `pyproject.toml` | 15 min |
| A2 | Déduplication par URL entre sources | `main.py` | 10 min |
| A3 | Typage strict `status: Literal["true","false","unknown"]` | `models.py` | 5 min |
| A4 | Historique : archiver `results/YYYY-MM-DD.json` | `cfp-weekly-scan.yml` | 10 min |

### B. Qualité LLM

| # | Quoi | Fichier | Effort |
|---|---|---|---|
| B1 | Suivre les PDFs de 2ème niveau (ToR attachés) | `tools.py`, `agent.py` | 30 min |
| B2 | Activer `confidence_score` dans le prompt + afficher ⚠️ si < 0.6 | `agent.py`, `cfpList.jsp` | 20 min |
| B3 | Ajouter thèmes prioritaires ILO 2026-2031 au prompt | `agent.py` | 15 min |

### C. UX display gimi

| # | Quoi | Fichier | Effort |
|---|---|---|---|
| C1 | ✅ Filtre "eligible only" (déjà implémenté) | — | — |
| C2 | Tri par `ilo_match_score` décroissant | `CfpAction.java` | 10 min |
| C3 | Cache in-memory (re-fetch toutes les 1h seulement) | `CfpAction.java` | 20 min |
| C4 | Export CSV (DataTables Buttons) | `cfpList.jsp` | 15 min |

### D. Observabilité

| # | Quoi | Fichier | Effort |
|---|---|---|---|
| D1 | Warning GitHub Actions si `eligible_count == 0` | `cfp-weekly-scan.yml` | 5 min |
| D2 | Summary dans le run (total, eligible, sources) | `cfp-weekly-scan.yml` | 10 min |

### Priorité recommandée

1. **A2 + A3** — quick wins, 15 min
2. **D1 + D2** — observabilité, 15 min
3. **C3** — cache gimi, évite timeout à chaque load
4. **B1 + B3** — qualité, après validation du scan complet

---

## Scope exclu (délibérément)

- Auth Keycloak
- Base de données PostgreSQL
- Chat server Node.js / Frontend React
- RabbitMQ / Redis
- Feedback utilisateur
