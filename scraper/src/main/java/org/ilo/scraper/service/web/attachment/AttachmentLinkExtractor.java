package org.ilo.scraper.service.web.attachment;

import com.microsoft.playwright.Locator;
import java.net.URI;
import java.util.Collection;
import java.util.List;
import java.util.Objects;
import java.util.function.Function;
import java.util.stream.Collectors;
import lombok.extern.slf4j.Slf4j;
import org.ilo.scraper.util.UrlUtil;
import org.jsoup.Jsoup;

@Slf4j
public class AttachmentLinkExtractor {
  public Collection<AttachmentLink> getUniqueLinks(List<String> htmlSnippets) {
    return htmlSnippets.stream()
        .map(Jsoup::parseBodyFragment)
        .flatMap(doc -> doc.select("a[href]").stream())
        .map(
            link -> {
              String label = link.text();
              String rawHref = link.attr("href");
              String normalized = normalizeAndResolve(rawHref, null);
              return (normalized != null) ? new AttachmentLink(label, normalized) : null;
            })
        .filter(Objects::nonNull)
        .collect(
            Collectors.toMap(
                AttachmentLink::normalizedHref, link -> link, (existing, replacement) -> existing))
        .values();
  }

  public Collection<AttachmentLiveLink> getUniqueLinks(String baseUrl, Locator linksLocator) {
    return linksLocator.all().stream()
        .filter(
            locator -> {
              String href = locator.getAttribute("href");
              return !UrlUtil.isNotAPageOrDownloadHref(href);
            })
        .map(
            locator -> {
              String href = locator.getAttribute("href");
              String normalized = normalizeAndResolve(href, baseUrl);
              return new AttachmentLiveLink(locator, normalized);
            })
        .filter(link -> Objects.nonNull(link.normalizedHref()) && !link.normalizedHref().isEmpty())
        .collect(
            Collectors.toMap(
                AttachmentLiveLink::normalizedHref,
                Function.identity(),
                (existing, replacement) -> existing))
        .values();
  }

  private String normalizeAndResolve(String href, String baseUrl) {
    if (href == null || href.isBlank()) {
      return null;
    }

    try {
      final URI resolvedUri;

      if (baseUrl != null) {
        URI baseUri = new URI(baseUrl);
        resolvedUri = baseUri.resolve(new URI(href.strip()));
      } else {
        resolvedUri = new URI(href.strip());
      }

      URI normalizedUri =
          new URI(
              resolvedUri.getScheme(),
              resolvedUri.getAuthority(),
              resolvedUri.getPath(),
              resolvedUri.getQuery(),
              null // removes the #fragment
              );

      String scheme = normalizedUri.getScheme();
      if ("http".equalsIgnoreCase(scheme) || "https".equalsIgnoreCase(scheme)) {
        return normalizedUri.toString();
      } else {
        return null;
      }

    } catch (Exception e) {
      log.error("Failed to parse URI: {} | Base: {}", href, baseUrl);
      return null;
    }
  }
}
