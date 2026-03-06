package org.ilo.scraper.data.operation;

/** Represents the downloaded attachment. */
public sealed interface Attachment {
  /**
   * @return The original, absolute URL of the link that was processed.
   */
  ContentUri attachmentUri();

  /**
   * Represents a successfully downloaded file.
   *
   * @param attachmentUri The original URL of the link.
   * @param base64Content The file content in base64 encoding.
   * @param suggestedFilename The original filename, if available (e.g., from Content-Disposition).
   * @param contentType The MIME type of the downloaded file.
   */
  record FileAttachment(
      ContentUri attachmentUri, String base64Content, String suggestedFilename, String contentType)
      implements Attachment {}

  /**
   * Represents a link that was followed, and its content scraped as text.
   *
   * @param attachmentUri The original URL of the link.
   * @param targetPageUrl The final URL of the page that was scraped.
   * @param markdownContent The scraped content of the page, converted to Markdown.
   */
  record ScrapedPageAttachment(
      ContentUri attachmentUri, String targetPageUrl, String markdownContent)
      implements Attachment {}

  /**
   * Represents a link that could not be processed by any method.
   *
   * @param attachmentUri The original URL of the link.
   * @param reason A message explaining why the download failed.
   */
  record FailedAttachment(ContentUri attachmentUri, String reason) implements Attachment {}

  /**
   * Represents a link that was intentionally skipped (e.g., "mailto:").
   *
   * @param attachmentUri The original URL of the link.
   * @param reason The reason for skipping (e.g., "Excluded prefix").
   */
  record SkippedAttachment(ContentUri attachmentUri, String reason) implements Attachment {}
}
