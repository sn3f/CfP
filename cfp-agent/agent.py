"""
agent.py - ILO CfP classifier using instructor + OpenRouter.

One LLM call per CfP page consolidates:
  - Hard exclusion criteria evaluation
  - ILO eligibility check
  - Key data extraction
  - ILO match score
"""
import logging
import os
import time
from datetime import datetime, timezone
from typing import Optional

import instructor
import yaml
from openai import OpenAI

from models import CfpClassification, ILO_THEMES, LinkList
from region_map import COUNTRY_REGION_MAP
from tools import fetch_supporting_documents

logger = logging.getLogger(__name__)

PREDEFINED_THEMES = " | ".join(ILO_THEMES)

MAX_PRIMARY_CONTENT_CHARS = int(os.getenv("MAX_PRIMARY_CONTENT_CHARS", "40000"))
MAX_LISTING_CONTENT_CHARS = int(os.getenv("MAX_LISTING_CONTENT_CHARS", "40000"))

GRANT_SIZE_THRESHOLD_USD = 50_000.0

# Rough FX rates for grant-size screening; approximate is fine (we just need to reject
# obviously too-small grants, not do accounting).
FX_TO_USD: dict[str, float] = {
    "USD": 1.0,
    "EUR": 1.05,
    "GBP": 1.25,
    "CHF": 1.10,
    "CAD": 0.73,
    "AUD": 0.65,
    "NZD": 0.60,
    "JPY": 0.0065,
    "SEK": 0.095,
    "NOK": 0.090,
    "DKK": 0.140,
    "ZAR": 0.055,
    "INR": 0.012,
    "BRL": 0.20,
    "MXN": 0.055,
}

LOAN_KEYWORDS = (
    "loan",
    "repayable",
    "repayment",
    "debt instrument",
    "guarantee facility",
    "equity investment",
    "equity stake",
    "credit line",
    "credit facility",
)


def _build_system_prompt(criteria: list[dict]) -> str:
    today = datetime.now().strftime("%Y-%m-%d")
    hard = sorted([c for c in criteria if c["hard"]], key=lambda x: x["id"])
    flags = sorted([c for c in criteria if not c["hard"]], key=lambda x: x["id"])

    hard_str = "\n".join(
        f"  {i + 1}. [{c['fieldName']}]: {c['evaluationLogic']}"
        for i, c in enumerate(hard)
    )
    flag_str = "\n".join(
        f"  {i + 1}. [{c['fieldName']}]: {c['evaluationLogic']}"
        for i, c in enumerate(flags)
    )
    criteria_keys = ", ".join(f'"{c["fieldName"]}"' for c in hard + flags)

    return f"""You are an expert Call for Proposals (CfP) analysis AI for the International Labour Organization (ILO).
The ILO is a UN agency and an international/intergovernmental organization.
Today's date: {today}. Your ENTIRE response must be in English.

=== TASK 1: ELIGIBILITY CLASSIFICATION ===

HARD EXCLUSION CRITERIA - if ANY fail, set eligible=false:
{hard_str}

FLAGGING CRITERIA - informational only, do not exclude:
{flag_str}

CRITICAL RULES for criteria evaluation:
- For "ILO Eligibility": the ILO is a UN intergovernmental organisation (IGO / UN specialized agency), NOT a company, NGO, CSO, civil-society organisation, university, research institute, government agency, or local entity. ALWAYS set a status. If the text names eligible applicant CATEGORIES (companies, private sector, NGOs, CSOs, civil society, for-profit entities, research institutes, universities, national/local authorities, domestic NGOs, local organisations), treat that list as EXHAUSTIVE — set status="true" ONLY if the list explicitly includes "UN agencies" / "United Nations entities" / "international organisations" / "intergovernmental organisations" / "IGOs" / "multilateral organisations" or an equivalent; otherwise set status="false". Do NOT confuse GEOGRAPHIC openness ("open to all countries", "global call", "worldwide") with ENTITY-TYPE openness — geographic phrases describe applicant country, not applicant type. When silent on entity types but the call's framing clearly targets private-sector / civil-society / local-entity beneficiaries, set status="false".
- For "Is open call with active application window": this page must describe a SINGLE specific, currently-open call with an explicit application mechanism (form, portal, EOI/concept-note, email with template) and a future deadline or rolling window. Set status="false" if the page is an aggregator/index listing multiple opportunities, a news/press release announcing a future call without an open application, a perpetual scheme for retail beneficiaries (domestic subsidies, individual grants), or a finished call. When in doubt → status="false".
- For "Deadline is future": Compare the deadline against today ({today}). If the deadline is BEFORE today, set status="false" and set eligible=false. NEVER mark a past deadline as "true".
- For ALL criteria: always provide a brief evidence string explaining your reasoning. Never leave evidence null.
- For ALL criteria: status must be exactly one of "true", "false", or "unknown". NEVER return JSON null, the string "null", or an empty string for status.
- If supporting documents are provided below (PDFs, annexes, ToRs, folder listings), use them together with the main page. Prefer the most specific attached document over generic landing-page wording when they conflict.
- Do not infer hidden requirements from a file listing alone. Use only information explicitly visible in the provided page or attachment text.

For each criterion, set status to "true" (passes/applies), "false" (fails/does not apply), or "unknown" (truly cannot determine).
The criteria dict keys MUST be exactly: {criteria_keys}

classification_summary: 2 to 4 short sentences stating the eligibility verdict and the decisive reasons. Declarative only. State findings as conclusions, never as verification steps. Forbidden content:
  - No inline arithmetic, currency conversion walkthroughs, or date comparisons. Report the conclusion ("grant max is below the USD 50,000 threshold"), not the calculation.
  - No self-correction, hedging narration, or wait/actually/however-I-realize patterns.
  - No admissions about missing content or what was not captured - if evidence is absent, state the criterion as unknown and move on.
  - No first-person reasoning ("I note that...", "let me check...").
Keep the tone factual and final, as if reporting a decision already made.

=== TASK 2: DATA EXTRACTION ===

Extract:
- title: official CfP title or deduce a short descriptive title
- deadline: first mandatory submission date as YYYY-MM-DD; for multi-stage use earliest stage
- deadline_text: deadline as written in the source text
- funding_min / funding_max: numeric amounts (expand "2 million" -> 2000000); use null if absent
- funding_currency: ISO 3-letter code (USD, EUR, CHF...)
- organization: ultimate donor (abstract to sovereign level for governments, spell out acronyms); NEVER list ILO as donor
- contact: email or contact URL if present
- country: list ALL individual eligible countries (expand regions/groups to individual nations)
- theme: choose from this list ONLY: {PREDEFINED_THEMES}
- organization_type: eligible applicant types (e.g. "NGOs", "Academic Institutions")
- application_process: [{{"date": "YYYY-MM-DD", "description": "stage name"}}]
- implementation_period: duration string exactly as stated (e.g. "24 months")
- eligible_activities: list of supported activity types and eligible costs
- funding_restrictions: list of ineligible costs or limitations
- proposal_summary: one paragraph in English summarising donor, objective, countries, amount, period, eligibility, deadline, co-financing

=== TASK 3: ILO MATCH SCORE ===

ilo_match_score (0.0-1.0): how strongly this CfP aligns with ILO mandate
  (labour standards, employment, social protection, social dialogue, just transition, decent work)
ilo_match_evidence: one sentence justification

=== OUTPUT ===

Return ONLY valid JSON matching the CfpClassification schema.
No markdown, no explanation, no wrapping text. Start with {{ and end with }}.
"""


