package org.ilo.scraper.service.operation.crawler;

import com.microsoft.playwright.Locator;
import java.util.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.ilo.scraper.service.ai.TextSemanticSimilarityService;
import org.ilo.scraper.util.TopK;
import org.springframework.stereotype.Component;

/**
 * Calculates a relevance score for Playwright {@link Locator} elements based on their semantic
 * similarity to a given query text.
 *
 * <p>This class inspects sub-elements (like headings, spans, divs) within a given locator,
 * calculates their text similarity to the query using the {@link TextSemanticSimilarityService},
 * and then aggregates these scores to produce a final relevance score for the main element. It also
 * provides a direct method to score raw text against the query.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class ElementScoreCalculator {
  private static final Map<String, Float> SELECTOR_SCORE_MAP =
      Map.of(
          "h1",
          1.1f,
          "h2",
          1.1f,
          "h3",
          1.1f,
          "h4",
          1.1f,
          "h5",
          1.1f,
          "h6",
          1.1f,
          "[role='heading']",
          1.1f,
          "span",
          1.0f,
          "div",
          0.9f);
  private static final int TOP_SCORES_TO_AVERAGE = 1;

  private final TextSemanticSimilarityService textSemanticSimilarityService;

  public double score(String queryText, Locator element) {
    TopK<Double> scores = new TopK<>(TOP_SCORES_TO_AVERAGE);

    for (Map.Entry<String, Float> selector : SELECTOR_SCORE_MAP.entrySet()) {
      element.locator(selector.getKey()).all().stream()
          .map(
              scoringElement -> {
                double score =
                    selector.getValue()
                        * textSemanticSimilarityService.score(
                            queryText, scoringElement.textContent());
                log.info("Scoring element {}: {}", score, scoringElement.textContent());
                return score;
              })
          .forEach(scores::add);
    }

    return scores.stream().mapToDouble(Double::doubleValue).sum() / TOP_SCORES_TO_AVERAGE;
  }

  public double score(String queryText, String elementText) {
    double score = textSemanticSimilarityService.score(queryText, elementText);
    log.info("Scoring text {}: {}", score, elementText);
    return score;
  }
}
