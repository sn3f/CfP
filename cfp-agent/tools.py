import httpx
import io
import json
import logging
import os
import re
import time
import zipfile
from urllib.parse import unquote, urljoin, urlsplit, urlunsplit
from xml.etree import ElementTree

logger = logging.getLogger(__name__)

JINA_BASE = "https://r.jina.ai/"
JINA_HEADERS = {"Accept": "text/markdown", "X-Return-Format": "markdown"}
DOCX_CONTENT_TYPE = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
SUPPORTING_DOC_KEYWORDS = {
    "terms of reference": 260,
    "term of reference": 260,
    "tor": 240,
    "evaluation criteria": 230,
    "eligibility": 220,
    "eligible": 180,
    "un entities": 180,
    "self-cert": 200,
    "self certification": 200,
    "budget": 180,
    "expenditure": 170,
    "financial management": 170,
    "procurement guidance": 170,
    "grant policy": 160,
    "general provisions": 160,
    "letter of invitation": 160,
    "concept note": 150,
    "guidance": 130,
    "annex": 90,
}
DISCOVERY_KEYWORDS = (
    "terms of reference",
    "term of reference",
    "tor",
    "evaluation criteria",
    "eligibility",
    "self-cert",
    "budget",
    "financial",
    "general provisions",
    "grant policy",
    "letter of invitation",
    "concept note",
    "guidance",
    "annex",
    "attachment",
    "attachments",
    "download",
)
MAX_SUPPORTING_DOCUMENTS = int(os.getenv("MAX_SUPPORTING_DOCUMENTS", "2"))
MAX_SUPPORTING_DOC_HOPS = int(os.getenv("MAX_SUPPORTING_DOC_HOPS", "2"))
MAX_SUPPORTING_DOC_CHARS = int(os.getenv("MAX_SUPPORTING_DOC_CHARS", "12000"))
WORD_NAMESPACE = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"
RETRIABLE_STATUS_CODES = {408, 425, 429, 500, 502, 503, 504}

_HTTP_CLIENTS: dict[str | None, httpx.Client] = {}
_RESPONSE_CACHE: dict[str, str | bytes | dict | list] = {}


def _proxies() -> dict | None:
    """Return proxy dict from environment if set."""
    proxy = os.environ.get("HTTPS_PROXY") or os.environ.get("HTTP_PROXY")
    if proxy:
        return {"http://": proxy, "https://": proxy}
    return None


def _proxy_url() -> str | None:
    return os.environ.get("HTTPS_PROXY") or os.environ.get("HTTP_PROXY")


def _request_cache_enabled() -> bool:
    return os.environ.get("HTTP_CACHE_ENABLED", "true").strip().lower() != "false"


def _retry_attempts() -> int:
    return max(1, int(os.environ.get("HTTP_RETRY_ATTEMPTS", "3")))


def _retry_base_delay() -> float:
    return max(0.0, float(os.environ.get("HTTP_RETRY_BASE_DELAY_SECONDS", "1.0")))


def _retry_max_delay() -> float:
    return max(0.0, float(os.environ.get("HTTP_RETRY_MAX_DELAY_SECONDS", "8.0")))


def _retry_connect_attempts() -> int:
    return max(0, int(os.environ.get("HTTP_CONNECT_RETRIES", "1")))


def _http_client() -> httpx.Client:
    proxy_url = _proxy_url()
    if proxy_url not in _HTTP_CLIENTS:
        transport = httpx.HTTPTransport(retries=_retry_connect_attempts())
        _HTTP_CLIENTS[proxy_url] = httpx.Client(
            proxy=proxy_url,
            transport=transport,
            follow_redirects=True,
            trust_env=False,
        )
    return _HTTP_CLIENTS[proxy_url]


def _make_cache_key(
    namespace: str,
    method: str,
    url: str,
    *,
    params: dict | None = None,
    json_body: dict | None = None,
    headers: dict | None = None,
) -> str:
    payload = {
        "namespace": namespace,
        "method": method.upper(),
        "url": url,
        "params": params or {},
        "json_body": json_body or {},
        "headers": headers or {},
    }
    return json.dumps(payload, sort_keys=True, ensure_ascii=True, separators=(",", ":"))


def _retry_delay(attempt: int, response: httpx.Response | None = None) -> float:
    if response is not None:
        retry_after = response.headers.get("Retry-After")
        if retry_after:
            try:
                return max(0.0, float(retry_after))
            except ValueError:
                pass

    delay = _retry_base_delay() * (2 ** max(0, attempt - 1))
    return min(delay, _retry_max_delay())


