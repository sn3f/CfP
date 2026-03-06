package org.ilo.scraper.service.web.attachment;

import static com.microsoft.playwright.options.KeyboardModifier.*;
import static com.microsoft.playwright.options.MouseButton.*;

import com.microsoft.playwright.BrowserContext;
import com.microsoft.playwright.Download;
import com.microsoft.playwright.Locator;
import com.microsoft.playwright.Page;
import com.microsoft.playwright.TimeoutError;
import com.microsoft.playwright.options.LoadState;
import com.microsoft.playwright.options.WaitUntilState;
import com.vladsch.flexmark.html2md.converter.FlexmarkHtmlConverter;
import java.io.InputStream;
import java.net.URI;
import java.net.URISyntaxException;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.*;
import lombok.extern.slf4j.Slf4j;
import org.ilo.scraper.config.DownloaderProperties;
import org.ilo.scraper.data.operation.Attachment;
import org.ilo.scraper.data.operation.ContentUri;
import org.ilo.scraper.service.web.BrowserFactory;
import org.ilo.scraper.service.web.BrowserPage;
import org.ilo.scraper.service.web.ElementScraper;
import org.ilo.scraper.util.UrlUtil;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@EnableConfigurationProperties(DownloaderProperties.class)
public class AttachmentDownloader {
  private static final String USER_AGENT =
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

  private final DownloaderProperties properties;
  private final ElementScraper elementScraper;
  private final BrowserFactory browserFactory;

  private final HttpClient httpClient;
  private final FlexmarkHtmlConverter htmlToMarkdownConverter;
  private final AttachmentLinkExtractor attachmentLinkExtractor;

  public AttachmentDownloader(
      DownloaderProperties properties,
      ElementScraper elementScraper,
      BrowserFactory browserFactory) {
    this.properties = properties;
    this.elementScraper = elementScraper;
    this.browserFactory = browserFactory;

    this.httpClient =
        HttpClient.newBuilder()
            .followRedirects(HttpClient.Redirect.NORMAL)
            .connectTimeout(Duration.ofMillis(properties.getHttpTimeoutMs()))
            .build();
    this.htmlToMarkdownConverter = FlexmarkHtmlConverter.builder().build();
    this.attachmentLinkExtractor = new AttachmentLinkExtractor();
  }

  public List<Attachment> downloadAttachmentsUris(List<ContentUri> uris) {
    log.info("Downloading attachments from URI list.");
    Collection<AttachmentLink> attachmentLinks =
        uris.stream().map(uri -> new AttachmentLink(uri.label(), uri.uri().toString())).toList();

    return simpleDownloadAll(attachmentLinks);
  }

  /**
   * @param htmlSnippets The list of HTML snippets to extract anchor elements.
   * @return A list of unique Attachments.
   */
  public List<Attachment> downloadAttachmentsHtml(List<String> htmlSnippets) {
    log.info("Downloading attachments from html snippets.");
    Collection<AttachmentLink> attachmentLinks =
        attachmentLinkExtractor.getUniqueLinks(htmlSnippets);

    return simpleDownloadAll(attachmentLinks);
  }

  private List<Attachment> simpleDownloadAll(Collection<AttachmentLink> attachmentLinks) {
    List<Attachment> results = new ArrayList<>();
    for (AttachmentLink attachmentLink : attachmentLinks) {
      String absoluteUrl = attachmentLink.normalizedHref();

      if (isExcluded(absoluteUrl)) {
        log.debug("Skipping excluded link: {}", absoluteUrl);
        results.add(
            new Attachment.SkippedAttachment(new ContentUri(absoluteUrl), "Excluded prefix"));
        continue;
      }

      ContentUri attachmentUri = new ContentUri(attachmentLink.label(), URI.create(absoluteUrl));

      log.info("Processing download link: {}", attachmentUri);

      Attachment result = attemptSimpleDownload(attachmentUri);

      if (result == null) {
        result = attemptVisitAndScrape(attachmentUri);
      }

      if (result == null) {
        log.warn("All download/scrape strategies failed for: {}", attachmentUri);
        result =
            new Attachment.FailedAttachment(new ContentUri(absoluteUrl), "All strategies failed");
      }

      results.add(result);
    }

    log.info("Finished processing {} download links.", attachmentLinks.size());
    return results;
  }

