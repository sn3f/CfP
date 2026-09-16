from datetime import datetime, timedelta, timezone

import pytest
import yaml

from agent import (
    ACTIVE_CALL_CRITERION,
    CfpClassifier,
    DEADLINE_CRITERION,
    FX_TO_USD,
    GRANT_SIZE_THRESHOLD_USD,
    derive_display_status,
)
from models import ApplicationStage, CfpClassification, CriterionResult


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture(scope="module")
def criteria():
    with open("criteria.yaml", encoding="utf-8") as f:
        return yaml.safe_load(f)["criteria"]


@pytest.fixture
def classifier(criteria):
    """Build a CfpClassifier bypassing the OpenAI client init (we only test pure logic)."""
    inst = CfpClassifier.__new__(CfpClassifier)
    inst.criteria = criteria
    inst.model = "test"
    inst.request_delay = 0
    inst.system_prompt = ""
    return inst


def _classification(**overrides):
    """Build a CfpClassification with all 4 hard criteria passing by default."""
    defaults = dict(
        eligible=True,
        classification_summary="test summary",
        criteria={
            "Deadline is future": CriterionResult(status="true"),
            "ILO Eligibility": CriterionResult(status="true"),
            "Grant size above threshold": CriterionResult(status="true"),
            "Funding instrument is grant": CriterionResult(status="true"),
        },
    )
    defaults.update(overrides)
    return CfpClassification(**defaults)


# ---------------------------------------------------------------------------
# Deadline enforcement
# ---------------------------------------------------------------------------

class TestDeadlineEnforcement:
    def test_past_deadline_overrides_to_false(self, classifier):
        past = (datetime.now(timezone.utc).date() - timedelta(days=5)).isoformat()
        result = classifier._enforce_hard_criteria(_classification(deadline=past))
        cr = result.criteria["Deadline is future"]
        assert cr.status == "false"
        assert not result.eligible
        assert "before today" in (cr.evidence or "")

    def test_future_deadline_kept_true(self, classifier):
        future = (datetime.now(timezone.utc).date() + timedelta(days=30)).isoformat()
        result = classifier._enforce_hard_criteria(_classification(deadline=future))
        assert result.criteria["Deadline is future"].status == "true"
        assert result.eligible

    def test_malformed_deadline_left_alone(self, classifier):
        result = classifier._enforce_hard_criteria(_classification(deadline="not-a-date"))
        assert result.criteria["Deadline is future"].status == "true"


# ---------------------------------------------------------------------------
# Grant size enforcement
# ---------------------------------------------------------------------------

class TestGrantSizeEnforcement:
    def test_usd_below_threshold_downgrades(self, classifier):
        result = classifier._enforce_hard_criteria(
            _classification(funding_max=30_000, funding_currency="USD")
        )
        cr = result.criteria["Grant size above threshold"]
        assert cr.status == "false"
        assert not result.eligible
        assert "50000 USD threshold" in (cr.evidence or "")

    def test_usd_above_threshold_kept(self, classifier):
        future = (datetime.now(timezone.utc).date() + timedelta(days=30)).isoformat()
        result = classifier._enforce_hard_criteria(
            _classification(deadline=future, funding_max=100_000, funding_currency="USD")
        )
        assert result.criteria["Grant size above threshold"].status == "true"
        assert result.eligible

    def test_eur_below_threshold_downgrades(self, classifier):
        # 30k EUR * 1.05 = ~31.5k USD, below 50k
        result = classifier._enforce_hard_criteria(
            _classification(funding_max=30_000, funding_currency="EUR")
        )
        assert result.criteria["Grant size above threshold"].status == "false"

    def test_eur_above_threshold_kept(self, classifier):
        # 100k EUR * 1.05 = 105k USD, above threshold
        result = classifier._enforce_hard_criteria(
            _classification(funding_max=100_000, funding_currency="EUR")
        )
        assert result.criteria["Grant size above threshold"].status == "true"

    def test_missing_currency_assumed_usd(self, classifier):
        result = classifier._enforce_hard_criteria(
            _classification(funding_max=20_000, funding_currency=None)
        )
        assert result.criteria["Grant size above threshold"].status == "false"

    def test_unknown_currency_leaves_status_alone(self, classifier):
        # ZWL (Zimbabwe dollar) not in FX_TO_USD
        result = classifier._enforce_hard_criteria(
            _classification(funding_max=10_000, funding_currency="ZWL")
        )
        assert result.criteria["Grant size above threshold"].status == "true"

    def test_missing_funding_max_leaves_status_alone(self, classifier):
        result = classifier._enforce_hard_criteria(
            _classification(funding_max=None, funding_currency="USD")
        )
        assert result.criteria["Grant size above threshold"].status == "true"

    def test_currency_is_case_insensitive(self, classifier):
        result = classifier._enforce_hard_criteria(
            _classification(funding_max=30_000, funding_currency="eur")
        )
        assert result.criteria["Grant size above threshold"].status == "false"


