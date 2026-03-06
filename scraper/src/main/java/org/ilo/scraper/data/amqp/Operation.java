package org.ilo.scraper.data.amqp;

import java.util.Map;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

/** The Operation that can be performed during a single scraping step. */
@Getter
@RequiredArgsConstructor
public enum Operation {
  /**
   * Iterates over elements selected by item-selector, scraping each element individually. Continues
   * to a next page using next-page-selector, and repeats iterative scraping.
   *
   * <p>Intermediate Operation.
   */
  ITERATOR(OperationType.INTERMEDIATE, Map.of("item-selector", String.class)),

  /**
   * EU Funding & Tenders.
   *
   * <p>Intermediate Operation.
   */
  EU_FUNDING_API(OperationType.INTERMEDIATE, Map.of()),

  /**
   * Crawls the pages, performs AI analysis of URLs and page content. Visits only pages that links
   * are url-score-threshold similar to url-text-query. Scraps pages that are age-score-threshold
   * similar to page-text-query. Crawls only a max-depth links from an input uri.
   *
   * <p>Intermediate Operation.
   */
  CRAWLER(
      OperationType.INTERMEDIATE,
      Map.of(
          "max-depth",
          String.class,
          "page-text-query",
          String.class,
          "page-score-threshold",
          String.class,
          "url-text-query",
          String.class,
          "url-score-threshold",
          String.class)),

  /**
   * Simple visit the page(-s) from the input.
   *
   * <p>Intermediate Operation.
   */
  VISIT(OperationType.INTERMEDIATE, Map.of()),

  /**
   * Performs scrapping of the input page. Finalize scrapping.
   *
   * <p>Terminal Operation.
   */
  SCRAP(OperationType.TERMINAL, Map.of());

  private final OperationType operationType;
  private final Map<String, Class<?>> schema;

  public void validate(Map<String, String> config) {
    for (Map.Entry<String, Class<?>> schemaEntry : schema.entrySet()) {
      if (!config.containsKey(schemaEntry.getKey())) {
        throw new IllegalArgumentException("Missing key: " + schemaEntry.getKey());
      }
    }
  }
}