def _request_with_retries(
    method: str,
    url: str,
    *,
    namespace: str,
    params: dict | None = None,
    json_body: dict | None = None,
    headers: dict | None = None,
    timeout: int = 30,
    response_kind: str = "text",
    use_cache: bool = True,
) -> str | bytes | dict | list:
    cache_key = _make_cache_key(
        namespace,
        method,
        url,
        params=params,
        json_body=json_body,
        headers=headers,
    )
    if use_cache and _request_cache_enabled() and cache_key in _RESPONSE_CACHE:
        logger.debug(f"HTTP cache hit [{namespace}] {method.upper()} {url}")
        return _RESPONSE_CACHE[cache_key]

    client = _http_client()
    attempts = _retry_attempts()
    last_error: Exception | None = None

    for attempt in range(1, attempts + 1):
        try:
            response = client.request(
                method,
                url,
                params=params,
                json=json_body,
                headers=headers,
                timeout=timeout,
            )
        except (httpx.TimeoutException, httpx.NetworkError, httpx.RemoteProtocolError) as exc:
            last_error = exc
            if attempt == attempts:
                break
            delay = _retry_delay(attempt)
            logger.warning(
                f"HTTP retry {attempt}/{attempts - 1} after network error on {method.upper()} {url}: {exc}"
            )
            time.sleep(delay)
            continue

        if response.status_code in RETRIABLE_STATUS_CODES and attempt < attempts:
            delay = _retry_delay(attempt, response=response)
            logger.warning(
                f"HTTP retry {attempt}/{attempts - 1} after status {response.status_code} on {method.upper()} {url}"
            )
            time.sleep(delay)
            continue

        response.raise_for_status()
        if response_kind == "bytes":
            payload: str | bytes | dict | list = response.content
        elif response_kind == "json":
            payload = response.json()
        else:
            payload = response.text

        if use_cache and _request_cache_enabled():
            _RESPONSE_CACHE[cache_key] = payload
        return payload

    raise RuntimeError(f"HTTP request failed after {attempts} attempts: {method.upper()} {url}") from last_error


def scrape_url(url: str, timeout: int = 30) -> str:
    """Fetch a URL as clean Markdown via Jina Reader (no API key required)."""
    try:
        return _request_with_retries(
            "GET",
            JINA_BASE + url,
            namespace="jina_markdown",
            headers=JINA_HEADERS,
            timeout=timeout,
            response_kind="text",
        )
    except Exception as e:
        logger.error(f"Jina scrape failed for {url}: {e}")
        return ""


def _normalize_url(url: str) -> str:
    cleaned = (url or "").strip()
    if not cleaned:
        return ""

    try:
        parts = urlsplit(cleaned)
    except ValueError:
        return cleaned.split("#", 1)[0].rstrip("/")

    return urlunsplit(
        (
            parts.scheme.lower(),
            parts.netloc.lower(),
            parts.path.rstrip("/"),
            parts.query,
            "",
        )
    )


