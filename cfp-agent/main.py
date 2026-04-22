"""
main.py - ILO CfP weekly scanner entrypoint.

Usage:
  python main.py                                     # scan all 44 sources
  python main.py --dry-run                           # 1 CfP from first source, print JSON, no save
  python main.py --source "IFAD - Call for Proposals"  # single source
  python main.py --source "IFAD - Call for Proposals" --dry-run
"""
import argparse
import json
import logging
import os
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path
from urllib.parse import urlsplit, urlunsplit

import yaml
from dotenv import load_dotenv

from agent import CfpClassifier, get_regions_for_countries, load_criteria_from_yaml
from tools import fetch_via_api, scrape_url

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    stream=sys.stdout,
)
logger = logging.getLogger(__name__)

ROOT = Path(__file__).parent
RESULTS_DIR = ROOT / "results"
RESULTS_DIR.mkdir(exist_ok=True)


def load_sources() -> list[dict]:
    with open(ROOT / "sources.yaml", encoding="utf-8") as f:
        return yaml.safe_load(f)["sources"]


def normalize_cfp_url(url: str) -> str:
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


def dedupe_urls(urls: list[str]) -> tuple[list[str], int]:
    seen: set[str] = set()
    unique_urls: list[str] = []
    duplicate_count = 0

    for url in urls:
        normalized_url = normalize_cfp_url(url)
        if not normalized_url:
            continue
        if normalized_url in seen:
            duplicate_count += 1
            continue
        seen.add(normalized_url)
        unique_urls.append(url)

    return unique_urls, duplicate_count


def _new_source_stats(source: dict) -> dict:
    return {
        "source_name": source["name"],
        "url": source["url"],
        "via_api": False,
        "api_fallback_to_scraping": False,
        "links_found": 0,
        "duplicates_within_source": 0,
        "duplicates_across_sources": 0,
        "capped_at_max": False,
        "cfps_processed": 0,
        "cfps_reused": 0,
        "cfps_dropped_expired": 0,
        "empty_content": 0,
        "classification_failures": 0,
        "eligible_count": 0,
        "avg_ilo_match_score": None,
        "error": None,
    }


def _load_prior_results_index() -> dict[str, dict]:
    """Load URL -> prior entry map from the previous run's latest.json for diff scanning."""
    latest_path = RESULTS_DIR / "latest.json"
    if not latest_path.exists():
        logger.info("No prior latest.json found, diff scanning disabled for this run")
        return {}
    try:
        data = json.loads(latest_path.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError) as exc:
        logger.warning(
            f"Could not load prior latest.json ({exc}), treating all URLs as new"
        )
        return {}

    index: dict[str, dict] = {}
    for entry in data.get("results", []):
        url = entry.get("url")
        if not url:
            continue
        index[normalize_cfp_url(url)] = entry
    logger.info(f"Loaded {len(index)} prior URLs from latest.json for diff scanning")
    return index


def _parse_scraped_at(value: object) -> datetime | None:
    if not isinstance(value, str) or not value:
        return None
    try:
        dt = datetime.fromisoformat(value)
    except ValueError:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt


def _diff_decision(
    prior: dict,
    now_utc: datetime,
    max_age_days: int,
) -> str:
    """Return 'reuse', 'drop', or 'reclassify' for a URL already in latest.json."""
    deadline = prior.get("deadline")
    if isinstance(deadline, str):
        try:
            dl = datetime.strptime(deadline, "%Y-%m-%d").date()
            if dl < now_utc.date():
                return "drop"
        except ValueError:
            pass

    scraped_at = _parse_scraped_at(prior.get("scraped_at"))
    if scraped_at is None:
        return "reclassify"

    if now_utc - scraped_at > timedelta(days=max_age_days):
        return "reclassify"

    return "reuse"


