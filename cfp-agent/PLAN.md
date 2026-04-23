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

### Baseline mesure - run du 2026-04-22

| Metrique | Valeur |
|---|---|
| Duree totale | 4h17 |
| Cout OpenRouter | ~$32 |
| CfPs classifies | 318 |
| CfPs eligibles | 5 (1.6%) |

Observations cles:
- Cout par classification ~$0.10 (Sonnet 4.6, ~30k tokens input + 2k output en moyenne)
- Les 8 sources procurement (World Bank, ADB x3, AfDB, EIB, EBRD, IsDB) representent ~160 classifications qui echouent systematiquement le critere "Funding instrument is grant" => ~$16 de cout direct sans valeur
- Taux d'eligibilite 1.6% confirme que la classification fonctionne mais que le bruit des sources domine
- Plusieurs defauts qualite observes dans `latest.json`: chain-of-thought LLM qui fuit dans `classification_summary`, enforcement hard-criteria cote Python limite a la deadline
- 115 des 318 URLs (36%) ont deja une deadline passee au moment du scan -> gaspillage direct, corrige par C6 (drop)

## Phase 2 - reduction du cout et amelioration qualite

Objectif: ramener le cout par run hebdomadaire de ~$32 a moins de $10, et corriger les defauts de classification identifies a la lecture du baseline.

### Progression

| Item | Etat | Notes |
|---|---|---|
| G3 - reporting par source | fait | Champ `by_source` dans `latest.json` avec ~14 metriques par source |
| C1 + G1 - filtrage grant/procurement | fait | 8 sources taguees `source_type: procurement`, exclues par defaut, flag `--include-procurement` |
| C6 - diff scanning | fait | Reuse si `<30j` + deadline future, drop si expire, reclassify si stale. Flag `--no-diff` + env `DIFF_MAX_AGE_DAYS` |
| Bug IPv6 URL | fait | `urljoin` protege dans `extract_candidate_document_links` contre les liens malformes du type `https://[...` |
| Q3 - echecs silencieux | fait | Nouveaux champs `listing_chars`, `listing_loading_warning`, `api_items_returned` + `source_issues` dans `latest.json` + warnings dans GitHub Actions summary |
| C3 - reduire troncatures | fait | Primary page 100k -> 40k, supporting docs 4 x 25k -> 2 x 12k, hops 3 -> 2. Tous configurables via env vars |
| Q1 + Q2 - qualite classification | fait | Q1: `classification_summary` definie explicitement dans le prompt (verdict declaratif, pas de CoT/arithmetic). Q2: Python enforcement etendu a `Grant size above threshold` (conversion FX 15 devises, seuil 50k USD) + warning sur loan-keywords quand `Funding instrument is grant` = true. Evidence reecrite lors des overrides pour rester coherente avec le status. Bonus D4: deadline check utilise maintenant UTC |
| C4 - prompt caching | todo | |
| C2 + C5 - Haiku pre-screen + extraction | todo | |
| R4 - tests | fait | 110 tests dans `tests/` + CI GitHub Actions (`cfp-agent-tests.yml`). Couvre URL normalization, dedup (+ UTM stripping), diff decision, source issues, hard-criteria enforcement, FX conversion, theme normalization, CriterionResult validation, LinkList validator, match_sources fuzzy, IPv6 URL regression. |
| Q4 / Q5 / Q7 | fait | Q4: strip UTM/fbclid/gclid/mailchimp/hubspot dans `normalize_cfp_url`. Q5: reorder keyword rules (climate avant finance, sector en dernier). Q7: validator Pydantic sur `LinkList` qui drop les URLs non-http(s), relatives, vides, et deduplique. |
| D1 / D6 | fait | D1: suppression de `_proxies()` jamais appele. D6: `--source` accepte maintenant match fuzzy (case/whitespace insensitive + substring fallback) via `match_sources()`. |

### Leviers cout (par ordre d'impact)

| # | Levier | Gain estime | Effort | Fichier |
|---|---|---|---|---|
| C6 | Diff scanning: ne classifier que les URLs jamais vues, re-verifier cheap la deadline des URLs connues | ~-80% en steady state (~$3-5/run) | moyen | `main.py`, nouveau `results/seen.json` |
| C1 | Separer sources `grant` et `procurement`, n'inclure que `grant` par defaut | ~$16 | faible | `sources.yaml`, `main.py` |
| C2 | Pre-screen Haiku 4.5 sur la page principale avant classification Sonnet full | ~$8-12 | moyen | `agent.py` |
| C3 | Reduire troncature: page 100k -> 40k chars, 4 docs -> 2 docs de 12k | ~$10 | faible | `agent.py`, `tools.py` |
| C4 | Prompt caching via OpenRouter (cache_control sur content blocks du system) | ~$2-3 | moyen | `agent.py` |
| C5 | Haiku 4.5 pour l'extraction de liens depuis les listings | ~$1 | faible | `agent.py` |