  /**
   * @param browserPage The current Playwright Page, with boilerplate removed.
   * @param content The Locator scoping the area to search for links.
   * @return A list of unique Attachments.
   */
  public List<Attachment> downloadAttachments(BrowserPage browserPage, Locator content) {
    log.info("Downloading attachments from: {}", browserPage.page().url());

    Collection<AttachmentLiveLink> attachmentLiveLinks =
        attachmentLinkExtractor.getUniqueLinks(
            browserPage.page().url(), content.locator("a[href]"));

    List<Attachment> results = new ArrayList<>();
    for (AttachmentLiveLink link : attachmentLiveLinks) {
      Locator linkLocator = link.locator();
      String href = linkLocator.getAttribute("href");
      if (href == null || href.isBlank()) {
        continue;
      }

      String absoluteUrl = resolveUrl(browserPage.page().url(), href);
      if (absoluteUrl == null) {
        results.add(new Attachment.FailedAttachment(new ContentUri(href), "Could not resolve URL"));
        continue;
      }

      if (isExcluded(absoluteUrl)) {
        log.debug("Skipping excluded link: {}", absoluteUrl);
        results.add(
            new Attachment.SkippedAttachment(new ContentUri(absoluteUrl), "Excluded prefix"));
        continue;
      }

      String label = extractLabel(linkLocator);
      ContentUri attachmentUri = new ContentUri(label, URI.create(absoluteUrl));

      log.info("Processing download link: {}", attachmentUri);

      Attachment result = attemptSimpleDownload(attachmentUri);

      if (result == null) {
        result = attemptPlaywrightDownload(browserPage, linkLocator, attachmentUri);
      }

      if (result == null) {
        result = attemptCtrlClickAndScrape(browserPage.context(), linkLocator, attachmentUri);
      }

      if (result == null) {
        log.warn("All download/scrape strategies failed for: {}", attachmentUri);
        result =
            new Attachment.FailedAttachment(new ContentUri(absoluteUrl), "All strategies failed");
      }

      results.add(result);
    }

    log.info("Finished processing {} download links.", attachmentLiveLinks.size());
    return results;
  }

  private String extractLabel(Locator link) {
    final Set<String> textContainerTags = properties.getLinkLabelTags();
    Locator parentLocator = link.locator("..");
    String parentTagName = (String) parentLocator.evaluate("el => el.tagName.toLowerCase()");

    if (textContainerTags.contains(parentTagName)) {
      return parentLocator.textContent();
    } else {
      return link.textContent();
    }
  }

  private Attachment attemptSimpleDownload(ContentUri attachmentUri) {
    log.info("Attempt 1: Simple HTTP GET for {}", attachmentUri.uri());
    try {
      HttpRequest request =
          HttpRequest.newBuilder()
              .uri(attachmentUri.uri())
              .header("User-Agent", USER_AGENT)
              .timeout(Duration.ofMillis(properties.getHttpTimeoutMs()))
              .GET()
              .build();

      HttpResponse<byte[]> response =
          httpClient.send(request, HttpResponse.BodyHandlers.ofByteArray());

      if (response.statusCode() >= 200 && response.statusCode() < 300) {
        String contentType =
            response.headers().firstValue("Content-Type").orElse("application/octet-stream");

        if (contentType.toLowerCase().contains("text/html")) {
          log.info("Simple download was an HTML page, deleting temp file and failing.");
          return null;
        }

        String suggestedName =
            response
                .headers()
                .firstValue("Content-Disposition")
                .map(this::extractFilenameFromHeader)
                .orElse(UrlUtil.getLastPathElement(attachmentUri.uri().toString()));

        String encodedContent = Base64.getEncoder().encodeToString(response.body());

        log.info("Success (HTTP GET): Downloaded {}", attachmentUri.uri());
        return new Attachment.FileAttachment(
            attachmentUri, encodedContent, suggestedName, contentType);
      } else {
        log.warn(
            "Simple download failed for {}: HTTP Status {}",
            attachmentUri.uri(),
            response.statusCode());
        return null;
      }

    } catch (Exception e) {
      log.warn("Simple download failed for {}: {}", attachmentUri.uri(), e.getMessage());
      return null;
    }
  }

  private Attachment attemptPlaywrightDownload(
      BrowserPage browserPage, Locator linkLocator, ContentUri attachmentUri) {
    log.info("Attempt 2: Playwright waitForDownload for {}", attachmentUri);
    try (PageCleanup ignored = new PageCleanup(browserPage.context())) {
      // TODO: Click with CTRL and hope it won't modify the page
      Download download =
          browserPage
              .page()
              .waitForDownload(
                  new Page.WaitForDownloadOptions()
                      .setTimeout(properties.getPlaywrightDownloadTimeoutMs()),
                  () ->
                      linkLocator.click(
                          new Locator.ClickOptions()
                              .setButton(LEFT)
                              .setModifiers(List.of(CONTROL))));

      String suggestedFilename = download.suggestedFilename();
      String encodedContent;

      try (InputStream downloadStream = download.createReadStream()) {
        encodedContent = Base64.getEncoder().encodeToString(downloadStream.readAllBytes());
      }
      log.info("Success (Playwright Download): Downloaded {}", attachmentUri);

      return new Attachment.FileAttachment(
          attachmentUri, encodedContent, suggestedFilename, "application/octet-stream");

    } catch (TimeoutError e) {
      log.info(
          "Playwright waitForDownload timed out for {}. Not a direct download link.",
          attachmentUri);
      return null;
    } catch (Exception e) {
      log.warn("Playwright waitForDownload failed for {}: {}", attachmentUri, e.getMessage());
      return null;
    }
  }