def process_source(
    source: dict,
    classifier: CfpClassifier,
    max_cfps: int,
    seen_urls: set[str],
    *,
    prior_results_by_url: dict[str, dict] | None = None,
    diff_max_age_days: int = 30,
) -> tuple[list[dict], dict]:
    name = source["name"]
    url = source["url"]
    stats = _new_source_stats(source)
    prior_results_by_url = prior_results_by_url or {}
    now_utc = datetime.now(timezone.utc)
    logger.info(f"=== Source: {name} ===")

    # Step 1 - get CfP items list
    cfp_urls: list[str] = []

    if source.get("api_url"):
        logger.info(f"  Fetching via API ({source['api_type']})")
        stats["via_api"] = True
        items = fetch_via_api(source)
        if items:
            cfp_urls = [it["url"] for it in items if it.get("url")]
            logger.info(f"  API returned {len(cfp_urls)} items")
        else:
            stats["api_fallback_to_scraping"] = True
            logger.warning("  API returned 0 items, falling back to Jina scraping")

    if not cfp_urls:
        logger.info(f"  Scraping listing page via Jina: {url}")
        listing_md = scrape_url(url)
        if not listing_md:
            logger.warning(f"  Empty response for listing page, skipping source")
            return [], stats
        cfp_urls = classifier.extract_cfp_links(listing_md, url)
        logger.info(f"  LLM extracted {len(cfp_urls)} CfP links")

    if not cfp_urls:
        logger.warning(f"  No CfP links found for source '{name}'")
        return [], stats

    stats["links_found"] = len(cfp_urls)
    cfp_urls, duplicate_count = dedupe_urls(cfp_urls)
    stats["duplicates_within_source"] = duplicate_count
    if len(cfp_urls) > max_cfps:
        stats["capped_at_max"] = True
    cfp_urls = cfp_urls[:max_cfps]
    if duplicate_count:
        logger.info(f"  Deduplicated {duplicate_count} repeated URLs within source")

    # Step 2 - for each URL, diff-decide between reuse / drop / reclassify
    results: list[dict] = []
    skipped_existing = 0
    match_scores: list[float] = []
    for cfp_url in cfp_urls:
        normalized_url = normalize_cfp_url(cfp_url)
        if normalized_url in seen_urls:
            skipped_existing += 1
            logger.info(f"  Skipping duplicate URL already processed: {normalized_url}")
            continue

        prior = prior_results_by_url.get(normalized_url)
        if prior is not None:
            decision = _diff_decision(prior, now_utc, diff_max_age_days)
            if decision == "drop":
                stats["cfps_dropped_expired"] += 1
                seen_urls.add(normalized_url)
                logger.info(f"  Dropping expired (deadline passed): {normalized_url}")
                continue
            if decision == "reuse":
                reused = dict(prior)
                results.append(reused)
                seen_urls.add(normalized_url)
                stats["cfps_reused"] += 1
                prior_score = prior.get("ilo_match_score")
                if isinstance(prior_score, (int, float)):
                    match_scores.append(float(prior_score))
                logger.info(f"  Reusing prior classification: {normalized_url}")
                continue
            # decision == "reclassify" -> fall through

        stats["cfps_processed"] += 1
        logger.info(f"  Classifying: {normalized_url}")
        content = scrape_url(normalized_url)
        if not content:
            stats["empty_content"] += 1
            logger.warning(f"  Empty content, skipping {normalized_url}")
            continue

        classification = classifier.classify(content, normalized_url)
        if not classification:
            stats["classification_failures"] += 1
            continue

        regions = get_regions_for_countries(classification.country)
        result = {
            "url": normalized_url,
            "source_name": name,
            "regions": regions,
            "scraped_at": datetime.now(timezone.utc).isoformat(),
            **classification.model_dump(),
        }
        results.append(result)
        seen_urls.add(normalized_url)
        if classification.ilo_match_score is not None:
            match_scores.append(classification.ilo_match_score)
        logger.info(
            f"  -> eligible={classification.eligible}  "
            f"match={classification.ilo_match_score}  "
            f"title={classification.title!r}"
        )

    stats["duplicates_across_sources"] = skipped_existing
    stats["eligible_count"] = sum(1 for r in results if r.get("eligible"))
    if match_scores:
        stats["avg_ilo_match_score"] = round(sum(match_scores) / len(match_scores), 3)

    if skipped_existing:
        logger.info(f"  Skipped {skipped_existing} URLs already classified from another source")
    if stats["cfps_reused"] or stats["cfps_dropped_expired"]:
        logger.info(
            f"  Diff: reused={stats['cfps_reused']} "
            f"dropped_expired={stats['cfps_dropped_expired']} "
            f"reclassified={stats['cfps_processed']}"
        )

    return results, stats


