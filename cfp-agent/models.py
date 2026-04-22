from __future__ import annotations
import logging
from typing import Literal, Optional

from pydantic import BaseModel, Field, field_validator

logger = logging.getLogger(__name__)

CriterionStatus = Literal["true", "false", "unknown"]

ILO_THEMES = (
    "International Labour Standards & Legal Frameworks",
    "Fundamental Principles and Rights at Work",
    "Employment Policy & Job Creation",
    "Skills Development & Vocational Training",
    "Labour Migration",
    "Sustainable Enterprises",
    "Sectoral Policies (Industry-Specific Work)",
    "Social Protection",
    "Working Conditions & Equality",
    "OSH & Labour Inspection",
    "Social Dialogue & Tripartism",
    "Just Transitions towards Environmentally Sustainable Economies and Societies",
    "Decent Work in Supply Chains",
    "Decent Work in Crisis and Post-Crisis Situations",
    "Informal Economy",
)

_THEME_LOOKUP = {theme.lower(): theme for theme in ILO_THEMES}

_THEME_ALIASES = {
    "rural finance": "Sustainable Enterprises",
    "financial inclusion": "Sustainable Enterprises",
    "inclusive finance": "Sustainable Enterprises",
    "access to finance": "Sustainable Enterprises",
    "enterprise development": "Sustainable Enterprises",
    "entrepreneurship": "Sustainable Enterprises",
    "green jobs": (
        "Just Transitions towards Environmentally Sustainable Economies and Societies"
    ),
    "climate resilience": (
        "Just Transitions towards Environmentally Sustainable Economies and Societies"
    ),
    "climate adaptation": (
        "Just Transitions towards Environmentally Sustainable Economies and Societies"
    ),
    "occupational safety and health": "OSH & Labour Inspection",
    "occupational safety & health": "OSH & Labour Inspection",
    "osh": "OSH & Labour Inspection",
    "labor migration": "Labour Migration",
    "migration": "Labour Migration",
    "jobs": "Employment Policy & Job Creation",
    "job creation": "Employment Policy & Job Creation",
    "employment": "Employment Policy & Job Creation",
    "tvet": "Skills Development & Vocational Training",
    "skills": "Skills Development & Vocational Training",
    "vocational training": "Skills Development & Vocational Training",
    "gender equality": "Working Conditions & Equality",
    "women's economic empowerment": "Working Conditions & Equality",
    "womens economic empowerment": "Working Conditions & Equality",
    "social security": "Social Protection",
    "humanitarian response": "Decent Work in Crisis and Post-Crisis Situations",
    "crisis response": "Decent Work in Crisis and Post-Crisis Situations",
    "supply chains": "Decent Work in Supply Chains",
    "labour standards": "International Labour Standards & Legal Frameworks",
    "labor standards": "International Labour Standards & Legal Frameworks",
    "forced labour": "Fundamental Principles and Rights at Work",
    "forced labor": "Fundamental Principles and Rights at Work",
    "child labour": "Fundamental Principles and Rights at Work",
    "child labor": "Fundamental Principles and Rights at Work",
    "freedom of association": "Fundamental Principles and Rights at Work",
    "social dialogue": "Social Dialogue & Tripartism",
    "tripartism": "Social Dialogue & Tripartism",
}