# ---------------------------------------------------------------------------
# Funding instrument (loan keyword warning)
# ---------------------------------------------------------------------------

class TestFundingInstrumentCheck:
    def test_loan_keyword_logs_warning_but_keeps_true(self, classifier, caplog):
        result = classifier._enforce_hard_criteria(
            _classification(
                classification_summary="This grant includes a repayable loan component alongside the grant window.",
                funding_max=200_000,
                funding_currency="USD",
            )
        )
        # Status NOT downgraded - warning only
        assert result.criteria["Funding instrument is grant"].status == "true"
        # Warning was emitted
        assert any("loan-related terms detected" in r.message for r in caplog.records)

    def test_no_loan_keywords_no_warning(self, classifier, caplog):
        classifier._enforce_hard_criteria(
            _classification(
                classification_summary="Straightforward non-reimbursable grant for NGOs.",
                funding_max=200_000,
                funding_currency="USD",
            )
        )
        assert not any("loan-related" in r.message for r in caplog.records)

    def test_warning_skipped_when_grant_already_false(self, classifier, caplog):
        c = _classification(
            classification_summary="This is a loan facility.",
            funding_max=200_000,
            funding_currency="USD",
        )
        c.criteria["Funding instrument is grant"].status = "false"
        classifier._enforce_hard_criteria(c)
        # Already false - no point warning, so no warning log
        assert not any("loan-related" in r.message for r in caplog.records)


# ---------------------------------------------------------------------------
# eligible cascade from any hard criterion = false
# ---------------------------------------------------------------------------

class TestEligibleCascade:
    def test_any_hard_false_forces_eligible_false(self, classifier):
        c = _classification()
        c.criteria["ILO Eligibility"].status = "false"
        result = classifier._enforce_hard_criteria(c)
        assert not result.eligible
        assert "ILO Eligibility" in (result.exclusion_reason or "")

    def test_existing_exclusion_reason_preserved(self, classifier):
        c = _classification(exclusion_reason="Custom LLM reason.")
        c.criteria["ILO Eligibility"].status = "false"
        result = classifier._enforce_hard_criteria(c)
        assert result.exclusion_reason == "Custom LLM reason."

    def test_all_hard_true_keeps_eligible(self, classifier):
        future = (datetime.now(timezone.utc).date() + timedelta(days=10)).isoformat()
        result = classifier._enforce_hard_criteria(
            _classification(
                deadline=future,
                funding_max=100_000,
                funding_currency="USD",
            )
        )
        assert result.eligible


# ---------------------------------------------------------------------------
# FX table sanity
# ---------------------------------------------------------------------------

def test_fx_table_includes_common_currencies():
    for code in ("USD", "EUR", "GBP", "CHF", "CAD", "AUD", "JPY"):
        assert code in FX_TO_USD
        assert FX_TO_USD[code] > 0


def test_threshold_is_50k_usd():
    assert GRANT_SIZE_THRESHOLD_USD == 50_000.0


# ---------------------------------------------------------------------------
# Hard-criterion backfill (LLM silently drops criteria from output)
# ---------------------------------------------------------------------------

class TestHardCriterionBackfill:
    def test_missing_c10_backfilled_as_unknown(self, classifier):
        """When the LLM omits C10 entirely, post-processing must add it back."""
        future = (datetime.now(timezone.utc).date() + timedelta(days=30)).isoformat()
        c = _classification(deadline=future)
        assert ACTIVE_CALL_CRITERION not in c.criteria
        result = classifier._enforce_hard_criteria(c)
        assert ACTIVE_CALL_CRITERION in result.criteria
        # With a future deadline, C10 stays unknown (guard doesn't fire)
        assert result.criteria[ACTIVE_CALL_CRITERION].status == "unknown"

    def test_all_hard_criteria_present_after_enforcement(self, classifier, criteria):
        future = (datetime.now(timezone.utc).date() + timedelta(days=30)).isoformat()
        result = classifier._enforce_hard_criteria(_classification(deadline=future))
        for c in criteria:
            if c["hard"]:
                assert c["fieldName"] in result.criteria

    def test_existing_criterion_not_overwritten_by_backfill(self, classifier):
        future = (datetime.now(timezone.utc).date() + timedelta(days=30)).isoformat()
        c = _classification(deadline=future)
        c.criteria[ACTIVE_CALL_CRITERION] = CriterionResult(
            status="true", evidence="LLM evaluated this explicitly."
        )
        result = classifier._enforce_hard_criteria(c)
        assert result.criteria[ACTIVE_CALL_CRITERION].evidence == "LLM evaluated this explicitly."