  private static class PageCleanup implements AutoCloseable {
    BrowserContext context;
    Set<Page> pages = new HashSet<>();

    PageCleanup(BrowserContext context) {
      this.context = context;
      context.onPage(this::collect);
      context.onBackgroundPage(this::collect);
    }

    public void collect(Page page) {
      pages.add(page);
    }

    @Override
    public void close() {
      context.offPage(this::collect);
      context.offBackgroundPage(this::collect);
      pages.forEach(Page::close);
      pages.clear();
    }
  }

  private Attachment attemptCtrlClickAndScrape(
      BrowserContext context, Locator linkLocator, ContentUri attachmentUri) {
    log.info("Attempt 3: Ctrl+Click and Scrape for {}", attachmentUri);
    // TODO: Click with CTRL and hope it won't modify the page
    try (Page newPage =
        context.waitForPage(
            new BrowserContext.WaitForPageOptions()
                .setTimeout(properties.getPlaywrightPageTimeoutMs()),
            () -> linkLocator.click(new Locator.ClickOptions().setModifiers(List.of(CONTROL))))) {

      String initialUrl = newPage.url();

      // Wait for initial load
      newPage.waitForLoadState(LoadState.NETWORKIDLE);

      // Wait for potential redirection
      try {
        newPage.waitForURL(
            newUrl -> !Objects.equals(initialUrl, newUrl),
            new Page.WaitForURLOptions()
                .setWaitUntil(WaitUntilState.NETWORKIDLE)
                .setTimeout(properties.getPlaywrightNavigationTimeoutMs()));
        log.info("Redirected to: {}", newPage.url());
      } catch (TimeoutError ignore) {
        log.info("No redirect happened, current url: {}", newPage.url());
      }

      elementScraper.removeBoilerplate(newPage, null);

      String pageUrl = newPage.url();
      String htmlContent = newPage.locator(":root > body").first().innerHTML();

      String markdownContent = htmlToMarkdownConverter.convert(htmlContent);

      log.info("Success (Scrape): Scraped new page at {}", pageUrl);
      return new Attachment.ScrapedPageAttachment(attachmentUri, pageUrl, markdownContent);
    } catch (TimeoutError e) {
      log.info(
          "Playwright waitForPage (ctrl+click) timed out for {}. No new page opened.",
          attachmentUri);
      return null;
    } catch (Exception e) {
      log.warn("Playwright ctrl+click/scrape failed for {}: {}", attachmentUri, e.getMessage());
      return null;
    }
  }

  private Attachment attemptVisitAndScrape(ContentUri attachmentUri) {
    log.info("Attempt attemptVisitAndScrape: {}", attachmentUri.uri());
    try (BrowserPage playPage = browserFactory.newPage()) {
      playPage.page().navigate(attachmentUri.uri().toString());
      playPage.page().waitForTimeout(5000);
      playPage.page().waitForLoadState(LoadState.NETWORKIDLE);

      elementScraper.removeBoilerplate(playPage.page(), null);

      String pageUrl = playPage.page().url();
      String htmlContent = playPage.page().locator(":root > body").first().innerHTML();

      String markdownContent = htmlToMarkdownConverter.convert(htmlContent);

      log.info("Success (Scrape): Scraped new page at {}", pageUrl);
      return new Attachment.ScrapedPageAttachment(attachmentUri, pageUrl, markdownContent);
    } catch (TimeoutError e) {
      log.info("Playwright wait for page timed out for {}.", attachmentUri);
      return null;
    } catch (Exception e) {
      log.warn("Playwright visit and scrape failed for {}: {}", attachmentUri, e.getMessage());
      return null;
    }
  }

  private String resolveUrl(String baseUrl, String href) {
    try {
      URI base = new URI(baseUrl);
      return base.resolve(new URI(href)).toString();
    } catch (URISyntaxException | IllegalArgumentException e) {
      log.warn(
          "Could not resolve URL. Base: '{}', Href: '{}', Error: {}",
          baseUrl,
          href,
          e.getMessage());
      return null;
    }
  }

  private boolean isExcluded(String url) {
    String lowerUrl = url.toLowerCase();
    for (String prefix : properties.getExcludedPrefixes()) {
      if (lowerUrl.startsWith(prefix)) {
        return true;
      }
    }
    return false;
  }

  private String extractFilenameFromHeader(String header) {
    // e.g., "attachment; filename=\"example.pdf\""
    if (header == null || header.isEmpty()) {
      return "download-" + UUID.randomUUID();
    }
    for (String part : header.split(";")) {
      if (part.trim().startsWith("filename=")) {
        return part.trim().substring("filename=".length()).replace("\"", "").trim();
      }
    }
    return "download-" + UUID.randomUUID();
  }
}
