# Plan: CfP Agent - Scanner ILO d'appels a propositions

## TL;DR

Le projet est un agent Python unique qui scanne des sources de financement, extrait des appels pertinents, les classe selon 9 criteres ILO, puis produit un `results/latest.json` consomme par le module CfP de gimi.

Le scanner tourne via GitHub Actions tous les lundis a 06:00 UTC. Il utilise:
- APIs publiques quand elles existent
- Jina Reader pour les pages web et PDF
- un crawl borne des pieces jointes utiles (`pdf`, `docx`, annexes, ToR)
- `anthropic/claude-sonnet-4.6` via OpenRouter pour la classification

Le resultat final est versionne dans le depot:
- `cfp-agent/results/latest.json`
- `cfp-agent/results/history/YYYY-MM-DD.json`

## Architecture

```text
GitHub Actions (cron lundi 06:00 UTC)
       |
       v
  cfp-agent/main.py
       |
       +-- sources.yaml (44 sources)
       +-- APIs publiques (4 sources)
       +-- Jina Reader (pages + PDF)
       +-- tools.py
       |    +-- retry/backoff reseau
       |    +-- cache memoire intra-run
       |    +-- crawl borne des pieces jointes
       |    +-- parsing direct des .docx
       |
       +-- agent.py
       |    +-- extraction de liens CfP
       |    +-- classification LLM
       |    +-- post-checks Python sur criteres hard
       |
       v
  results/latest.json
       |
       +-- commit dans le repo
       +-- archive dans results/history/
       |
       v
  gimi / ShowCfps.action
```

## Decisions techniques

| Choix | Decision |
|---|---|
| LLM | `anthropic/claude-sonnet-4.6` via OpenRouter |
| Scraping | Jina Reader (`https://r.jina.ai/{url}`) pour HTML et PDF |
| Pieces jointes | Crawl borne des documents supports + parsing direct des `.docx` |
| Structured output | Pydantic via `instructor` |
| Robustesse reseau | Retry/backoff + client HTTP reutilise + cache memoire intra-run |
| Scheduling | GitHub Actions `schedule` + `workflow_dispatch` |
| Output | `results/latest.json` + `results/history/YYYY-MM-DD.json` |
| Display | Module CfP dans gimi (Struts2 / Jackson / JSP + DataTables) |

## Fichiers du projet

```text
cfp-agent/
  PLAN.md
  pyproject.toml
  .env.example
  .gitignore
  sources.yaml
  criteria.yaml
  models.py
  tools.py
  agent.py
  region_map.py
  main.py
  results/
    latest.json
    history/
      .gitkeep

.github/
  workflows/
    cfp-weekly-scan.yml
```

Details:
- `models.py`: schemas Pydantic, normalisation stricte des statuses, normalisation souple des themes
- `tools.py`: scraping, fetch APIs, retry/cache, crawl des annexes, parsing `.docx`
- `agent.py`: prompt, extraction des liens CfP, classification, agregation de la page principale et des pieces jointes
- `main.py`: orchestration, deduplication des URLs, sortie JSON finale
- `cfp-weekly-scan.yml`: scan, archive, summary GitHub Actions, warning si `eligible_count == 0`

## Sources avec API publique

| Source | API endpoint | api_type |
|---|---|---|
| Grants.gov | `grantsapi.grants.gov/v1/api/search` | `grants_gov` |
| EU Funding & Tenders | `api.tech.ec.europa.eu/search-api/prod/rest/search` | `eu_tenders` |
| World Bank | `search.worldbank.org/api/v2/procnotices` | `world_bank` |
| AusTender (DFAT) | `www.tenders.gov.au/api/atm` | `austender` |

Les autres sources passent par Jina Reader.

## Criteres ILO