def main() -> None:
    parser = argparse.ArgumentParser(description="ILO CfP weekly scanner")
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Process 1 CfP from first/selected source and print JSON without saving",
    )
    parser.add_argument("--source", help="Process only this source (exact name)")
    parser.add_argument(
        "--include-procurement",
        action="store_true",
        help="Include sources tagged source_type=procurement (excluded by default)",
    )
    parser.add_argument(
        "--no-diff",
        action="store_true",
        help="Disable diff scanning (reclassify every URL, even if already in prior latest.json)",
    )
    args = parser.parse_args()

    if not os.environ.get("OPENROUTER_API_KEY"):
        logger.error("OPENROUTER_API_KEY is not set. Copy .env.example to .env and fill it in.")
        sys.exit(1)

    sources = load_sources()
    criteria = load_criteria_from_yaml(str(ROOT / "criteria.yaml"))
    max_cfps = int(os.getenv("MAX_CFPS_PER_SOURCE", "20"))
    request_delay = float(os.getenv("REQUEST_DELAY_SECONDS", "2"))
    diff_max_age_days = int(os.getenv("DIFF_MAX_AGE_DAYS", "30"))

    use_diff = not args.no_diff and not args.dry_run
    prior_results_by_url: dict[str, dict] = (
        _load_prior_results_index() if use_diff else {}
    )
    if args.no_diff:
        logger.info("Diff scanning disabled via --no-diff")
    elif args.dry_run:
        logger.info("Diff scanning disabled for --dry-run (full pipeline test)")

    if args.source:
        sources = [s for s in sources if s["name"] == args.source]
        if not sources:
            logger.error(f"Source '{args.source}' not found in sources.yaml")
            sys.exit(1)
    else:
        disabled_count = sum(1 for s in sources if not s.get("enabled", True))
        sources = [s for s in sources if s.get("enabled", True)]
        if disabled_count:
            logger.info(f"Filtered out {disabled_count} disabled sources")

        if not args.include_procurement:
            procurement_count = sum(
                1 for s in sources if s.get("source_type") == "procurement"
            )
            sources = [s for s in sources if s.get("source_type") != "procurement"]
            if procurement_count:
                logger.info(
                    f"Filtered out {procurement_count} procurement sources "
                    f"(use --include-procurement to keep them)"
                )

    if args.dry_run:
        sources = sources[:1]
        max_cfps = 1

    classifier = CfpClassifier(criteria=criteria, request_delay=request_delay)

    all_results: list[dict] = []
    by_source: list[dict] = []
    seen_urls: set[str] = set()
    for source in sources:
        try:
            results, stats = process_source(
                source,
                classifier,
                max_cfps,
                seen_urls,
                prior_results_by_url=prior_results_by_url,
                diff_max_age_days=diff_max_age_days,
            )
            all_results.extend(results)
            by_source.append(stats)
            logger.info(f"Source '{source['name']}': {len(results)} CfPs in output")
        except Exception as exc:
            logger.error(f"Failed to process '{source['name']}': {exc}", exc_info=True)
            error_stats = _new_source_stats(source)
            error_stats["error"] = str(exc)
            by_source.append(error_stats)

    eligible_count = sum(1 for r in all_results if r.get("eligible"))
    total_reused = sum(s.get("cfps_reused", 0) for s in by_source)
    total_dropped_expired = sum(s.get("cfps_dropped_expired", 0) for s in by_source)
    total_reclassified = sum(s.get("cfps_processed", 0) for s in by_source)
    output = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "total": len(all_results),
        "eligible_count": eligible_count,
        "diff_scan": {
            "enabled": use_diff,
            "prior_urls_known": len(prior_results_by_url),
            "reused": total_reused,
            "dropped_expired": total_dropped_expired,
            "reclassified": total_reclassified,
            "max_age_days": diff_max_age_days,
        },
        "by_source": by_source,
        "results": all_results,
    }

    if args.dry_run:
        print(json.dumps(output, indent=2, ensure_ascii=False, default=str))
        logger.info("Dry run complete - results printed above, not saved")
    else:
        out_path = RESULTS_DIR / "latest.json"
        out_path.write_text(
            json.dumps(output, indent=2, ensure_ascii=False, default=str),
            encoding="utf-8",
        )
        logger.info(
            f"Done. {len(all_results)} CfPs total, "
            f"{eligible_count} eligible "
            f"(reclassified={total_reclassified}, reused={total_reused}, "
            f"dropped_expired={total_dropped_expired}). "
            f"Saved to {out_path}"
        )


if __name__ == "__main__":
    main()
