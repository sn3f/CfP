import pytest

from models import (
    CfpClassification,
    CriterionResult,
    ILO_THEMES,
    LinkList,
    normalize_theme,
)


# ---------------------------------------------------------------------------
# CriterionResult.normalize_status
# ---------------------------------------------------------------------------

class TestCriterionStatus:
    @pytest.mark.parametrize("raw,expected", [
        ("true", "true"),
        ("false", "false"),
        ("unknown", "unknown"),
        ("TRUE", "true"),
        ("False", "false"),
        (" true ", "true"),
    ])
    def test_canonical_values(self, raw, expected):
        assert CriterionResult(status=raw).status == expected

    @pytest.mark.parametrize("raw", [None, "", "null", "none", "N/A", "na"])
    def test_empty_and_null_variants_collapse_to_unknown(self, raw):
        assert CriterionResult(status=raw).status == "unknown"

    @pytest.mark.parametrize("raw,expected", [(True, "true"), (False, "false")])
    def test_bool_coerced(self, raw, expected):
        assert CriterionResult(status=raw).status == expected

    def test_invalid_string_raises(self):
        with pytest.raises(Exception):
            CriterionResult(status="maybe")


# ---------------------------------------------------------------------------
# normalize_theme
# ---------------------------------------------------------------------------

class TestNormalizeTheme:
    def test_exact_case_insensitive_match(self):
        assert normalize_theme("labour migration") == "Labour Migration"
        assert normalize_theme("LABOUR MIGRATION") == "Labour Migration"

    def test_direct_alias(self):
        assert normalize_theme("entrepreneurship") == "Sustainable Enterprises"
        assert normalize_theme("tvet") == "Skills Development & Vocational Training"

    def test_keyword_rule_for_climate(self):
        result = normalize_theme("climate resilience")
        assert result == "Just Transitions towards Environmentally Sustainable Economies and Societies"

    def test_climate_finance_routes_to_climate_not_finance(self):
        """Q5 regression: 'climate finance' used to map to Sustainable Enterprises
        because the 'finance' keyword matched first. Rule ordering now puts climate
        ahead of finance."""
        result = normalize_theme("climate finance")
        assert result == "Just Transitions towards Environmentally Sustainable Economies and Societies"

    def test_finance_alone_still_routes_to_enterprises(self):
        assert normalize_theme("sustainable finance") == "Sustainable Enterprises"

    def test_keyword_rule_for_employment(self):
        assert normalize_theme("youth jobs and livelihoods") == "Employment Policy & Job Creation"

    def test_unknown_theme_dropped(self):
        assert normalize_theme("cryptocurrency regulation") is None

    def test_non_string_returns_none(self):
        assert normalize_theme(None) is None
        assert normalize_theme(42) is None
        assert normalize_theme([]) is None

    def test_whitespace_only_returns_none(self):
        assert normalize_theme("   ") is None


# ---------------------------------------------------------------------------
# CfpClassification.normalize_themes
# ---------------------------------------------------------------------------

class TestCfpClassificationThemes:
    def _make(self, theme):
        return CfpClassification(
            eligible=True,
            classification_summary="x",
            theme=theme,
        )

    def test_themes_deduplicated(self):
        c = self._make(["Labour Migration", "labour migration", "migration"])
        assert c.theme == ["Labour Migration"]

    def test_unknown_themes_dropped(self):
        c = self._make(["Labour Migration", "cryptocurrency", "decent work"])
        assert "cryptocurrency" not in c.theme
        assert "Labour Migration" in c.theme

    def test_single_string_coerced_to_list(self):
        c = self._make("tvet")
        assert c.theme == ["Skills Development & Vocational Training"]

    def test_none_yields_empty_list(self):
        c = self._make(None)
        assert c.theme == []


# ---------------------------------------------------------------------------
# LinkList
# ---------------------------------------------------------------------------

class TestLinkList:
    def test_accepts_list_of_urls(self):
        ll = LinkList(urls=["https://a.com/1", "https://b.com/2"])
        assert len(ll.urls) == 2

    def test_defaults_to_empty(self):
        assert LinkList().urls == []

    def test_drops_relative_urls(self):
        ll = LinkList(urls=["https://a.com/1", "/relative/path", "../other"])
        assert ll.urls == ["https://a.com/1"]

    def test_drops_non_http_schemes(self):
        ll = LinkList(urls=[
            "https://a.com/1",
            "mailto:foo@bar.com",
            "tel:+1234567890",
            "javascript:void(0)",
            "ftp://a.com/x",
        ])
        assert ll.urls == ["https://a.com/1"]

    def test_drops_blank_strings(self):
        ll = LinkList(urls=["", "   ", "https://a.com/1"])
        assert ll.urls == ["https://a.com/1"]

    def test_deduplicates(self):
        ll = LinkList(urls=["https://a.com/1", "https://a.com/1", "https://b.com/2"])
        assert ll.urls == ["https://a.com/1", "https://b.com/2"]

    def test_trims_whitespace(self):
        ll = LinkList(urls=["  https://a.com/1  "])
        assert ll.urls == ["https://a.com/1"]

    def test_accepts_single_string(self):
        ll = LinkList(urls="https://a.com/1")
        assert ll.urls == ["https://a.com/1"]

    def test_non_string_items_ignored(self):
        ll = LinkList(urls=["https://a.com/1", 42, None, {"not": "url"}])
        assert ll.urls == ["https://a.com/1"]


# ---------------------------------------------------------------------------
# ILO_THEMES sanity
# ---------------------------------------------------------------------------

def test_ilo_themes_is_non_empty_tuple_of_strings():
    assert isinstance(ILO_THEMES, tuple)
    assert len(ILO_THEMES) >= 10
    assert all(isinstance(t, str) and t.strip() for t in ILO_THEMES)
