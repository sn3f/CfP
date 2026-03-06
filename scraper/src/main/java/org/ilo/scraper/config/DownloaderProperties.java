package org.ilo.scraper.config;

import java.util.Set;
import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;

// TODO: Refactor/move to proper place
@Getter
@Setter
@ConfigurationProperties(prefix = "attachment.downloader")
public class DownloaderProperties {

  /** A set of URL prefixes to exclude from processing (e.g., "mailto:"). */
  private Set<String> excludedPrefixes = Set.of("mailto:", "tel:", "javascript:", "#");

  private Set<String> linkLabelTags =
      Set.of(
          "p",
          "strong",
          "span",
          "em",
          "b",
          "i",
          "u",
          "mark",
          "code",
          "q",
          "cite",
          "small",
          "s",
          "strike",
          "h1",
          "h2",
          "h3",
          "h4",
          "h5",
          "h6",
          "blockquote",
          "figcaption",
          "pre",
          "li",
          "td",
          "th");

  /** Timeout in milliseconds for simple HTTP download attempts. */
  private int httpTimeoutMs = 5000;

  /** Timeout in milliseconds for Playwright "waitForDownload" events. */
  private int playwrightDownloadTimeoutMs = 10000;

  /** Timeout in milliseconds for Playwright "waitForPage" (ctrl+click) events. */
  private int playwrightPageTimeoutMs = 15000;

  /** Timeout in milliseconds for Playwright "waitForUrl" events. */
  private int playwrightNavigationTimeoutMs = 4000;
}