def _clean_candidate_context(line: str) -> str:
    text = re.sub(r"https?://[^\s)>]+", " ", line)
    text = re.sub(r"[\[\]()*`|]", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text[:240]


def _is_docx_url(url: str) -> bool:
    decoded = unquote(url).lower()
    return ".docx" in decoded


def _is_pdf_url(url: str) -> bool:
    decoded = unquote(url).lower()
    return ".pdf" in decoded


def _keyword_matches(keyword: str, haystack: str) -> bool:
    if " " in keyword or "-" in keyword:
        return keyword in haystack
    return re.search(rf"(?<![a-z0-9]){re.escape(keyword)}(?![a-z0-9])", haystack) is not None


def _is_documentish_url(url: str, context: str) -> bool:
    decoded = unquote(url).lower()
    haystack = f"{context} {decoded}".lower()
    return any(_keyword_matches(keyword, haystack) for keyword in DISCOVERY_KEYWORDS) or any(
        marker in decoded for marker in (".pdf", ".docx", "/download", "owncloud/s/")
    )


def _score_document_link(url: str, context: str) -> int:
    decoded = unquote(url).lower()
    haystack = f"{context} {decoded}".lower()

    if not _is_documentish_url(url, context):
        return 0

    score = 0
    if _is_pdf_url(url):
        score += 180
    if _is_docx_url(url):
        score += 170
    if "/download" in decoded:
        score += 140
    if "owncloud/s/" in decoded:
        score += 120

    for keyword, points in SUPPORTING_DOC_KEYWORDS.items():
        if _keyword_matches(keyword, haystack):
            score += points

    if any(
        bad_keyword in haystack
        for bad_keyword in ("image preview", "logo", "media centre", "campaigns", "share on")
    ):
        score -= 300

    return score


def extract_candidate_document_links(markdown: str, base_url: str, limit: int = 12) -> list[dict]:
    """Extract and rank likely supporting-document links from page/document markdown."""
    base_normalized = _normalize_url(base_url)
    candidates: dict[str, dict] = {}

    for line in markdown.splitlines():
        urls = re.findall(r"https?://[^\s)>]+", line)
        if not urls:
            continue

        context = _clean_candidate_context(line)
        for raw_url in urls:
            try:
                joined = urljoin(base_url, raw_url.rstrip(".,;:"))
            except ValueError:
                continue
            resolved_url = _normalize_url(joined)
            if not resolved_url or resolved_url == base_normalized:
                continue

            score = _score_document_link(resolved_url, context)
            if score <= 0:
                continue

            current = candidates.get(resolved_url)
            if current is None or score > current["score"]:
                candidates[resolved_url] = {
                    "url": resolved_url,
                    "label": context or resolved_url,
                    "score": score,
                }

    ranked = sorted(candidates.values(), key=lambda item: (-item["score"], item["url"]))
    return ranked[:limit]


def _extract_docx_text(content: bytes) -> str:
    try:
        with zipfile.ZipFile(io.BytesIO(content)) as archive:
            document_xml = archive.read("word/document.xml")
    except (KeyError, zipfile.BadZipFile) as exc:
        logger.error(f"DOCX parse failed: {exc}")
        return ""

    try:
        root = ElementTree.fromstring(document_xml)
    except ElementTree.ParseError as exc:
        logger.error(f"DOCX XML parse failed: {exc}")
        return ""

    paragraphs: list[str] = []
    ns = {"w": WORD_NAMESPACE}
    for paragraph in root.findall(".//w:body/w:p", ns):
        chunks: list[str] = []
        for node in paragraph.iter():
            if node.tag == f"{{{WORD_NAMESPACE}}}t" and node.text:
                chunks.append(node.text)
            elif node.tag == f"{{{WORD_NAMESPACE}}}tab":
                chunks.append("\t")
            elif node.tag in {f"{{{WORD_NAMESPACE}}}br", f"{{{WORD_NAMESPACE}}}cr"}:
                chunks.append("\n")

        text = "".join(chunks).strip()
        if text:
            paragraphs.append(text)

    return "\n\n".join(paragraphs)


def _fetch_docx_text(url: str, timeout: int = 30) -> str:
    try:
        content = _request_with_retries(
            "GET",
            url,
            namespace="docx_binary",
            timeout=timeout,
            response_kind="bytes",
        )
        if not isinstance(content, bytes):
            logger.error(f"Unexpected non-bytes DOCX payload for {url}")
            return ""
        return _extract_docx_text(content)
    except Exception as exc:
        logger.error(f"DOCX fetch failed for {url}: {exc}")
        return ""


def _fetch_supporting_document_text(url: str, timeout: int = 30) -> str:
    if _is_docx_url(url):
        return _fetch_docx_text(url, timeout=timeout)
    return scrape_url(url, timeout=timeout)


def _is_attachment_listing(url: str, content: str) -> bool:
    if "owncloud/s/" not in url:
        return False
    preview = content[:500].lower()
    return "# files -" in preview or "all files" in preview


def fetch_supporting_documents(
    primary_markdown: str,
    base_url: str,
    max_documents: int = MAX_SUPPORTING_DOCUMENTS,
    max_hops: int = MAX_SUPPORTING_DOC_HOPS,
    max_chars_per_doc: int = MAX_SUPPORTING_DOC_CHARS,
) -> list[dict]:
    """Follow a bounded set of supporting attachments such as PDFs, ToRs, and annex folders."""
    discovered = extract_candidate_document_links(primary_markdown, base_url)
    seen_urls = {_normalize_url(base_url)}
    supporting_documents: list[dict] = []
    frontier = [(1, item) for item in discovered]

    while frontier and len(supporting_documents) < max_documents:
        hop, candidate = frontier.pop(0)
        if hop > max_hops:
            continue

        url = candidate["url"]
        if url in seen_urls:
            continue
        seen_urls.add(url)

        content = _fetch_supporting_document_text(url)
        if not content:
            continue

        include_document = not _is_attachment_listing(url, content)
        if include_document:
            truncated_content = content[:max_chars_per_doc]
            supporting_documents.append(
                {
                    "url": url,
                    "label": candidate["label"],
                    "score": candidate["score"],
                    "hop": hop,
                    "content": truncated_content,
                }
            )
            logger.info(f"  Supporting document fetched (hop={hop}): {url}")
        else:
            logger.info(f"  Supporting attachment listing scanned (hop={hop}): {url}")

        if hop >= max_hops or len(supporting_documents) >= max_documents:
            continue

        child_candidates = extract_candidate_document_links(content, url)
        for child in child_candidates:
            if child["url"] in seen_urls:
                continue
            frontier.append((hop + 1, child))

        frontier.sort(key=lambda item: (-item[1]["score"], item[1]["url"]))
        frontier = frontier[: max_documents * 4]

    return supporting_documents


# ---------------------------------------------------------------------------
# API fetchers - one per source type
# ---------------------------------------------------------------------------

def fetch_grants_gov(api_url: str, max_results: int = 50) -> list[dict]:
    """Grants.gov REST API - no key required."""
    try:
        data = _request_with_retries(
            "POST",
            api_url,
            namespace="api_grants_gov",
            json_body={"keyword": "", "oppStatuses": "forecasted|posted", "rows": max_results},
            timeout=30,
            response_kind="json",
        )
        if not isinstance(data, dict):
            logger.error("Grants.gov API returned unexpected payload type")
            return []
        items = data.get("oppHits", [])
        return [
            {
                "title": it.get("title", ""),
                "url": f"https://www.grants.gov/search-results-detail/{it.get('id', '')}",
                "deadline": it.get("closeDate", ""),
                "description": it.get("synopsis", ""),
            }
            for it in items
        ]
    except Exception as e:
        logger.error(f"Grants.gov API error: {e}")
        return []


def fetch_eu_tenders(api_url: str, max_results: int = 50) -> list[dict]:
    """EU Funding & Tenders search API - no key required."""
    try:
        params = {
            "query": "",
            "scope": "singleMarket",
            "page": "0",
            "pageSize": str(max_results),
            "sortBy": "startDate",
            "sortOrder": "DESC",
            "status": "31094501,31094502,31094503",
        }
        data = _request_with_retries(
            "GET",
            api_url,
            namespace="api_eu_tenders",
            params=params,
            timeout=30,
            response_kind="json",
        )
        if not isinstance(data, dict):
            logger.error("EU Tenders API returned unexpected payload type")
            return []
        results = data.get("results", [])
        return [
            {
                "title": r.get("metadata", {}).get("title", [""])[0],
                "url": (
                    "https://ec.europa.eu/info/funding-tenders/opportunities/portal/screen"
                    f"/opportunities/calls-for-proposals/{r.get('identifier', '')}"
                ),
                "deadline": r.get("metadata", {}).get("deadlineDate", [None])[0],
                "description": r.get("metadata", {}).get("description", [""])[0],
            }
            for r in results
        ]
    except Exception as e:
        logger.error(f"EU Tenders API error: {e}")
        return []


def fetch_world_bank(api_url: str, max_results: int = 50) -> list[dict]:
    """World Bank procurement notices API - no key required."""
    try:
        data = _request_with_retries(
            "GET",
            api_url,
            namespace="api_world_bank",
            params={"rows": max_results, "format": "json"},
            timeout=30,
            response_kind="json",
        )
        if not isinstance(data, dict):
            logger.error("World Bank API returned unexpected payload type")
            return []
        notices = data.get("notices", [])
        return [
            {
                "title": n.get("noticeTitle", ""),
                "url": n.get("url", ""),
                "deadline": n.get("deadline", ""),
                "description": n.get("projectName", ""),
            }
            for n in notices
        ]
    except Exception as e:
        logger.error(f"World Bank API error: {e}")
        return []


def fetch_austender(api_url: str, max_results: int = 50) -> list[dict]:
    """AusTender open ATMs API - no key required."""
    try:
        data = _request_with_retries(
            "GET",
            api_url,
            params={"filter": "published", "pageSize": max_results},
            namespace="api_austender",
            timeout=30,
            response_kind="json",
        )
        if not isinstance(data, dict):
            logger.error("AusTender API returned unexpected payload type")
            return []
        items = data.get("data", [])
        return [
            {
                "title": it.get("atmTitle", ""),
                "url": f"https://www.tenders.gov.au/atm/show/{it.get('atmId', '')}",
                "deadline": it.get("closingDate", ""),
                "description": it.get("description", ""),
            }
            for it in items
        ]
    except Exception as e:
        logger.error(f"AusTender API error: {e}")
        return []


_API_FETCHERS = {
    "grants_gov": fetch_grants_gov,
    "eu_tenders": fetch_eu_tenders,
    "world_bank": fetch_world_bank,
    "austender": fetch_austender,
}


def fetch_via_api(source: dict) -> list[dict]:
    """Dispatch to the correct API fetcher based on source config."""
    api_type = source.get("api_type", "")
    api_url = source.get("api_url", "")
    fetcher = _API_FETCHERS.get(api_type)
    if not fetcher:
        logger.warning(f"No API fetcher for type '{api_type}', will fall back to scraping")
        return []
    return fetcher(api_url)
