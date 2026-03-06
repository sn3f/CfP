package org.ilo.scraper.service.operation;

import static java.lang.Long.parseLong;

import com.microsoft.playwright.Locator;
import com.microsoft.playwright.options.LoadState;
import java.net.URI;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;
import lombok.extern.slf4j.Slf4j;
import org.ilo.scraper.data.amqp.Operation;
import org.ilo.scraper.data.operation.Attachment;
import org.ilo.scraper.data.operation.Content;
import org.ilo.scraper.data.operation.ContentUri;
import org.ilo.scraper.data.operation.result.IntermediateResult;
import org.ilo.scraper.service.web.BrowserFactory;
import org.ilo.scraper.service.web.BrowserPage;
import org.ilo.scraper.service.web.ElementScraper;
import org.ilo.scraper.service.web.attachment.AttachmentDownloader;
import org.ilo.scraper.util.PacedExecutor;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;

@Slf4j
@Service
public class VisitHandler implements IntermediateOperationHandler {
  // TODO: Document configuration
  private static final String CONTENT_SELECTOR = "content-selector";
  private static final String THROTTLE_MS_KEY = "throttle-ms";
  private static final String SCRAPE_ATTACHMENTS = "scrap-attachments";

  private final BrowserFactory browserFactory;
  private final ElementScraper elementScraper;
  private final AttachmentDownloader attachmentDownloader;
  private final ExecutorService stepTaskExecutor;
  private final VisitedUrlService visitedUrlService;
  private PacedExecutor pacedExecutor;

  public VisitHandler(
      BrowserFactory browserFactory,
      ElementScraper elementScraper,
      AttachmentDownloader attachmentDownloader,
      VisitedUrlService visitedUrlService,
      @Qualifier("StepTaskExecutor") ExecutorService stepTaskExecutor) {
    this.browserFactory = browserFactory;
    this.elementScraper = elementScraper;
    this.attachmentDownloader = attachmentDownloader;
    this.stepTaskExecutor = stepTaskExecutor;
    this.visitedUrlService = visitedUrlService;
  }

  @Override
  public Operation getOperation() {
    return Operation.VISIT;
  }

  @Override
  public Flux<IntermediateResult> execute(
      Map<String, String> configuration, IntermediateResult intermediateResult) {
    return Flux.create(
        emitter -> {
          try {
            initPacedExecutor(configuration);

            for (ContentUri uri : intermediateResult.uris()) {
              // TODO: Timeout for the core processing
              //   Make timeout configurable
              //   For now only here as quick-fix
              try {
                CompletableFuture<IntermediateResult> visitResult =
                    CompletableFuture.supplyAsync(
                        () -> visitPage(configuration, uri), stepTaskExecutor);

                int attempt = 0;
                while (attempt < 3) {
                  ++attempt;

                  try {
                    emitter.next(visitResult.get(10, TimeUnit.MINUTES));
                    break;
                  } catch (TimeoutException e) {
                    log.error(
                        "VisitPage timeout! Attempt: {}, For URIs: {}",
                        attempt,
                        intermediateResult.uris());
                    visitResult.cancel(true);
                  }

                  if (!(attempt + 1 < 3)) {
                    throw new RuntimeException(
                        "CRASH expected, run out of attempts, for URIs: "
                            + intermediateResult.uris());
                  }
                }

              } catch (Exception e) {
                emitter.error(e);
              }
            }

            emitter.complete();
          } catch (Exception e) {
            emitter.error(e);
          }
        });
  }

  protected IntermediateResult visitPage(Map<String, String> configuration, ContentUri uri) {
    // TODO: duplicate in Handlers
    try (BrowserPage playPage = browserFactory.newPage()) {
      log.info("Visiting page: {}", uri.uri().toString());

      playPage.page().navigate(uri.uri().toString());
      // TODO: Make it configurable, https://ec.europa.eu/ seems to be loading things after
      //   NETWORKIDLE state
      playPage.page().waitForTimeout(5000);
      playPage.page().waitForLoadState(LoadState.NETWORKIDLE);

      elementScraper.removeBoilerplate(playPage.page(), configuration.get(CONTENT_SELECTOR));

      Locator body = playPage.page().locator(":root > body").first();

      return pacedExecutor.executeBlocking(
          () -> createIntermediateResult(configuration, playPage, uri.uri(), body));
    }
  }

  private synchronized void initPacedExecutor(Map<String, String> configuration) {
    long minIntervalMs = parseLong(configuration.getOrDefault(THROTTLE_MS_KEY, "0"));

    if (pacedExecutor == null || minIntervalMs != pacedExecutor.getMinIntervalMs()) {
      pacedExecutor = new PacedExecutor(minIntervalMs);
    }
  }

  // TODO: duplicate in Operation Handlers
  private IntermediateResult createIntermediateResult(
      Map<String, String> configuration, BrowserPage playPage, URI uri, Locator body) {
    ContentUri resultUri = new ContentUri(uri);

    // TODO: Make it more elegant, we skip attachments if Result URL was already visited to safe
    // time
    boolean scrapeAttachments =
        Boolean.parseBoolean(configuration.get(SCRAPE_ATTACHMENTS))
            && !visitedUrlService.check(resultUri);

    Content resultContent = new Content(resultUri, elementScraper.scrapeMarkdown(body));
    List<ContentUri> resultLinks = elementScraper.extractUris(uri, body);
    List<Attachment> downloadedAttachments =
        scrapeAttachments ? attachmentDownloader.downloadAttachments(playPage, body) : List.of();

    return new IntermediateResult(resultContent, resultLinks, downloadedAttachments);
  }
}
