package org.ilo.scraper.service.web;

import com.microsoft.playwright.*;
import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import java.util.List;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class BrowserFactory {

  private static final List<String> ARGS =
      List.of(
          "--no-sandbox",
          "--disable-infobars",
          "--disable-extensions",
          "--disable-dev-shm-usage",
          "--disable-gpu",
          "--ignore-certificate-errors",
          "--disable-blink-features=AutomationControlled");

  private static final String USER_AGENT =
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

  private Playwright playwright;
  private Browser browser;

  @PostConstruct
  private void initialize() {
    playwright = Playwright.create();
    BrowserType.LaunchOptions launchOptions =
        new BrowserType.LaunchOptions().setHeadless(true).setArgs(ARGS);

    browser = playwright.chromium().launch(launchOptions);
  }

  public BrowserPage newPage() {
    Browser.NewContextOptions contextOptions =
        new Browser.NewContextOptions()
            .setUserAgent(USER_AGENT)
            .setViewportSize(1920, 1080)
            .setBypassCSP(true)
            .setLocale("en-US");

    BrowserContext context = browser.newContext(contextOptions);
    addStealthScripts(context);
    return new BrowserPage(context, context.newPage());
  }

  @PreDestroy
  public void shutdown() {
    log.info("Shutting down Playwright pool.");
    if (browser != null) {
      browser.close();
    }
    if (playwright != null) {
      playwright.close();
    }
    log.info("Playwright pool shut down successfully.");
  }

  private void addStealthScripts(BrowserContext context) {
    // Hides the webdriver flag
    context.addInitScript("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})");

    // Spoofs plugin information
    context.addInitScript(
        "const newProto = navigator.plugins.__proto__;"
            + "delete newProto.item;"
            + "delete newProto.namedItem;"
            + "Object.defineProperty(navigator, 'plugins', {get: () => { return { '0': { '0': { type: 'application/pdf', suffixes: 'pdf', description: 'Portable Document Format' } }, '1': { '0': { type: 'application/x-google-chrome-pdf', suffixes: 'pdf', description: 'Portable Document Format' } } }; }});");

    // Spoofs language settings
    context.addInitScript(
        "Object.defineProperty(navigator, 'languages', {get: () => ['en-US', 'en']});");

    // Overrides permissions API to prevent detection
    context.addInitScript(
        "const originalQuery = window.navigator.permissions.query;"
            + "window.navigator.permissions.query = (parameters) => (parameters.name === 'notifications' ? Promise.resolve({ state: Notification.permission }) : originalQuery(parameters));");

    // Spoofs WebGL vendor and renderer
    context.addInitScript(
        "const getParameter = WebGLRenderingContext.prototype.getParameter;"
            + "WebGLRenderingContext.prototype.getParameter = function(parameter) {"
            + "  if (parameter === 37445) { return 'Intel Inc.'; }"
            + "  if (parameter === 37446) { return 'Intel Iris OpenGL Engine'; }"
            + "  return getParameter(parameter);"
            + "};");
  }
}
