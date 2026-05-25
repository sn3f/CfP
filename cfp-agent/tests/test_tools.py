from unittest.mock import patch

from tools import (
    _is_docx_url,
    _is_pdf_url,
    _map_eu_tenders_item,
    _normalize_url,
    extract_candidate_document_links,
    scrape_url,
)


# ---------------------------------------------------------------------------
# _normalize_url
# ---------------------------------------------------------------------------

class TestNormalizeUrl:
    def test_strips_trailing_slash_and_fragment(self):
        assert _normalize_url("https://x.com/page/") == "https://x.com/page"

    def test_lowercases_scheme_and_host(self):
        assert _normalize_url("HTTPS://EXAMPLE.COM/Page") == "https://example.com/Page"

    def test_preserves_query_string(self):
        assert _normalize_url("https://x.com/?q=1") == "https://x.com?q=1"

    def test_empty_input_returns_empty(self):
        assert _normalize_url("") == ""
        assert _normalize_url("   ") == ""

    def test_malformed_ipv6_url_does_not_crash(self):
        """urlsplit raises ValueError on 'https://[...' — fall back to trimmed input."""
        result = _normalize_url("https://[malformed/path")
        assert result  # non-empty string, no exception


# ---------------------------------------------------------------------------
# _is_pdf_url / _is_docx_url
# ---------------------------------------------------------------------------

class TestDocTypeDetection:
    def test_pdf_in_path(self):
        assert _is_pdf_url("https://x.com/doc.pdf")

    def test_pdf_percent_encoded(self):
        assert _is_pdf_url("https://x.com/annex%20a.pdf")

    def test_docx_in_path(self):
        assert _is_docx_url("https://x.com/tor.docx")

    def test_html_is_not_pdf_or_docx(self):
        assert not _is_pdf_url("https://x.com/page.html")
        assert not _is_docx_url("https://x.com/page.html")


# ---------------------------------------------------------------------------
# extract_candidate_document_links
# ---------------------------------------------------------------------------

class TestExtractCandidateDocumentLinks:
    BASE = "https://example.org/cfp"

    def test_finds_pdf_by_keyword_in_context(self):
        md = "See the [Terms of Reference](https://example.org/tor.pdf) for details."
        links = extract_candidate_document_links(md, self.BASE)
        assert any(l["url"].endswith("tor.pdf") for l in links)

    def test_ignores_base_url_itself(self):
        md = f"Back to [home]({self.BASE})"
        links = extract_candidate_document_links(md, self.BASE)
        assert not any(l["url"] == self.BASE for l in links)

    def test_malformed_ipv6_url_skipped_without_crash(self):
        """Regression test: malformed `https://[...` used to crash the whole source
        via urljoin ValueError('Invalid IPv6 URL'). Should now be silently skipped."""
        md = (
            "[Guidelines](https://example.org/guidelines.pdf)\n"
            "Broken: https://[malformed-host\n"
            "[Annex](https://example.org/annex.docx)"
        )
        links = extract_candidate_document_links(md, self.BASE)
        # Good links still extracted
        urls = {l["url"] for l in links}
        assert any("guidelines.pdf" in u for u in urls)
        assert any("annex.docx" in u for u in urls)

    def test_non_scoring_urls_dropped(self):
        """URLs without supporting-doc signals should score 0 and be excluded."""
        md = "Visit [our home](https://example.org/about.html) for info."
        links = extract_candidate_document_links(md, self.BASE)
        # about.html has no keyword context and no doc extension -> score 0
        assert all("about.html" not in l["url"] for l in links)

    def test_respects_limit(self):
        lines = "\n".join(
            f"[ToR {i}](https://example.org/tor-{i}.pdf)" for i in range(50)
        )
        links = extract_candidate_document_links(lines, self.BASE, limit=5)
        assert len(links) == 5

    def test_ranked_by_score_descending(self):
        # .pdf (180) + "terms of reference" (high) should outrank plain .pdf without context
        md = (
            "[Random doc](https://example.org/random.pdf)\n"
            "[Terms of Reference document](https://example.org/tor.pdf)"
        )
        links = extract_candidate_document_links(md, self.BASE)
        assert len(links) >= 2
        assert links[0]["score"] >= links[1]["score"]

    def test_relative_urls_resolved_against_base(self):
        md = "[Annex](https://example.org/attachments/annex.pdf)"
        links = extract_candidate_document_links(md, "https://example.org/cfp")
        assert any(l["url"].startswith("https://example.org/attachments/") for l in links)


# ---------------------------------------------------------------------------
# scrape_url - X-Engine: browser fallback (P3-C2)
# ---------------------------------------------------------------------------

