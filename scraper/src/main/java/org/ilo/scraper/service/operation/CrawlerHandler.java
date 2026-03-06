package org.ilo.scraper.service.operation;

import static java.lang.Integer.parseInt;

import com.microsoft.playwright.Locator;
import com.microsoft.playwright.options.LoadState;
import java.net.URI;
import java.util.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.ilo.scraper.data.amqp.Operation;
import org.ilo.scraper.data.operation.Attachment;
import org.ilo.scraper.data.operation.Content;
import org.ilo.scraper.data.operation.ContentUri;
import org.ilo.scraper.data.operation.result.IntermediateResult;
import org.ilo.scraper.service.operation.crawler.ElementScoreCalculator;
import org.ilo.scraper.service.web.BrowserFactory;
import org.ilo.scraper.service.web.BrowserPage;
import org.ilo.scraper.service.web.ElementScraper;
import org.ilo.scraper.service.web.attachment.AttachmentDownloader;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;
import reactor.core.publisher.FluxSink;

@Slf4j
@Service
@RequiredArgsConstructor
public class CrawlerHandler implements IntermediateOperationHandler {
  // TODO: Document configuration
  private static final String MAX_DEPTH = "max-depth";
  private static final String PAGE_TEXT_QUERY = "page-text-query";
  private static final String PAGE_SCORE_THRESHOLD = "page-score-threshold";
  private static final String URL_TEXT_QUERY = "url-text-query";
  private static final String URL_SCORE_THRESHOLD = "url-score-threshold";
  private static final String CONTENT_SELECTOR = "content-selector";
  private static final String SCRAPE_ATTACHMENTS = "scrap-attachments";

  private final BrowserFactory browserFactory;
  private final ElementScoreCalculator elementScoreCalculator;
  private final ElementScraper elementScraper;
  private final AttachmentDownloader attachmentDownloader;

  @Override
  public Operation getOperation() {
    return Operation.CRAWLER;
  }

  @Override
  public Flux<IntermediateResult> execute(
      Map<String, String> configuration, IntermediateResult intermediateResult) {
    return Flux.fromIterable(intermediateResult.uris())
        .concatMap(contentUri -> new Crawler(contentUri.uri(), configuration).crawl());
  }

  private class Crawler {
    final URI targetUri;
    final int maxDepth;
    final String pageTextQuery;
    final double pageScoreThreshold;
    final String urlTextQuery;
    final double urlScoreThreshold;
    final String contentSelector;
    final boolean scrapeAttachments;

    FluxSink<IntermediateResult> result = null;
    Queue<CrawlTargetUri> crawlTargetUris = null;
    Set<URI> visited = null;

    Crawler(URI targetUri, Map<String, String> configuration) {
      this.targetUri = targetUri;
      this.maxDepth = parseInt(configuration.get(MAX_DEPTH));
      this.pageTextQuery = configuration.get(PAGE_TEXT_QUERY);
      this.pageScoreThreshold = Double.parseDouble(configuration.get(PAGE_SCORE_THRESHOLD));
      this.urlTextQuery = configuration.get(URL_TEXT_QUERY);
      this.urlScoreThreshold = Double.parseDouble(configuration.get(URL_SCORE_THRESHOLD));
      this.contentSelector = configuration.get(CONTENT_SELECTOR);
      this.scrapeAttachments = Boolean.parseBoolean(configuration.get(SCRAPE_ATTACHMENTS));
    }

    Flux<IntermediateResult> crawl() {
      crawlTargetUris = new LinkedList<>();
      visited = new HashSet<>();

      return Flux.create(
          emitter -> {
            result = emitter;

            try (BrowserPage playPage = browserFactory.newPage()) {
              crawlTargetUris.add(new CrawlTargetUri(targetUri, 0));

              while (!crawlTargetUris.isEmpty()) {
                CrawlTargetUri currentTarget = crawlTargetUris.poll();
                try {
                  if (!visited.contains(currentTarget.uri)) {
                    crawlUri(playPage, currentTarget);
                    visited.add(currentTarget.uri);
                  } else {
                    log.warn("Skipping already crawled: {}", currentTarget.uri);
                  }
                } catch (Exception e) {
                  log.error("Crawl failed for URI: {}", currentTarget.toString(), e);
                  // TODO: Retry strategy?
                }
              }

              emitter.complete();
            } catch (Exception e) {
              emitter.error(e);
            }
          });
    }

    void crawlUri(BrowserPage playPage, CrawlTargetUri currentTarget) {
      log.info("Crawling {}", currentTarget);
      playPage.page().navigate(currentTarget.uri().toString());
      playPage.page().waitForLoadState(LoadState.NETWORKIDLE);

      elementScraper.removeBoilerplate(playPage.page(), contentSelector);

      Locator body = playPage.page().locator(":root > body").first();

      double score = elementScoreCalculator.score(pageTextQuery, body);
      log.info("Crawl scored={} for uri={}", score, currentTarget);

      if (score >= pageScoreThreshold) {
        log.info("Found CfP at URI={}", currentTarget);
        result.next(createIntermediateResult(playPage, currentTarget.uri(), body));
      } else {
        List<ContentUri> toCrawl = elementScraper.extractUris(currentTarget.uri(), body);

        for (ContentUri scrapedURI : toCrawl) {
          double scrapedUriScore =
              elementScoreCalculator.score(
                  pageTextQuery, String.format("[%s](%s)", scrapedURI.label(), scrapedURI.uri()));
          if (scrapedUriScore >= pageScoreThreshold && currentTarget.depth() < maxDepth) {
            log.info("Continue crawl on possible CfP link at URI={}", scrapedURI.uri());
            crawlTargetUris.add(new CrawlTargetUri(scrapedURI.uri(), currentTarget.depth() + 1));
          } else if (scrapedUriScore >= pageScoreThreshold && currentTarget.depth() >= maxDepth) {
            log.info(
                "Max depth reached, will not crawl on possible CfP link at URI={}",
                scrapedURI.uri());
          }
        }
      }
    }

    // TODO: duplicate over Operation Handlers
    private IntermediateResult createIntermediateResult(
        BrowserPage playPage, URI uri, Locator body) {
      ContentUri resultUri = new ContentUri(uri);
      Content resultContent = new Content(resultUri, elementScraper.scrapeMarkdown(body));
      List<ContentUri> resultLinks = elementScraper.extractUris(uri, body);
      List<Attachment> downloadedAttachments =
          scrapeAttachments ? attachmentDownloader.downloadAttachments(playPage, body) : List.of();

      return new IntermediateResult(resultContent, resultLinks, downloadedAttachments);
    }

    private record CrawlTargetUri(URI uri, int depth) {}
  }
}
