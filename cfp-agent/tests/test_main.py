from datetime import datetime, timedelta, timezone

import pytest

from main import (
    _diagnose_source_issues,
    _diff_decision,
    _new_source_stats,
    dedupe_urls,
    match_sources,
    normalize_cfp_url,
)


# ---------------------------------------------------------------------------
# normalize_cfp_url
# ---------------------------------------------------------------------------

class TestNormalizeCfpUrl:
    def test_strips_trailing_slash(self):
        assert normalize_cfp_url("https://example.com/page/") == "https://example.com/page"

    def test_drops_fragment(self):
        assert (
            normalize_cfp_url("https://example.com/page#section")
            == "https://example.com/page"
        )

    def test_lowercases_scheme_and_netloc(self):
        assert (
            normalize_cfp_url("HTTPS://Example.COM/Page")
            == "https://example.com/Page"
        )

    def test_preserves_query_string(self):
        assert (
            normalize_cfp_url("https://example.com/page?foo=bar&baz=qux")
            == "https://example.com/page?foo=bar&baz=qux"
        )

    def test_strips_utm_params(self):
        assert (
            normalize_cfp_url("https://example.com/page?utm_source=x&utm_medium=y&id=42")
            == "https://example.com/page?id=42"
        )

    def test_strips_click_ids(self):
        assert (
            normalize_cfp_url("https://example.com/page?fbclid=abc&gclid=def")
            == "https://example.com/page"
        )

    def test_strips_mailchimp_params(self):
        assert (
            normalize_cfp_url("https://example.com/page?mc_cid=1&mc_eid=2&q=keep")
            == "https://example.com/page?q=keep"
        )

    def test_strips_hubspot_prefix(self):
        assert (
            normalize_cfp_url("https://example.com/page?_hsenc=abc&_hsmi=def&id=42")
            == "https://example.com/page?id=42"
        )

    def test_two_urls_differing_only_by_utm_dedupe_together(self):
        urls = [
            "https://example.com/cfp?utm_source=twitter",
            "https://example.com/cfp?utm_source=linkedin",
        ]
        unique, dup_count = dedupe_urls(urls)
        assert len(unique) == 1
        assert dup_count == 1

    def test_empty_input_returns_empty(self):
        assert normalize_cfp_url("") == ""
        assert normalize_cfp_url("   ") == ""

    def test_handles_malformed_ipv6_url_without_crashing(self):
        """Should not raise - falls back to trimmed input on urlsplit failure."""
        result = normalize_cfp_url("https://[malformed-host/path")
        assert result  # some string returned, not a crash


# ---------------------------------------------------------------------------
# dedupe_urls
# ---------------------------------------------------------------------------

class TestDedupeUrls:
    def test_removes_exact_duplicates(self):
        urls = [
            "https://example.com/a",
            "https://example.com/b",
            "https://example.com/a",
        ]
        unique, dup_count = dedupe_urls(urls)
        assert len(unique) == 2
        assert dup_count == 1

    def test_treats_case_and_trailing_slash_as_duplicate(self):
        urls = [
            "https://Example.com/Page/",
            "https://example.com/Page",
        ]
        unique, dup_count = dedupe_urls(urls)
        assert len(unique) == 1
        assert dup_count == 1

    def test_preserves_first_seen_order(self):
        urls = [
            "https://example.com/c",
            "https://example.com/a",
            "https://example.com/b",
        ]
        unique, _ = dedupe_urls(urls)
        assert unique == [
            "https://example.com/c",
            "https://example.com/a",
            "https://example.com/b",
        ]

    def test_empty_strings_are_dropped(self):
        unique, _ = dedupe_urls(["", "https://example.com/a", "  "])
        assert unique == ["https://example.com/a"]


# ---------------------------------------------------------------------------
# _diff_decision
# ---------------------------------------------------------------------------

class TestDiffDecision:
    def setup_method(self):
        self.now = datetime(2026, 4, 23, 12, 0, tzinfo=timezone.utc)

    def test_past_deadline_dropped(self):
        prior = {
            "deadline": "2026-04-01",
            "scraped_at": "2026-04-20T00:00:00+00:00",
        }
        assert _diff_decision(prior, self.now, max_age_days=30) == "drop"

    def test_future_deadline_fresh_reused(self):
        prior = {
            "deadline": "2026-05-15",
            "scraped_at": "2026-04-20T00:00:00+00:00",
        }
        assert _diff_decision(prior, self.now, max_age_days=30) == "reuse"

    def test_stale_entry_reclassified(self):
        prior = {
            "deadline": "2026-06-01",
            "scraped_at": "2026-02-01T00:00:00+00:00",
        }
        assert _diff_decision(prior, self.now, max_age_days=30) == "reclassify"

    def test_missing_scraped_at_reclassified(self):
        prior = {"deadline": "2026-06-01"}
        assert _diff_decision(prior, self.now, max_age_days=30) == "reclassify"

    def test_naive_scraped_at_assumed_utc(self):
        prior = {
            "deadline": "2026-06-01",
            "scraped_at": "2026-04-20T00:00:00",
        }
        assert _diff_decision(prior, self.now, max_age_days=30) == "reuse"

    def test_unparseable_deadline_falls_through_to_staleness(self):
        prior = {
            "deadline": "next month",
            "scraped_at": "2026-04-20T00:00:00+00:00",
        }
        assert _diff_decision(prior, self.now, max_age_days=30) == "reuse"


