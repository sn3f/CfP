from __future__ import annotations
from typing import Optional
from pydantic import BaseModel, Field


class CriterionResult(BaseModel):
    status: Optional[str] = None  # "true", "false", or null
    evidence: Optional[str] = None


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
