package org.ilo.scraper.data.operation.result;

import java.util.List;
import java.util.UUID;
import org.ilo.scraper.data.operation.Attachment;
import org.ilo.scraper.data.operation.Content;

public record TerminalResult(UUID uuid, Content pageMarkdown, List<Attachment> attachments) {
  public TerminalResult(Content pageMarkdown, List<Attachment> attachments) {
    this(UUID.randomUUID(), pageMarkdown, attachments);
  }
}
