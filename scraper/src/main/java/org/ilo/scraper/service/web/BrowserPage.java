package org.ilo.scraper.service.web;

import com.microsoft.playwright.BrowserContext;
import com.microsoft.playwright.Page;

public record BrowserPage(BrowserContext context, Page page) implements AutoCloseable {
  @Override
  public void close() {
    page.close();
    context.close();
  }
}