Note: Batch API Anthropic (-50%) non disponible via OpenRouter. A evaluer seulement si le cout reste inacceptable apres C6+C1+C3.

### Qualite classification (bugs identifies a l'audit)

| # | Probleme | Fichier | Correction |
|---|---|---|---|
| Q1 | `classification_summary` laisse fuir le chain-of-thought ("wait, X is BEFORE today...") | `agent.py` prompt | Separer un champ `reasoning` ou interdire les auto-corrections dans le prompt |
| Q2 | Un seul critere dur sur quatre est verifie cote Python (deadline uniquement) | `agent.py::_enforce_hard_criteria` | Ajouter check `funding_max >= 50k USD` et validation "grant vs loan" |
| Q3 | Echec de classification silencieux (returns None, CfP perdu) | `agent.py::classify` | Compter les echecs dans le reporting, escalader si > seuil |
| Q4 | Dedup ignore les variations de query string (utm, etc.) | `main.py::normalize_cfp_url` | Strip les parametres de tracking connus |
| Q5 | Normalisation themes trop agressive (substring "sector" match tout) | `models.py::normalize_theme` | Correspondance sur theme entier ou prefixe |
| Q6 | Fallback API silencieux masque les pannes (API vide == API cassee) | `main.py::process_source` | Distinguer dans les logs et le reporting |
| Q7 | `LinkList` non validee (URL concatenees, relatives non resolues) | `models.py::LinkList` | Validator qui filtre sur http/https et resout les relatifs |

### Robustesse

| # | Item | Fichier |
|---|---|---|
| R1 | Aucun rate-limit par domaine HTTP (Jina Reader gratuit ~20 RPM) | `tools.py::_request_with_retries` |
| R2 | `_RESPONSE_CACHE` non borne | `tools.py:64` |
| R3 | Risque SSRF dans le crawl d'annexes (URLs arbitraires depuis contenu scrape) | `tools.py::fetch_supporting_documents` |
| R4 | Aucun test automatise sur les fonctions pures (dedup, enforce, normalize) | nouveau `tests/` |
| R5 | Pas de lint/format configure | `pyproject.toml` (ruff) |
| R6 | Budget tokens par run non borne (garde-fou cout max) | `main.py`, `agent.py` |

### Gouvernance sources

| # | Item | Fichier |
|---|---|---|
| G1 | Ajouter `enabled`, `source_type`, `priority` dans les sources | `sources.yaml`, `main.py` |
| G2 | Ajouter `link_allow_patterns` / `link_block_patterns` par source | `sources.yaml`, `main.py` |
| G3 | Produire un reporting par source dans le JSON final (volume, taux, erreurs) | `main.py` |
| G4 | Activer et exploiter `confidence_score` de bout en bout | `agent.py`, `models.py` |

### Dette technique

| # | Item | Fichier |
|---|---|---|
| D1 | Code mort `_proxies()` jamais appele | `tools.py:67-72` |
| D2 | `confidence_score` dans le schema mais jamais demande au LLM | `models.py`, `agent.py` |
| D3 | Constante `"Deadline is future"` hardcodee, couplage fort avec YAML | `agent.py`, `criteria.yaml` |
| D4 | `datetime.now().date()` local au lieu de UTC | `agent.py::_enforce_hard_criteria` |
| D5 | Themes prioritaires ILO 2026-2031 non refletes dans le prompt | `agent.py` |
| D6 | `--source` match exact sensible a la casse et aux espaces | `main.py:185` |

### Ordre d'execution recommande

1. **G3** - reporting par source d'abord. Sans observabilite on ne peut mesurer l'impact des changements suivants.
2. **C1 + G1** - separation grant/procurement, champ `source_type` dans sources.yaml. Safe win mesurable grace a G3.
3. **C6** - diff scanning. Le plus gros levier en steady state, provider-agnostic.
4. **C3 + Q1 + Q2** - troncatures + nettoyage prompt + enforcement Python etendu, avec mesure qualite via G3.
5. **C4** - prompt caching OpenRouter.
6. **C2 + C5 + Q3** - pre-screen Haiku + Haiku extraction + fiabilite.
7. **R4 (tests)** - avant toute Phase 3.

### Resultat attendu de la Phase 2

- Cout hebdomadaire < $10
- Duree reduite proportionnellement (moins d'appels + pre-screen rapide)
- `classification_summary` propre et exploitable dans gimi sans post-traitement
- `reporting.by_source` dans `latest.json` permettant d'arbitrer les sources a desactiver
- Socle de tests sur les fonctions pures

## Scope exclu

- Auth Keycloak
- Base de donnees PostgreSQL
- Chat server Node.js / Frontend React
- RabbitMQ / Redis
- Feedback utilisateur