class TestScrapeUrlForceJs:
    def test_auto_mode_omits_engine_header(self):
        with patch("tools._request_with_retries", return_value="ok") as mock_req:
            scrape_url("https://example.org")
        kwargs = mock_req.call_args.kwargs
        headers = kwargs["headers"]
        assert "X-Engine" not in headers
        assert kwargs["namespace"] == "jina_markdown"

    def test_force_js_sets_browser_engine(self):
        with patch("tools._request_with_retries", return_value="ok") as mock_req:
            scrape_url("https://example.org", force_js=True)
        kwargs = mock_req.call_args.kwargs
        headers = kwargs["headers"]
        assert headers["X-Engine"] == "browser"
        assert headers["X-Timeout"] == "60"
        # Browser mode uses a distinct cache namespace so an earlier auto-mode
        # empty result doesn't poison the browser-mode retry.
        assert kwargs["namespace"] == "jina_markdown_browser"
        # Effective timeout bumped from default 30s to >= 75s.
        assert kwargs["timeout"] >= 75

    def test_force_js_respects_custom_timeout_floor(self):
        with patch("tools._request_with_retries", return_value="ok") as mock_req:
            scrape_url("https://example.org", timeout=120, force_js=True)
        # Should not shrink a caller-provided larger timeout.
        assert mock_req.call_args.kwargs["timeout"] == 120

    def test_empty_string_on_exception(self):
        with patch("tools._request_with_retries", side_effect=RuntimeError("boom")):
            assert scrape_url("https://example.org", force_js=True) == ""


# ---------------------------------------------------------------------------
# _map_eu_tenders_item (P4-C: SEDIA item -> CfP candidate)
# ---------------------------------------------------------------------------

class TestMapEuTendersItem:
    """URL mapping per result type mirrors legacy SearchResultItemViewMapper.
    See `git show ce72154:.../eufundingapi/SearchResultItemViewMapper.java`.
    """

    def test_type_8_builds_competitive_calls_url_from_callccm2Id(self):
        item = {
            "reference": "ignored-for-type-8",
            "url": "https://fallback.example/orig",
            "title": "Item-level title (ignored)",
            "summary": "Short description here",
            "metadata": {
                "type": ["8"],
                "callccm2Id": ["42123"],
                "callTitle": ["The Real Title"],
                "deadlineDate": ["2026-12-31T23:59:00.000+0000"],
            },
        }
        result = _map_eu_tenders_item(item)
        assert result["url"] == (
            "https://ec.europa.eu/info/funding-tenders/opportunities/portal/"
            "screen/opportunities/competitive-calls-cs/42123"
        )
        assert result["title"] == "The Real Title"
        assert result["deadline"] == "2026-12-31T23:59:00.000+0000"
        assert result["description"] == "Short description here"

    def test_type_8_falls_back_to_item_url_when_callccm2Id_missing(self):
        item = {
            "url": "https://fallback.example/orig",
            "metadata": {"type": ["8"]},
        }
        assert _map_eu_tenders_item(item)["url"] == "https://fallback.example/orig"

    def test_type_2_builds_prospect_details_url_from_reference(self):
        item = {
            "reference": "ESF-2026-XYZ",
            "url": "https://fallback.example/orig",
            "metadata": {"type": ["2"], "title": ["Some Title"]},
        }
        assert _map_eu_tenders_item(item)["url"] == (
            "https://ec.europa.eu/info/funding-tenders/opportunities/portal/"
            "screen/opportunities/prospect-details/ESF-2026-XYZ"
        )

    def test_type_2_falls_back_to_item_url_when_reference_empty(self):
        item = {
            "reference": "",
            "url": "https://fallback.example/orig",
            "metadata": {"type": ["2"]},
        }
        assert _map_eu_tenders_item(item)["url"] == "https://fallback.example/orig"

    def test_type_1_uses_item_native_url(self):
        item = {
            "url": "https://ec.europa.eu/.../topic-details/HORIZON-CL5-2027-01-D1",
            "metadata": {"type": ["1"], "title": ["CLIMATE"]},
        }
        assert _map_eu_tenders_item(item)["url"] == (
            "https://ec.europa.eu/.../topic-details/HORIZON-CL5-2027-01-D1"
        )

    def test_title_fallback_callTitle_then_metadata_title_then_item_title(self):
        item_with_callTitle = {
            "title": "item.title",
            "metadata": {"type": ["1"], "callTitle": ["call-title"], "title": ["metadata.title"]},
        }
        assert _map_eu_tenders_item(item_with_callTitle)["title"] == "call-title"

        item_with_metadata_title = {
            "title": "item.title",
            "metadata": {"type": ["1"], "title": ["metadata.title"]},
        }
        assert _map_eu_tenders_item(item_with_metadata_title)["title"] == "metadata.title"

        item_with_item_title = {
            "title": "item.title",
            "metadata": {"type": ["1"]},
        }
        assert _map_eu_tenders_item(item_with_item_title)["title"] == "item.title"

    def test_handles_missing_metadata_gracefully(self):
        item = {}
        result = _map_eu_tenders_item(item)
        assert result["url"] == ""
        assert result["title"] == ""
        assert result["deadline"] is None
        assert result["description"] == ""
