package org.ilo.scraper.service.operation.iterator;

import com.microsoft.playwright.Locator;
import com.microsoft.playwright.Page;
import java.util.List;
import java.util.Set;

public interface WaitStrategy {

  Set<Integer> prepareItemSignatures(List<Locator> currentPageItems);

  /**
   * Waits until the content on the page has changed, indicating a successful page transition.
   *
   * @param playPage The Playwright Page instance.
   * @param itemSelector The selector used to identify items on the page.
   * @param previousItemSignatures A list of hashcode for previous page items
   */
  void awaitNextPage(Page playPage, String itemSelector, Set<Integer> previousItemSignatures);
}