# ---------------------------------------------------------------------------
# _diagnose_source_issues
# ---------------------------------------------------------------------------

def _stats(**overrides):
    base = _new_source_stats({"name": "X", "url": "https://x"})
    base.update(overrides)
    return base


class TestDiagnoseSourceIssues:
    def test_healthy_source_no_issue(self):
        s = _stats(
            listing_chars=30000,
            links_found=5,
            cfps_processed=3,
            cfps_reused=2,
        )
        assert _diagnose_source_issues([s]) == []

    def test_error_surfaces_as_issue(self):
        s = _stats(error="ValueError: Invalid IPv6 URL")
        issues = _diagnose_source_issues([s])
        assert len(issues) == 1
        assert issues[0]["kind"] == "error"

    def test_js_rendered_detected_via_loading_warning(self):
        s = _stats(listing_chars=187, listing_loading_warning=True)
        issues = _diagnose_source_issues([s])
        assert issues[0]["kind"] == "silent_zero"
        assert "not fully loaded" in issues[0]["detail"]

    def test_tiny_listing_reported_as_broken_scraper(self):
        s = _stats(listing_chars=50)
        issues = _diagnose_source_issues([s])
        assert "scraper likely broken" in issues[0]["detail"]

    def test_api_and_scraping_both_empty(self):
        s = _stats(
            via_api=True,
            api_items_returned=0,
            listing_chars=0,
            api_fallback_to_scraping=True,
        )
        issues = _diagnose_source_issues([s])
        assert "API returned 0 items" in issues[0]["detail"]

    def test_listing_big_but_no_links_points_to_wrong_url(self):
        s = _stats(listing_chars=30000, links_found=0)
        issues = _diagnose_source_issues([s])
        assert "may not be a listing page" in issues[0]["detail"]

    def test_high_classification_failure_rate(self):
        s = _stats(
            listing_chars=30000,
            links_found=4,
            cfps_processed=4,
            classification_failures=3,
        )
        issues = _diagnose_source_issues([s])
        assert issues[0]["kind"] == "classification_failures"

    def test_low_failure_rate_not_flagged(self):
        s = _stats(
            listing_chars=30000,
            links_found=10,
            cfps_processed=10,
            classification_failures=1,  # 10% failure, below threshold
        )
        assert _diagnose_source_issues([s]) == []


# ---------------------------------------------------------------------------
# match_sources (D6)
# ---------------------------------------------------------------------------

SAMPLE_SOURCES = [
    {"name": "IFAD - Call for Proposals", "url": "https://ifad.example"},
    {"name": "EU Funding & Tenders Portal", "url": "https://eu.example"},
    {"name": "Canada - CFLI", "url": "https://cfli.example"},
    {"name": "Canada - Open Calls", "url": "https://canada.example"},
]


class TestMatchSources:
    def test_exact_match(self):
        r = match_sources(SAMPLE_SOURCES, "IFAD - Call for Proposals")
        assert len(r) == 1 and r[0]["name"] == "IFAD - Call for Proposals"

    def test_case_insensitive(self):
        r = match_sources(SAMPLE_SOURCES, "ifad - call for proposals")
        assert len(r) == 1 and r[0]["name"] == "IFAD - Call for Proposals"

    def test_whitespace_tolerant(self):
        r = match_sources(SAMPLE_SOURCES, "  IFAD  -  Call for Proposals  ")
        assert len(r) == 1

    def test_substring_match(self):
        r = match_sources(SAMPLE_SOURCES, "IFAD")
        assert len(r) == 1 and r[0]["name"] == "IFAD - Call for Proposals"

    def test_substring_matches_multiple(self):
        r = match_sources(SAMPLE_SOURCES, "canada")
        assert len(r) == 2
        assert {s["name"] for s in r} == {"Canada - CFLI", "Canada - Open Calls"}

    def test_exact_wins_over_substring(self):
        sources = [
            {"name": "UK PACT", "url": "u1"},
            {"name": "UK PACT Legacy", "url": "u2"},
        ]
        r = match_sources(sources, "UK PACT")
        assert len(r) == 1 and r[0]["url"] == "u1"

    def test_no_match_returns_empty(self):
        assert match_sources(SAMPLE_SOURCES, "Nonexistent Source") == []

    def test_empty_query_returns_empty(self):
        assert match_sources(SAMPLE_SOURCES, "") == []
        assert match_sources(SAMPLE_SOURCES, "   ") == []
