from unittest.mock import MagicMock, patch

from tools import (
    _html_to_text,
    _is_docx_url,
    _is_pdf_url,
    _map_eu_tenders_item,
    _normalize_url,
    extract_candidate_document_links,
    fetch_eu_tenders,
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
        assert result["api_content"] == ""


# ---------------------------------------------------------------------------
# _html_to_text — naive stripper for SEDIA HTML-in-metadata fields
# ---------------------------------------------------------------------------

class TestHtmlToText:
    def test_strips_tags_and_collapses_whitespace(self):
        html = "<p>Hello <strong>world</strong></p>\n\n<p>Line two</p>"
        assert _html_to_text(html) == "Hello world Line two"

    def test_decodes_common_entities(self):
        assert _html_to_text("A &amp; B &lt; C &nbsp;end") == "A & B < C end"

    def test_empty_input_returns_empty(self):
        assert _html_to_text("") == ""
        assert _html_to_text(None) == ""


# ---------------------------------------------------------------------------
# api_content injection for EU SEDIA items (P0.1)
# The classifier needs richer context than the SPA detail page (which Jina
# cannot render). Build content from the API metadata itself.
# ---------------------------------------------------------------------------

class TestEuTendersApiContent:
    def test_type_8_call_includes_beneficiary_administration(self):
        item = {
            "reference": "12345COMPETITIVE_CALLen",
            "summary": "Summary of the call",
            "title": None,
            "metadata": {
                "type": ["8"],
                "callTitle": ["Skills Scholarships Programme"],
                "callccm2Id": ["12345"],
                "identifier": ["DIGITAL-2027-SKILLS"],
                "deadlineDate": ["2027-01-15T17:00:00.000+0000"],
                "deadlineModel": ["multiple cut-off"],
                "startDate": ["2026-07-01T00:00:00.000+0000"],
                "budget": [100000],
                "currency": ["EUR"],
                "programmePeriod": ["2021 - 2027"],
                "beneficiaryAdministration": [
                    "<p>OVERVIEW</p><p>Eligible applicants include universities and research institutions.</p>"
                ],
                "furtherInformation": [
                    "<p>Legal disclaimer: The financing agreement is subject to EU rules.</p>"
                ],
                "topicConditions": [
                    "<p>Applicants must be established in an EU or associated country.</p>"
                ],
            },
        }
        result = _map_eu_tenders_item(item)
        content = result["api_content"]
        assert "Skills Scholarships Programme" in content
        assert "DIGITAL-2027-SKILLS" in content
        assert "2027-01-15" in content
        assert "100000 EUR" in content or "100000  EUR" in content
        assert "Eligible applicants include universities" in content
        assert "Legal disclaimer" in content
        assert "Applicants must be established" in content
        # HTML tags stripped
        assert "<p>" not in content
        assert "</p>" not in content

    def test_type_2_call_falls_back_to_thin_content_when_html_fields_empty(self):
        """NDICI prospect calls (type=2) have empty beneficiaryAdministration
        etc. — we still emit title + identifier + deadline + summary."""
        item = {
            "reference": "186571PROSPECTSEN",
            "summary": "Civil Society, Human Rights and ESG Accountability for South Africa",
            "title": None,
            "metadata": {
                "type": ["2"],
                "title": ["Civil Society, Human Rights and ESG Accountability for South Africa"],
                "identifier": ["EuropeAid/186571/DD/ACT/ZA"],
                "deadlineDate": ["2026-07-23T10:00:44.000+0000"],
                "startDate": ["2026-04-24T10:00:34.000+0000"],
                "budget": [5164000],
                "currency": ["EUR"],
                "programmePeriod": ["2014 - 2020"],
                "beneficiaryAdministration": [],  # empty, as observed on real API
                "descriptionByte": [],
            },
        }
        result = _map_eu_tenders_item(item)
        content = result["api_content"]
        assert "EuropeAid/186571/DD/ACT/ZA" in content
        assert "2026-07-23" in content
        assert "5164000 EUR" in content
        assert "Civil Society, Human Rights and ESG Accountability" in content

    def test_budget_extracted_from_list_wrapping(self):
        """Regression guard: metadata.budget arrives as a list — must not print
        as literal `['100000']` string."""
        item = {
            "metadata": {"type": ["8"], "budget": ["100000"], "currency": ["EUR"]},
        }
        content = _map_eu_tenders_item(item)["api_content"]
        assert "['100000']" not in content
        assert "100000 EUR" in content or "100000  EUR" in content


# ---------------------------------------------------------------------------
# fetch_eu_tenders retry behaviour
# SEDIA returned empty in 1 of 4 weekly scans (2026-06-22) despite working
# fine on either side — we now retry once on empty response.
# ---------------------------------------------------------------------------

def _make_post_response(payload):
    """Build a fake httpx Response object usable by fetch_eu_tenders."""
    resp = MagicMock()
    resp.json.return_value = payload
    resp.raise_for_status.return_value = None
    return resp


class TestFetchEuTendersRetry:
    def test_returns_results_on_first_success(self):
        items = [{"reference": "REF1", "url": "https://x", "title": "T",
                  "summary": "s", "metadata": {"type": ["2"]}}]
        client = MagicMock()
        client.post.return_value = _make_post_response({"totalResults": 1, "results": items})
        with patch("tools._http_client", return_value=client), \
                patch("tools.time.sleep") as sleep_mock:
            r = fetch_eu_tenders("https://api.example/search")
        assert len(r) == 1
        assert client.post.call_count == 1
        sleep_mock.assert_not_called()

    def test_retries_once_on_empty_then_returns_results(self):
        items = [{"reference": "REF1", "url": "https://x", "title": "T",
                  "summary": "s", "metadata": {"type": ["2"]}}]
        client = MagicMock()
        client.post.side_effect = [
            _make_post_response({"totalResults": 0, "results": []}),
            _make_post_response({"totalResults": 1, "results": items}),
        ]
        with patch("tools._http_client", return_value=client), \
                patch("tools.time.sleep") as sleep_mock:
            r = fetch_eu_tenders("https://api.example/search")
        assert len(r) == 1
        assert client.post.call_count == 2
        sleep_mock.assert_called_once()

    def test_returns_empty_when_both_attempts_empty(self):
        client = MagicMock()
        client.post.return_value = _make_post_response({"totalResults": 0, "results": []})
        with patch("tools._http_client", return_value=client), \
                patch("tools.time.sleep"):
            r = fetch_eu_tenders("https://api.example/search")
        assert r == []
        assert client.post.call_count == 2

    def test_retries_on_exception_then_succeeds(self):
        items = [{"reference": "REF1", "url": "https://x", "title": "T",
                  "summary": "s", "metadata": {"type": ["2"]}}]
        client = MagicMock()
        client.post.side_effect = [
            RuntimeError("transient network failure"),
            _make_post_response({"totalResults": 1, "results": items}),
        ]
        with patch("tools._http_client", return_value=client), \
                patch("tools.time.sleep"):
            r = fetch_eu_tenders("https://api.example/search")
        assert len(r) == 1
        assert client.post.call_count == 2

    def test_sends_apikey_text_and_pagesize_in_url(self):
        client = MagicMock()
        client.post.return_value = _make_post_response({"totalResults": 0, "results": []})
        with patch("tools._http_client", return_value=client), patch("tools.time.sleep"):
            fetch_eu_tenders("https://api.example/search", max_results=42)
        url_called = client.post.call_args.args[0]
        assert "apiKey=SEDIA" in url_called
        assert "text=***" in url_called
        assert "pageSize=42" in url_called

    def test_query_excludes_horizon_topic_type_1(self):
        """Regression guard — type=1 is Horizon Europe research, classifier rejects
        all of them but they dominate relevance sort and starve the 20-cap. Filter
        at SEDIA query level instead. See phase4_lost_and_recovery memory."""
        client = MagicMock()
        client.post.return_value = _make_post_response({"totalResults": 0, "results": []})
        with patch("tools._http_client", return_value=client), patch("tools.time.sleep"):
            fetch_eu_tenders("https://api.example/search")
        files = client.post.call_args.kwargs["files"]
        query_field = files["query"][1]
        assert '"type":["2","8"]' in query_field
        assert '"type":["1","2","8"]' not in query_field