# ---------------------------------------------------------------------------
# Active-call window guard (catches instruction / process / annual-programming pages)
# ---------------------------------------------------------------------------

class TestActiveCallWindow:
    def test_no_deadline_no_milestone_downgrades_unknown_to_false(self, classifier):
        """The DRL/TIP State Dept regression: page describes process, no deadline."""
        c = _classification()
        # Simulate LLM omitting C10 (the actual State Dept failure mode)
        result = classifier._enforce_hard_criteria(c)
        assert result.criteria[ACTIVE_CALL_CRITERION].status == "false"
        assert not result.eligible
        assert ACTIVE_CALL_CRITERION in (result.exclusion_reason or "")

    def test_no_deadline_no_milestone_downgrades_true_to_false(self, classifier):
        """LLM optimistically marked C10 true on a process page — override."""
        c = _classification()
        c.criteria[ACTIVE_CALL_CRITERION] = CriterionResult(status="true")
        result = classifier._enforce_hard_criteria(c)
        assert result.criteria[ACTIVE_CALL_CRITERION].status == "false"

    def test_future_deadline_protects_c10(self, classifier):
        future = (datetime.now(timezone.utc).date() + timedelta(days=10)).isoformat()
        c = _classification(deadline=future)
        c.criteria[ACTIVE_CALL_CRITERION] = CriterionResult(status="true")
        result = classifier._enforce_hard_criteria(c)
        assert result.criteria[ACTIVE_CALL_CRITERION].status == "true"
        assert result.eligible

    def test_dated_application_stage_protects_c10(self, classifier):
        """Even without a top-level deadline, a dated milestone counts as concrete."""
        future = (datetime.now(timezone.utc).date() + timedelta(days=20)).isoformat()
        c = _classification(
            funding_max=100_000,
            funding_currency="USD",
            application_process=[
                ApplicationStage(date=future, description="Concept note submission"),
            ],
        )
        c.criteria[ACTIVE_CALL_CRITERION] = CriterionResult(status="true")
        result = classifier._enforce_hard_criteria(c)
        assert result.criteria[ACTIVE_CALL_CRITERION].status == "true"

    def test_undated_application_stage_does_not_protect_c10(self, classifier):
        """A milestone with no date provides no anchor."""
        c = _classification(
            application_process=[
                ApplicationStage(date=None, description="Submit concept note"),
            ],
        )
        c.criteria[ACTIVE_CALL_CRITERION] = CriterionResult(status="true")
        result = classifier._enforce_hard_criteria(c)
        assert result.criteria[ACTIVE_CALL_CRITERION].status == "false"

    def test_existing_false_status_left_alone(self, classifier):
        c = _classification()
        c.criteria[ACTIVE_CALL_CRITERION] = CriterionResult(
            status="false", evidence="LLM explicitly identified this as an aggregator page."
        )
        result = classifier._enforce_hard_criteria(c)
        # Existing evidence preserved
        assert "aggregator" in (result.criteria[ACTIVE_CALL_CRITERION].evidence or "")


# ---------------------------------------------------------------------------
# Display status (window_status / eligibility_verdict)
# ---------------------------------------------------------------------------

def _full_criteria(**overrides):
    """All 6 hard criteria passing, overridable by field name."""
    criteria = {
        "ILO Eligibility": "true",
        "Funding instrument is grant": "true",
        "Grant size above threshold": "true",
        "Funding objective is ILO-implementable": "true",
        DEADLINE_CRITERION: "true",
        ACTIVE_CALL_CRITERION: "true",
    }
    criteria.update(overrides)
    return {name: CriterionResult(status=status) for name, status in criteria.items()}