class CfpClassifier:
    """Classifies CfP pages and extracts links using instructor + OpenRouter."""

    def __init__(
        self,
        criteria: list[dict],
        model: Optional[str] = None,
        request_delay: float = 2.0,
    ):
        self.criteria = criteria
        self.model = model or os.environ.get("CLASSIFIER_MODEL", "anthropic/claude-sonnet-4.6")
        self.request_delay = request_delay
        self.system_prompt = _build_system_prompt(criteria)
        self._last_call: float = 0.0

        raw_client = OpenAI(
            base_url="https://openrouter.ai/api/v1",
            api_key=os.environ["OPENROUTER_API_KEY"],
        )
        self.client = instructor.from_openai(raw_client, mode=instructor.Mode.JSON)
        logger.info(f"CfpClassifier ready (model={self.model})")

    def _build_classification_payload(self, content: str, url: str) -> str:
        supporting_documents = fetch_supporting_documents(content, url)
        sections = [
            f"Source URL: {url}",
            "",
            f"Primary CfP page content (truncated to {MAX_PRIMARY_CONTENT_CHARS} chars):",
            content[:MAX_PRIMARY_CONTENT_CHARS],
        ]

        if supporting_documents:
            sections.extend(["", "Supporting documents and attachments:"])
            for index, document in enumerate(supporting_documents, start=1):
                sections.extend(
                    [
                        "",
                        f"[Document {index}] {document['label']}",
                        f"URL: {document['url']}",
                        f"Discovery hop: {document['hop']}",
                        f"Content (truncated to {len(document['content'])} chars):",
                        document["content"],
                    ]
                )

        return "\n".join(sections)

    def _throttle(self) -> None:
        elapsed = time.time() - self._last_call
        if elapsed < self.request_delay:
            time.sleep(self.request_delay - elapsed)
        self._last_call = time.time()

    def _enforce_hard_criteria(self, result: "CfpClassification") -> "CfpClassification":
        """Post-process: enforce hard-criteria logic in Python (don't trust LLM for dates/logic)."""
        today = datetime.now(timezone.utc).date()
        hard_names = {c["fieldName"] for c in self.criteria if c["hard"]}

        # 1. Override "Deadline is future" using Python date comparison
        if result.deadline and "Deadline is future" in (result.criteria or {}):
            try:
                dl = datetime.strptime(result.deadline, "%Y-%m-%d").date()
                is_future = dl >= today
                cr = result.criteria["Deadline is future"]
                if not is_future and cr.status != "false":
                    logger.info(
                        f"Overriding 'Deadline is future' from {cr.status!r} to 'false' "
                        f"(deadline {result.deadline} < today {today})"
                    )
                    cr.status = "false"
                    cr.evidence = f"Deadline {result.deadline} is before today ({today})."
            except ValueError:
                pass

        # 2. Override "Grant size above threshold" using funding_max + currency
        self._check_grant_size(result)

        # 3. Warn (don't override) on loan-like phrasing inconsistent with grant=true
        self._check_funding_instrument(result)

        # 4. If any hard criterion is false, set eligible=false
        failed = [
            name
            for name in hard_names
            if (result.criteria or {}).get(name) is not None
            and (result.criteria or {}).get(name).status == "false"
        ]
        if failed:
            result.eligible = False
            if not result.exclusion_reason:
                result.exclusion_reason = f"Failed hard criteria: {', '.join(failed)}"

        return result

    def _check_grant_size(self, result: "CfpClassification") -> None:
        criterion_name = "Grant size above threshold"
        cr = (result.criteria or {}).get(criterion_name)
        if cr is None or result.funding_max is None:
            return

        currency = (result.funding_currency or "").strip().upper() or "USD"
        rate = FX_TO_USD.get(currency)
        if rate is None:
            return  # Unknown currency - leave LLM judgement alone

        amount_usd = result.funding_max * rate
        if amount_usd < GRANT_SIZE_THRESHOLD_USD and cr.status != "false":
            logger.info(
                f"Overriding '{criterion_name}' from {cr.status!r} to 'false' "
                f"(funding_max={result.funding_max} {currency} = ~{amount_usd:.0f} USD "
                f"< {GRANT_SIZE_THRESHOLD_USD:.0f} USD)"
            )
            cr.status = "false"
            cr.evidence = (
                f"Maximum grant ~{amount_usd:.0f} USD "
                f"({result.funding_max} {currency}) is below "
                f"{GRANT_SIZE_THRESHOLD_USD:.0f} USD threshold."
            )

    def _check_funding_instrument(self, result: "CfpClassification") -> None:
        criterion_name = "Funding instrument is grant"
        cr = (result.criteria or {}).get(criterion_name)
        if cr is None or cr.status != "true":
            return

        haystack_parts = [
            result.classification_summary or "",
            result.exclusion_reason or "",
            result.proposal_summary or "",
            " ".join(result.funding_restrictions or []),
        ]
        haystack = " ".join(haystack_parts).lower()
        hits = [kw for kw in LOAN_KEYWORDS if kw in haystack]
        if hits:
            logger.warning(
                f"'{criterion_name}' marked true but loan-related terms detected "
                f"({', '.join(hits)}); review manually: "
                f"url={getattr(result, 'url', None)} title={result.title!r}"
            )

    def classify(self, content: str, url: str) -> Optional["CfpClassification"]:
        """Classify a single CfP page. Returns None on error."""
        payload = self._build_classification_payload(content, url)
        self._throttle()
        try:
            result: CfpClassification = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": self.system_prompt},
                    {"role": "user", "content": payload},
                ],
                response_model=CfpClassification,
                max_retries=2,
            )
            return self._enforce_hard_criteria(result)
        except Exception as e:
            logger.error(f"Classification failed for {url}: {e}")
            return None

    def extract_cfp_links(self, listing_markdown: str, base_url: str) -> list[str]:
        """Ask the LLM to pull individual CfP URLs from a listing page."""
        self._throttle()
        try:
            result: LinkList = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {
                        "role": "system",
                        "content": (
                            "Extract all URLs pointing to individual Call for Proposals, grant "
                            "opportunities, or funding calls from the page content below. "
                            "Return a JSON object with key 'urls' containing a list of strings. "
                            "Include only links to individual CfP detail pages, not navigation "
                            "or filter links. Resolve relative URLs against the base URL."
                        ),
                    },
                    {
                        "role": "user",
                        "content": (
                            f"Base URL: {base_url}\n\n"
                            f"Page content:\n{listing_markdown[:MAX_LISTING_CONTENT_CHARS]}"
                        ),
                    },
                ],
                response_model=LinkList,
                max_retries=2,
            )
            return result.urls
        except Exception as e:
            logger.error(f"Link extraction failed for {base_url}: {e}")
            return []


def load_criteria_from_yaml(path: str) -> list[dict]:
    """Load criteria from criteria.yaml."""
    with open(path, encoding="utf-8") as f:
        data = yaml.safe_load(f)
    return data["criteria"]


def get_regions_for_countries(countries: list[str]) -> list[str]:
    """Map countries to ILO regions using COUNTRY_REGION_MAP."""
    regions: set[str] = set()
    for country in countries:
        region = COUNTRY_REGION_MAP.get(country.lower())
        if region:
            regions.add(region)
    return sorted(regions)
