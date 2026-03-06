package org.ilo.scraper.debug;

import static java.lang.System.lineSeparator;
import static org.apache.commons.lang3.StringUtils.abbreviate;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Base64;
import lombok.extern.slf4j.Slf4j;
import org.apache.tika.exception.TikaException;
import org.apache.tika.metadata.Metadata;
import org.apache.tika.parser.AutoDetectParser;
import org.apache.tika.parser.ParseContext;
import org.apache.tika.sax.BodyContentHandler;
import org.ilo.scraper.data.operation.Attachment;
import org.ilo.scraper.data.operation.result.TerminalResult;
import org.springframework.stereotype.Component;
import org.xml.sax.SAXException;

@Slf4j
@Component
public class TerminalResultWriter {

  public void writePageToFile(TerminalResult terminalResult, Path outputDirectory, int index) {
    try {
      Files.createDirectories(outputDirectory);
    } catch (IOException e) {
      log.error("Failed to create output directory: {}", outputDirectory, e);
      throw new RuntimeException("Could not create directory for pages.", e);
    }

    String fileName = String.format("page_%d.md", index);
    Path filePath = outputDirectory.resolve(fileName);

    try {
      String content = buildFileContent(terminalResult);
      Files.writeString(filePath, content);
      log.info("Successfully wrote file: {}", filePath);
    } catch (IOException | TikaException | SAXException e) {
      log.error(
          "Failed to write file {} for TerminalResult ({}): {}",
          filePath,
          terminalResult.uuid(),
          abbreviate(terminalResult.pageMarkdown().contentMarkdown(), 100),
          e);
    }
  }

  private String buildFileContent(TerminalResult terminalResult)
      throws TikaException, IOException, SAXException {
    StringBuilder contentBuilder = new StringBuilder();
    contentBuilder.append(terminalResult.pageMarkdown().contentMarkdown());

    if (terminalResult.attachments() != null) {
      for (Attachment attachment : terminalResult.attachments()) {
        if (attachment instanceof Attachment.FailedAttachment failedAttachment) {
          log.error(
              "Failed attachment {}, caused by: {}",
              failedAttachment.attachmentUri(),
              failedAttachment.reason());
        } else if (attachment instanceof Attachment.SkippedAttachment skippedAttachment) {
          log.error(
              "Skipped attachment {}, caused by: {}",
              skippedAttachment.attachmentUri(),
              skippedAttachment.reason());
        } else {
          contentBuilder
              .append(lineSeparator())
              .append("# ATTACHMENT: [")
              .append(attachment.attachmentUri().label())
              .append("](")
              .append(attachment.attachmentUri().uri())
              .append(")")
              .append(lineSeparator())
              .append(convertContent(attachment))
              .append(lineSeparator());
        }
      }
    }

    return contentBuilder.toString();
  }

  private String convertContent(Attachment attachment)
      throws IOException, TikaException, SAXException {
    if (attachment instanceof Attachment.ScrapedPageAttachment scrapedPageAttachment) {
      return scrapedPageAttachment.markdownContent();
    } else if (attachment instanceof Attachment.FileAttachment fileAttachment) {
      byte[] fileBytes = Base64.getDecoder().decode(fileAttachment.base64Content());

      AutoDetectParser parser = new AutoDetectParser();
      BodyContentHandler handler = new BodyContentHandler(-1);
      Metadata metadata = new Metadata();

      metadata.set(Metadata.CONTENT_DISPOSITION, attachment.attachmentUri().label());

      ParseContext context = new ParseContext();

      try (InputStream stream = new ByteArrayInputStream(fileBytes)) {
        parser.parse(stream, handler, metadata, context);
      }

      return handler.toString();
    } else {
      return null;
    }
  }
}