class TestDisplayStatus:
    HARD = {
        "ILO Eligibility",
        "Funding instrument is grant",
        "Grant size above threshold",
        "Funding objective is ILO-implementable",
        DEADLINE_CRITERION,
        ACTIVE_CALL_CRITERION,
    }

    def test_open_and_eligible(self):
        window, verdict = derive_display_status(_full_criteria(), self.HARD)
        assert (window, verdict) == ("open", "eligible")

    def test_past_deadline_is_closed_not_ineligible(self):
        """The PO's question: a closed window must not read as 'ILO not eligible'."""
        window, verdict = derive_display_status(
            _full_criteria(**{DEADLINE_CRITERION: "false", ACTIVE_CALL_CRITERION: "false"}),
            self.HARD,
        )
        assert window == "closed"
        assert verdict == "eligible"

    def test_ineligible_while_window_open(self):
        window, verdict = derive_display_status(
            _full_criteria(**{"ILO Eligibility": "false"}), self.HARD
        )
        assert (window, verdict) == ("open", "not_eligible")

    def test_closed_and_ineligible_reported_on_both_axes(self):
        window, verdict = derive_display_status(
            _full_criteria(**{DEADLINE_CRITERION: "false", "ILO Eligibility": "false"}),
            self.HARD,
        )
        assert (window, verdict) == ("closed", "not_eligible")

    def test_aggregator_page_is_not_a_call(self):
        """C10 false on its own means the page is not a live call at all."""
        window, verdict = derive_display_status(
            _full_criteria(**{ACTIVE_CALL_CRITERION: "false"}), self.HARD
        )
        assert window == "not_a_call"

    def test_deadline_takes_precedence_over_not_a_call(self):
        window, _ = derive_display_status(
            _full_criteria(**{DEADLINE_CRITERION: "false", ACTIVE_CALL_CRITERION: "false"}),
            self.HARD,
        )
        assert window == "closed"

    def test_unknown_substantive_criterion_yields_unknown_verdict(self):
        _, verdict = derive_display_status(
            _full_criteria(**{"Grant size above threshold": "unknown"}), self.HARD
        )
        assert verdict == "unknown"

    def test_unknown_time_criterion_yields_unknown_window(self):
        window, _ = derive_display_status(
            _full_criteria(**{DEADLINE_CRITERION: "unknown"}), self.HARD
        )
        assert window == "unknown"

    def test_missing_criteria_do_not_raise(self):
        window, verdict = derive_display_status({}, self.HARD)
        assert (window, verdict) == ("unknown", "unknown")

    def test_enforcement_sets_fields_on_classification(self, classifier):
        past = (datetime.now(timezone.utc).date() - timedelta(days=5)).isoformat()
        c = _classification(deadline=past, funding_max=100_000, funding_currency="USD")
        c.criteria = _full_criteria()
        result = classifier._enforce_hard_criteria(c)
        assert not result.eligible
        assert result.window_status == "closed"
        assert result.eligibility_verdict == "eligible"

    def test_llm_supplied_values_are_overwritten(self, classifier):
        future = (datetime.now(timezone.utc).date() + timedelta(days=30)).isoformat()
        c = _classification(
            deadline=future,
            funding_max=100_000,
            funding_currency="USD",
            window_status="closed",
            eligibility_verdict="not_eligible",
        )
        c.criteria = _full_criteria()
        result = classifier._enforce_hard_criteria(c)
        assert result.window_status == "open"
        assert result.eligibility_verdict == "eligible"


class TestContentHeader:
    """The prompt must not claim a truncation that did not happen.

    Regression guard for the CFLI South Africa case: the page was passed whole
    (7k chars, well under the 40k limit) yet the header announced "truncated to
    40000 chars", and the model duly reported the deadline and the grant ceiling
    as absent "in the truncated page content" - both were present.
    """

    def test_untruncated_content_is_announced_as_complete(self):
        header = CfpClassifier._content_header("Primary CfP page content", 7020, 7020, 40000)
        assert "COMPLETE" in header
        assert "TRUNCATED" not in header
        assert "7020" in header

    def test_truncated_content_says_so_with_both_sizes(self):
        header = CfpClassifier._content_header("Primary CfP page content", 40000, 52000, 40000)
        assert "TRUNCATED" in header
        assert "40000" in header and "52000" in header

    def test_exactly_at_the_limit_is_complete(self):
        """A page the same size as the cap lost nothing."""
        header = CfpClassifier._content_header("Content", 40000, 40000, 40000)
        assert "COMPLETE" in header
