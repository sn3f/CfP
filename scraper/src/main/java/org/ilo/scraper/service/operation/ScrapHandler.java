package org.ilo.scraper.service.operation;

import java.util.Map;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.ilo.scraper.data.amqp.Operation;
import org.ilo.scraper.data.operation.result.IntermediateResult;
import org.ilo.scraper.data.operation.result.TerminalResult;
import org.ilo.scraper.service.web.BrowserFactory;
import org.ilo.scraper.service.web.ElementScraper;
import org.ilo.scraper.service.web.attachment.AttachmentDownloader;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;

// TODO: This Operation lost a reason to exist - other then to create Terminal Result
// TODO: Rename to Finalize/Finish
@Slf4j
@Service
@RequiredArgsConstructor
public class ScrapHandler implements TerminalOperationHandler {

  /**
   * A CSS selector to find and remove common boilerplate elements from a web page. This targets
   * semantic HTML5 tags and common ARIA roles for headers, footers, navigation, etc.
   */
  private static final String BOILERPLATE_REMOVAL_SELECTOR =
      "header, footer, nav, aside, script, style, img, [class*='menu']:not(body), [role='banner']:not(body), [role='navigation']:not(body), [role='contentinfo']:not(body), [role='complementary']:not(body)";

  private final BrowserFactory browserFactory;
  private final ElementScraper elementScraper;
  private final AttachmentDownloader attachmentDownloader;
  private final VisitedUrlService visitedUrlService;

  @Override
  public Operation getOperation() {
    return Operation.SCRAP;
  }

  @Override
  public Flux<TerminalResult> execute(
      Map<String, String> configuration, IntermediateResult intermediateResult) {
    return Flux.create(
        emitter -> {
          try {
            if (visitedUrlService.checkAndAdd(intermediateResult.content().contentLocation())) {
              emitter.next(
                  new TerminalResult(
                      intermediateResult.content(), intermediateResult.attachments()));
            } else {
              log.info("Already published: {}", intermediateResult.content().contentLocation());
            }

            emitter.complete();
          } catch (Exception e) {
            emitter.error(e);
          }
        });
  }
}
