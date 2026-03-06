package org.ilo.scraper.data.operation;

/**
 * The scraped content.
 *
 * @param contentLocation Uniquely identifies the content.
 * @param contentMarkdown The markdown formated string with content.
 */
public record Content(ContentUri contentLocation, String contentMarkdown) {}
