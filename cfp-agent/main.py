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
from datetime import datetime, timezone
from pathlib import Path

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


def process_source(
    source: dict,
    classifier: CfpClassifier,
    max_cfps: int,
) -> list[dict]:
    name = source["name"]
    url = source["url"]
    logger.info(f"=== Source: {name} ===")

    # Step 1 - get CfP items list
    cfp_urls: list[str] = []

    if source.get("api_url"):
        logger.info(f"  Fetching via API ({source['api_type']})")
        items = fetch_via_api(source)
        if items:
            cfp_urls = [it["url"] for it in items[:max_cfps] if it.get("url")]
            logger.info(f"  API returned {len(cfp_urls)} items")
        else:
            logger.warning("  API returned 0 items, falling back to Jina scraping")

    if not cfp_urls:
        logger.info(f"  Scraping listing page via Jina: {url}")
        listing_md = scrape_url(url)
        if not listing_md:
            logger.warning(f"  Empty response for listing page, skipping source")
            return []
        cfp_urls = classifier.extract_cfp_links(listing_md, url)
        logger.info(f"  LLM extracted {len(cfp_urls)} CfP links")
        cfp_urls = cfp_urls[:max_cfps]

    if not cfp_urls:
        logger.warning(f"  No CfP links found for source '{name}'")
        return []

    # Step 2 - classify each CfP
    results = []
    for cfp_url in cfp_urls:
        logger.info(f"  Classifying: {cfp_url}")
        content = scrape_url(cfp_url)
        if not content:
            logger.warning(f"  Empty content, skipping {cfp_url}")
            continue

        classification = classifier.classify(content, cfp_url)
        if not classification:
            continue

        regions = get_regions_for_countries(classification.country)
        result = {
            "url": cfp_url,
            "source_name": name,
            "regions": regions,
            "scraped_at": datetime.now(timezone.utc).isoformat(),
            **classification.model_dump(),
        }
        results.append(result)
        logger.info(
            f"  -> eligible={classification.eligible}  "
            f"match={classification.ilo_match_score}  "
            f"title={classification.title!r}"
        )

    return results


def main() -> None:
    parser = argparse.ArgumentParser(description="ILO CfP weekly scanner")
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Process 1 CfP from first/selected source and print JSON without saving",
    )
    parser.add_argument("--source", help="Process only this source (exact name)")
    args = parser.parse_args()

    if not os.environ.get("OPENROUTER_API_KEY"):
        logger.error("OPENROUTER_API_KEY is not set. Copy .env.example to .env and fill it in.")
        sys.exit(1)

    sources = load_sources()
    criteria = load_criteria_from_yaml(str(ROOT / "criteria.yaml"))
    max_cfps = int(os.getenv("MAX_CFPS_PER_SOURCE", "20"))
    request_delay = float(os.getenv("REQUEST_DELAY_SECONDS", "2"))

    if args.source:
        sources = [s for s in sources if s["name"] == args.source]
        if not sources:
            logger.error(f"Source '{args.source}' not found in sources.yaml")
            sys.exit(1)

    if args.dry_run:
        sources = sources[:1]
        max_cfps = 1

    classifier = CfpClassifier(criteria=criteria, request_delay=request_delay)

    all_results: list[dict] = []
    for source in sources:
        try:
            results = process_source(source, classifier, max_cfps)
            all_results.extend(results)
            logger.info(f"Source '{source['name']}': {len(results)} CfPs classified")
        except Exception as exc:
            logger.error(f"Failed to process '{source['name']}': {exc}", exc_info=True)

    eligible_count = sum(1 for r in all_results if r.get("eligible"))
    output = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "total": len(all_results),
        "eligible_count": eligible_count,
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
            f"{eligible_count} eligible. Saved to {out_path}"
        )


if __name__ == "__main__":
    main()