| # | Critere | Hard | Description |
|---|---|---|---|
| 1 | ILO Eligibility | oui | Si liste stricte des eligibles sans ILO, exclure |
| 2 | Funding instrument is grant | oui | Exclure si instrument remboursable |
| 3 | Grant size above threshold | oui | Exclure si maximum < 50 000 USD |
| 4 | Deadline is future | oui | Exclure si la premiere date obligatoire est passee |
| 5 | Is procurement or tender | non | Flag informatif si RFP / ITB / services |
| 6 | Requires cofinancing | non | Flag si cofinancement obligatoire |
| 7 | Requires specific accreditation | non | Flag si accreditation prealable requise |
| 8 | Has consortium leadership rules | non | Flag si consortium non-ONU impose |
| 9 | Applicant origin is restricted | non | Flag si restriction au territoire du bailleur |

Post-checks Python actifs:
- verification de la deadline
- passage a `eligible=false` si un critere hard est `false`
- normalisation stricte de `status` vers `true | false | unknown`

## Verification

Variables utiles dans `.env`:

```env
OPENROUTER_API_KEY=sk-or-v1-...
CLASSIFIER_MODEL=anthropic/claude-sonnet-4.6
MAX_CFPS_PER_SOURCE=20
REQUEST_DELAY_SECONDS=2
HTTP_CACHE_ENABLED=true
HTTP_RETRY_ATTEMPTS=3
HTTP_RETRY_BASE_DELAY_SECONDS=1.0
HTTP_RETRY_MAX_DELAY_SECONDS=8.0
HTTP_CONNECT_RETRIES=1
```

Commandes:

```bash
# Dry run sur une source
python main.py --dry-run --source "IFAD - Call for Proposals"

# Scan complet
python main.py

# Ou via GitHub Actions
# Actions -> CfP Weekly Scan -> Run workflow
```

## Etat actuel

### Phase 1 - moteur du scanner

| Item | Etat | Notes |
|---|---|---|
| Modele de meilleure qualite | fait | Passage a `anthropic/claude-sonnet-4.6` |
| Deduplication des URLs | fait | Dedup intra-source et inter-sources |
| Typage strict des criteres | fait | `status=true|false|unknown` |
| Historique des resultats | fait | Archive datee dans `results/history/` |
| Summary GitHub Actions | fait | Summary de run + warning si zero eligible |
| Suivi des pieces jointes | fait | PDF, ToR, annexes, `.docx` |
| Retry/cache reseau | fait | Retry/backoff + cache memoire intra-run |
| Normalisation souple des themes | fait | Remap ou suppression des themes hors taxonomie |

### Resultat attendu de cette phase

Le prochain scan complet doit servir de nouveau baseline. Les anciens resultats ne sont plus une reference fiable pour arbitrer les sources, car le moteur a change sur plusieurs dimensions a la fois.

## Prochaine phase recommandee

1. Lancer un scan complet frais avec le moteur actuel.
2. Analyser les resultats par source:
   - volume
   - taux d'eligibilite
   - bruit
   - doublons
   - erreurs reseau
   - pieces jointes utiles ou non
3. Seulement ensuite, revoir la gouvernance des sources:
   - `enabled`
   - `source_type`
   - `priority`
   - `link_allow_patterns`
   - separation entre sources `grant` et sources `procurement`

## Backlog

| Priorite | Quoi | Fichier |
|---|---|---|
| haute | Produire un reporting par source dans le JSON final | `main.py` |
| haute | Ajouter `enabled`, `source_type`, `priority` dans `sources.yaml` | `sources.yaml`, `main.py` |
| haute | Sortir les sources `procurement` du run principal | `sources.yaml`, workflow |
| moyenne | Ajouter `link_allow_patterns` / `link_block_patterns` par source | `sources.yaml`, `main.py` |
| moyenne | Activer et exploiter `confidence_score` de bout en bout | `agent.py` |
| basse | Ajouter des themes prioritaires ILO 2026-2031 au prompt | `agent.py` |

## Scope exclu

- Auth Keycloak
- Base de donnees PostgreSQL
- Chat server Node.js / Frontend React
- RabbitMQ / Redis
- Feedback utilisateur
