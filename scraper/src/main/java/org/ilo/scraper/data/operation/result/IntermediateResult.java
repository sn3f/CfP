package org.ilo.scraper.data.operation.result;

import java.util.List;
import org.ilo.scraper.data.operation.Attachment;
import org.ilo.scraper.data.operation.Content;
import org.ilo.scraper.data.operation.ContentUri;

public record IntermediateResult(
    Content content, List<ContentUri> uris, List<Attachment> attachments) {
  public IntermediateResult(Content content, List<ContentUri> uris) {
    this(content, uris, List.of());
  }
}