def normalize_theme(value: object) -> str | None:
    if not isinstance(value, str):
        return None

    cleaned = value.strip()
    if not cleaned:
        return None

    normalized = cleaned.lower()
    if normalized in _THEME_LOOKUP:
        return _THEME_LOOKUP[normalized]

    if normalized in _THEME_ALIASES:
        return _THEME_ALIASES[normalized]

    keyword_rules = (
        (("finance", "fintech", "enterprise", "entrepreneur"), "Sustainable Enterprises"),
        (("employment", "jobs", "livelihood"), "Employment Policy & Job Creation"),
        (("skills", "training", "tvet", "apprenticeship"), "Skills Development & Vocational Training"),
        (("migration", "migrant"), "Labour Migration"),
        (("social protection", "social security", "cash transfer"), "Social Protection"),
        (("gender", "equality", "women"), "Working Conditions & Equality"),
        (("osh", "occupational safety", "labour inspection", "labor inspection"), "OSH & Labour Inspection"),
        (("social dialogue", "tripartite", "tripartism", "collective bargaining"), "Social Dialogue & Tripartism"),
        (
            ("climate", "green", "transition", "resilience", "adaptation"),
            "Just Transitions towards Environmentally Sustainable Economies and Societies",
        ),
        (("supply chain", "supply chains"), "Decent Work in Supply Chains"),
        (("crisis", "humanitarian", "post-crisis", "emergency"), "Decent Work in Crisis and Post-Crisis Situations"),
        (("informal",), "Informal Economy"),
        (("rights at work", "forced labour", "forced labor", "child labour", "child labor"), "Fundamental Principles and Rights at Work"),
        (("legal framework", "labour standards", "labor standards"), "International Labour Standards & Legal Frameworks"),
        (("sector", "agriculture", "tourism", "manufacturing"), "Sectoral Policies (Industry-Specific Work)"),
    )

    for keywords, theme in keyword_rules:
        if any(keyword in normalized for keyword in keywords):
            logger.info("Remapped theme %r to %r", cleaned, theme)
            return theme

    logger.warning("Dropping unknown theme %r", cleaned)
    return None


class CriterionResult(BaseModel):
    status: CriterionStatus = "unknown"
    evidence: Optional[str] = None

    @field_validator("status", mode="before")
    @classmethod
    def normalize_status(cls, value: object) -> CriterionStatus:
        if value is None:
            return "unknown"
        if isinstance(value, bool):
            return "true" if value else "false"
        if isinstance(value, str):
            normalized = value.strip().lower()
            if normalized in {"true", "false", "unknown"}:
                return normalized
            if normalized in {"", "null", "none", "n/a", "na"}:
                return "unknown"
        raise ValueError("Criterion status must be one of: true, false, unknown")


class ApplicationStage(BaseModel):
    date: Optional[str] = None  # YYYY-MM-DD or null
    description: str


class LinkList(BaseModel):
    """Used by the agent to extract CfP URLs from a listing page."""
    urls: list[str] = Field(default_factory=list)


class CfpClassification(BaseModel):
    """Structured output from a single LLM call that classifies one CfP."""

    # Eligibility
    eligible: bool
    exclusion_reason: Optional[str] = None
    classification_summary: str
    criteria: dict[str, CriterionResult] = Field(default_factory=dict)

    # Extracted data
    title: Optional[str] = None
    deadline: Optional[str] = None         # YYYY-MM-DD
    deadline_text: Optional[str] = None
    funding_min: Optional[float] = None
    funding_max: Optional[float] = None
    funding_currency: Optional[str] = None
    organization: Optional[str] = None
    contact: Optional[str] = None
    country: list[str] = Field(default_factory=list)
    theme: list[str] = Field(default_factory=list)
    organization_type: list[str] = Field(default_factory=list)
    application_process: list[ApplicationStage] = Field(default_factory=list)
    implementation_period: Optional[str] = None
    eligible_activities: list[str] = Field(default_factory=list)
    funding_restrictions: list[str] = Field(default_factory=list)
    proposal_summary: Optional[str] = None

    # ILO match (0.0 = no alignment, 1.0 = perfect alignment)
    ilo_match_score: Optional[float] = Field(None, ge=0.0, le=1.0)
    ilo_match_evidence: Optional[str] = None

    confidence_score: Optional[float] = Field(None, ge=0.0, le=1.0)

    @field_validator("theme", mode="before")
    @classmethod
    def normalize_themes(cls, value: object) -> list[str]:
        if value is None:
            return []

        raw_items = value if isinstance(value, list) else [value]
        normalized_items: list[str] = []
        seen: set[str] = set()

        for item in raw_items:
            normalized = normalize_theme(item)
            if not normalized or normalized in seen:
                continue
            seen.add(normalized)
            normalized_items.append(normalized)

        return normalized_items
