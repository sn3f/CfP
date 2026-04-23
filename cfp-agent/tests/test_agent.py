from datetime import datetime, timedelta, timezone

import pytest
import yaml

from agent import CfpClassifier, FX_TO_USD, GRANT_SIZE_THRESHOLD_USD
from models import CfpClassification, CriterionResult


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
        result = classifier._enforce_hard_criteria(
            _classification(funding_max=100_000, funding_currency="USD")
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
