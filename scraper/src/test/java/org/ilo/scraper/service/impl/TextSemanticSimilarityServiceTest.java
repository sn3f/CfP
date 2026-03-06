package org.ilo.scraper.service.impl;

import java.util.List;
import lombok.extern.slf4j.Slf4j;
import org.ilo.scraper.config.ai.ModelConfig;
import org.ilo.scraper.service.ai.TextSemanticSimilarityService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

@Slf4j
@SpringBootTest(classes = {ModelConfig.class, TextSemanticSimilarityService.class})
public class TextSemanticSimilarityServiceTest {
  private static final String TARGET_TEXT = "Call for Proposals.";

  @Autowired private TextSemanticSimilarityService textSemanticSimilarityService;

  @Test
  void scoreURL_shouldScoreRelevantContext() {
    List<String> urlContexts =
        List.of(
            "[Initiatives and partnerships](https://www.afdb.org/en/topics-and-sectors/initiatives-partnerships)",
            "[Call for Proposals of the Climate Action Window](https://www.afdb.org/en/topics-and-sectors/initiatives-partnerships/climate-action-window/1st-call-proposals-climate-action-window)",
            "Initiatives and partnerships",
            "Call for Proposals of the Climate Action Window");

    for (String urlContext : urlContexts) {
      double actualScore = textSemanticSimilarityService.score(TARGET_TEXT, urlContext);
      log.info("{}: {}", actualScore, urlContext);
    }
  }

  @Test
  void scoreURL_shouldScoreAttachments() {
    List<String> targetTexts =
        List.of(
            "Terms of Reference",
            "FAQ",
            "Download",
            "Read more",
            "See more here",
            "More information here");

    List<String> attachmentLabels =
        List.of(
            "More information about the Call for Proposals can be found here: The Elsie Initiative Fund",
            "The application deadline is 20 October 2025. As usual, we would be grateful for your help in disseminating this call (available in Arabic) widely among your networks and reshare our social media promotions here.",
            "Programmatic funding from 30,000 USD to 150,000 USD: To finance programmatic activities of CSOs aimed at improving the socio-economic recovery and political participation of women and young women in peacebuilding contexts (in line with WPHF impact area 6). Under Impact Area 6, projects should specifically target forcibly displaced women and young women in Lebanon (including internally displaced, refugees, returnees, or asylum seekers). Projects will be part of the Funding Initiative on Forced Displacement.",
            "For more information, please head over to the dedicated page on the WPHF website.",
            "Full guidelines and scope are available here.",
            "The Concept Note template can be downloaded here.",
            "Full roles and responsibilities of ITAG members are detailed in the ITAG Terms of Reference (ToR).",
            "The Expression of Interest template can be downloaded here.");

    for (String targetText : targetTexts) {
      log.info("Scoring for: {}", targetText);
      for (String urlContext : attachmentLabels) {
        double actualScore = textSemanticSimilarityService.score(targetText, urlContext);
        log.info("{}: {}", actualScore, urlContext);
      }
      log.info("Finished for: {}", targetText);
    }
  }
}
