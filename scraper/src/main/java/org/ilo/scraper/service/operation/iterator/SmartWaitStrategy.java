package org.ilo.scraper.service.operation.iterator;

import com.microsoft.playwright.Locator;
import com.microsoft.playwright.Page;
import com.microsoft.playwright.TimeoutError;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

/**
 * A "smart" wait strategy that combines a static delay with content verification. It waits for the
 * page to transition by checking if the first few items in the list have changed from the previous
 * page.
 */
@Slf4j
@Component
public class SmartWaitStrategy implements WaitStrategy {

  private final long staticWaitMillis;
  private final int itemsToCheck;

  public SmartWaitStrategy() {
    // TODO: use application.yml
    this(2000, 3);
  }

  public SmartWaitStrategy(long staticWaitMillis, int itemsToCheck) {
    this.staticWaitMillis = staticWaitMillis;
    this.itemsToCheck = itemsToCheck;
  }

  @Override
  public Set<Integer> prepareItemSignatures(List<Locator> currentPageItems) {
    return currentPageItems.stream()
        .limit(itemsToCheck)
        .map(Locator::textContent)
        .map(String::hashCode)
        .collect(Collectors.toSet());
  }

  @Override
  public void awaitNextPage(
      Page playPage, String itemSelector, Set<Integer> previousItemSignatures) {
    try {
      log.debug("Performing initial static wait for {} ms.", staticWaitMillis);
      Thread.sleep(staticWaitMillis);
    } catch (InterruptedException e) {
      Thread.currentThread().interrupt();
      throw new RuntimeException("Wait strategy was interrupted.", e);
    }

    try {
      Locator itemsElements = playPage.locator(itemSelector);

      log.debug("Waiting for at least one item to be present on the new page.");
      itemsElements.first().waitFor();

      List<Locator> newItems = playPage.locator(itemSelector).all();

      if (!newItems.isEmpty()) {
        Set<Integer> newItemSignatures = prepareItemSignatures(newItems);
        if (!Objects.equals(newItemSignatures, previousItemSignatures)) {
          log.info("Content change detected. Proceeding.");
          return;
        } else {
          log.warn("Content appears to be the same as the previous page. Retrying...");
        }
      }
    } catch (TimeoutError te) {
      log.info("Wait timeout exceeded.");
    } catch (Exception e) {
      log.error("Exception during smart wait check", e);
    }

    throw new FailedToDetectNewContent();
  }

  public static class FailedToDetectNewContent extends RuntimeException {
    public FailedToDetectNewContent() {
      super("Failed to detect new page content.");
    }
  }
}
