package org.ilo.scraper.service.web;

import static java.util.Collections.emptyList;
import static java.util.Optional.ofNullable;
import static org.apache.logging.log4j.util.Strings.isBlank;

import com.microsoft.playwright.Locator;
import com.microsoft.playwright.Page;
import com.vladsch.flexmark.html2md.converter.FlexmarkHtmlConverter;
import java.net.MalformedURLException;
import java.net.URI;
import java.net.URISyntaxException;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import org.ilo.scraper.data.operation.ContentUri;
import org.ilo.scraper.util.UrlUtil;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Component;

@Slf4j
@Component
public class ElementScraper {
  private final FlexmarkHtmlConverter converter = FlexmarkHtmlConverter.builder().build();
  private final String readabilityScriptContent;

  private final String BOILERPLATE_REMOVAL_SCRIPT =
      """
        (function() {
            var documentClone = document.cloneNode(true);
            var article = new Readability(documentClone).parse();

            if (article && article.content) {
                document.body.innerHTML = `
                    <div id='readability-wrapper'>
                        <h1>${article.title}</h1>
                        ${article.content}
                    </div>
                `;
                return true;
            }
            return false;
        })();
        """;

  public ElementScraper(@Qualifier("readabilityScript") String readabilityScriptContent) {
    this.readabilityScriptContent = readabilityScriptContent;
  }

  /**
   * Removes boilerplate from the live Playwright page.
   *
   * <p>If {@code selector} is set, then it modifies a live Playwright page to contain *only* the
   * content of the element matching the given selector.
   *
   * <p>Else, it removes boilerplate from the live Playwright's Page using Mozilla's Readability.js.
   *
   * @param livePage The page being modified.
   * @param selector The optional selector that points to main content.
   * @return Whether the removal was executed successfully.
   */
  public boolean removeBoilerplate(Page livePage, String selector) {
    if (StringUtils.isBlank(selector)) {
      return reduceToMainContent(livePage);
    } else {
      return keepOnlySelectedContent(livePage, selector);
    }
  }

  private boolean keepOnlySelectedContent(Page page, String selector) {
    String script =
        """
         (selector) => {
            var contentElements = document.querySelectorAll(selector);

            if (contentElements.length > 0) {
                var finalHtml = "";
                contentElements.forEach(function(el) {
                    finalHtml += el.outerHTML;
                });

                document.body.innerHTML = finalHtml;
                return true;
            }

            return false;
        };
        """;

    return Boolean.TRUE.equals(page.evaluate(script, selector));
  }

  private boolean reduceToMainContent(Page page) {
    Boolean isAlreadyInjected =
        (Boolean) page.evaluate("typeof window.Readability !== 'undefined'");

    if (!Boolean.TRUE.equals(isAlreadyInjected)) {
      page.addScriptTag(new Page.AddScriptTagOptions().setContent(readabilityScriptContent));
    }

    return Boolean.TRUE.equals(page.evaluate(BOILERPLATE_REMOVAL_SCRIPT));
  }

  /**
   * Scrapes the given WebElement and converts its HTML content to Markdown.
   *
   * <p>It extracts the "outerHTML" attribute from the WebElement, which includes the element itself
   * and all its children, and then converts this HTML snippet into a clean Markdown string.
   *
   * @param element The {@link Locator} to scrape. Can be null.
   * @return A string containing the Markdown representation of the element's HTML. Returns an empty
   *     string if the element is null or has no content.
   */
  public String scrapeMarkdown(Locator element) {
    return ofNullable(element)
        .map(el -> (String) el.evaluate("element => element.outerHTML"))
        .filter(html -> !isBlank(html))
        .map(converter::convert)
        .orElse("");
  }

  /**
   * Extracts all unique URIs from the element and resolves them for base url.
   *
   * @param baseUri The base uri for of the page containing the element.
   * @param element The {@link Locator} to scrape. Can be null.
   * @return A list of URI extracted from the element or empty if element was null or there were no
   *     links.
   */
  public List<ContentUri> extractUris(URI baseUri, Locator element) {
    if (element == null) {
      return emptyList();
    }

    return element.locator("a").all().stream()
        .map(anchor -> mapAnchorToContentUri(baseUri, anchor))
        .filter(Objects::nonNull)
        .collect(
            Collectors.collectingAndThen(
                Collectors.toMap(
                    contentUri ->
                        Map.entry(contentUri.uri(), ofNullable(contentUri.subId()).orElse("")),
                    Function.identity(),
                    (existing, incoming) -> existing),
                map -> (List<ContentUri>) new ArrayList<>(map.values())));
  }

  private ContentUri mapAnchorToContentUri(URI baseUri, Locator anchor) {
    String href = anchor.getAttribute("href");
    if (UrlUtil.isNotAPageOrDownloadHref(href)) {
      return null;
    }

    URI resolvedUri = resolveUri(baseUri, href);
    if (resolvedUri == null) {
      return null;
    }

    return new ContentUri(anchor.textContent(), resolvedUri);
  }

  private URI resolveUri(URI base, String href) {
    try {
      URI resolvedUri = base.resolve(href.trim());
      return resolvedUri.toURL().toURI();
    } catch (IllegalArgumentException | MalformedURLException | URISyntaxException e) {
      return null;
    }
  }
}
