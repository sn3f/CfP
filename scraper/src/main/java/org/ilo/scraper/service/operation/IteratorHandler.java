package org.ilo.scraper.service.operation;

import static java.util.Collections.emptySet;
import static org.apache.commons.lang3.StringUtils.abbreviate;
import static org.apache.commons.lang3.StringUtils.isNotBlank;

import com.microsoft.playwright.Locator;
import com.microsoft.playwright.Page;
import com.microsoft.playwright.TimeoutError;
import com.microsoft.playwright.options.LoadState;
import java.net.URI;
import java.util.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.ilo.scraper.data.amqp.Operation;
import org.ilo.scraper.data.operation.*;
import org.ilo.scraper.data.operation.Attachment;
import org.ilo.scraper.data.operation.result.IntermediateResult;
import org.ilo.scraper.service.operation.iterator.SmartWaitStrategy;
import org.ilo.scraper.service.operation.iterator.WaitStrategy;
import org.ilo.scraper.service.web.*;
import org.ilo.scraper.service.web.attachment.AttachmentDownloader;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;

@Slf4j
@Service
@RequiredArgsConstructor
public class IteratorHandler implements IntermediateOperationHandler {
  // TODO: Document configuration
  private static final String ITEM_SELECTOR_KEY = "item-selector";
  private static final String NEXT_PAGE_SELECTOR_KEY = "next-page-selector";
  private static final String SCRAPE_ATTACHMENTS = "scrap-attachments";

  private final ElementScraper elementScraper;
  private final AttachmentDownloader attachmentDownloader;
  private final WaitStrategy waitStrategy;
  private final BrowserFactory browserFactory;

  @Override
  public Operation getOperation() {
    return Operation.ITERATOR;
  }

  @Override
  public Flux<IntermediateResult> execute(
      Map<String, String> configuration, IntermediateResult intermediateResult) {
    return Flux.fromIterable(intermediateResult.uris())
        .flatMapSequential(contentUri -> fetchAllPages(configuration, contentUri.uri()));
  }

  private Flux<IntermediateResult> fetchAllPages(Map<String, String> configuration, URI rootUri) {
    return Flux.create(
        emitter -> {
          try (BrowserPage playPage = browserFactory.newPage()) {
            playPage.page().navigate(rootUri.toString());

            String itemSelector = configuration.get(ITEM_SELECTOR_KEY);

            log.info(
                "Waiting for initial page load to find items with selector '{}'...", itemSelector);
            waitStrategy.awaitNextPage(playPage.page(), itemSelector, emptySet());

            int pageNumber = 1;
            while (true) {
              log.info("Processing page number: {}", pageNumber);

              List<Locator> currentPageItems = playPage.page().locator(itemSelector).all();

              if (currentPageItems.isEmpty()) {
                log.warn(
                    "No items found on page {} using selector '{}'. Checking for next page button.",
                    pageNumber,
                    itemSelector);
              }

              for (Locator itemElement : currentPageItems) {
                log.info(
                    "Found item {}",
                    abbreviate(itemElement.textContent().replaceAll("\\R", " "), 100));
                emitter.next(
                    createIntermediateResult(
                        configuration, playPage, URI.create(playPage.page().url()), itemElement));
              }

              String nextPageSelector = configuration.get(NEXT_PAGE_SELECTOR_KEY);

              if (isNotBlank(nextPageSelector)
                  && nextPage(playPage.page(), currentPageItems, nextPageSelector, itemSelector)) {
                pageNumber++;
              } else {
                break;
              }
            }

            emitter.complete();
          } catch (Exception e) {
            emitter.error(e);
          }
        });
  }

  private boolean nextPage(
      Page playPage, List<Locator> currentPageItems, String nextPageSelector, String itemSelector) {
    try {
      Set<Integer> previousItemSignatures = waitStrategy.prepareItemSignatures(currentPageItems);

      Locator nextPageBtn = playPage.locator(nextPageSelector).last();
      clickWithFallback(nextPageBtn);
      playPage.waitForLoadState(LoadState.NETWORKIDLE);

      waitStrategy.awaitNextPage(playPage, itemSelector, previousItemSignatures);

      return true;
    } catch (TimeoutError | SmartWaitStrategy.FailedToDetectNewContent e) {
      log.info(
          "'Next page' button not found with selector '{}'. Assuming last page.",
          nextPageSelector,
          e);
      return false;
    } catch (Exception e) {
      log.error(
          "Failed to click 'next page' button even with robust strategies. Ending pagination.", e);
      return false;
    }
  }

  private void clickWithFallback(Locator nextPageBtn) {
    try {
      nextPageBtn.click();
    } catch (TimeoutError te) {
      log.warn("Failed to click, dispatching click event.", te);
      nextPageBtn.dispatchEvent("click");
    }
  }

  // TODO: duplicate over Operation Handlers
  private IntermediateResult createIntermediateResult(
      Map<String, String> configuration, BrowserPage playPage, URI baseUri, Locator itemElement) {
    // TODO: Naive way of finding subId
    //  For pages like https://mptf.undp.org/page/funding-call-proposals it must ensure we return
    //  CfP only once, but still get new CfP if "slot" content changes
    boolean scrapeAttachments = Boolean.parseBoolean(configuration.get(SCRAPE_ATTACHMENTS));

    ContentUri listItemUri = new ContentUri(baseUri, "" + itemElement.textContent().hashCode());
    Content listItemContent = new Content(listItemUri, elementScraper.scrapeMarkdown(itemElement));
    List<ContentUri> listItemLinks = elementScraper.extractUris(baseUri, itemElement);
    List<Attachment> downloadedAttachments =
        scrapeAttachments
            ? attachmentDownloader.downloadAttachments(playPage, itemElement)
            : List.of();

    return new IntermediateResult(listItemContent, listItemLinks, downloadedAttachments);
  }
}
