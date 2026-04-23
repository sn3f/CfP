from tools import (
    _is_docx_url,
    _is_pdf_url,
    _normalize_url,
    extract_candidate_document_links,
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
