import httpx
import logging
import os

logger = logging.getLogger(__name__)

JINA_BASE = "https://r.jina.ai/"
JINA_HEADERS = {"Accept": "text/markdown", "X-Return-Format": "markdown"}


def _proxies() -> dict | None:
    """Return proxy dict from environment if set."""
    proxy = os.environ.get("HTTPS_PROXY") or os.environ.get("HTTP_PROXY")
    if proxy:
        return {"http://": proxy, "https://": proxy}
    return None


def scrape_url(url: str, timeout: int = 30) -> str:
    """Fetch a URL as clean Markdown via Jina Reader (no API key required)."""
    try:
        resp = httpx.get(
            JINA_BASE + url,
            headers=JINA_HEADERS,
            timeout=timeout,
            follow_redirects=True,
            proxy=os.environ.get("HTTPS_PROXY") or os.environ.get("HTTP_PROXY"),
        )
        resp.raise_for_status()
        return resp.text
    except httpx.HTTPError as e:
        logger.error(f"Jina scrape failed for {url}: {e}")
        return ""


# ---------------------------------------------------------------------------
# API fetchers - one per source type
# ---------------------------------------------------------------------------

def fetch_grants_gov(api_url: str, max_results: int = 50) -> list[dict]:
    """Grants.gov REST API - no key required."""
    try:
        resp = httpx.post(
            api_url,
            json={"keyword": "", "oppStatuses": "forecasted|posted", "rows": max_results},
            timeout=30,
            proxy=os.environ.get("HTTPS_PROXY") or os.environ.get("HTTP_PROXY"),
        )
        resp.raise_for_status()
        items = resp.json().get("oppHits", [])
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
        resp = httpx.get(api_url, params=params, timeout=30,
                       proxy=os.environ.get("HTTPS_PROXY") or os.environ.get("HTTP_PROXY"))
        resp.raise_for_status()
        results = resp.json().get("results", [])
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
        resp = httpx.get(api_url, params={"rows": max_results, "format": "json"}, timeout=30,
                       proxy=os.environ.get("HTTPS_PROXY") or os.environ.get("HTTP_PROXY"))
        resp.raise_for_status()
        notices = resp.json().get("notices", [])
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
        resp = httpx.get(
            api_url,
            params={"filter": "published", "pageSize": max_results},
            timeout=30,
            proxy=os.environ.get("HTTPS_PROXY") or os.environ.get("HTTP_PROXY"),
        )
        resp.raise_for_status()
        items = resp.json().get("data", [])
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
