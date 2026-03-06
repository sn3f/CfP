package org.ilo.management.service.ai;

import static java.lang.System.lineSeparator;
import static org.ilo.management.data.amqp.ScrapResultMessage.ScrapResultAttachment.ContentType.BASE64;
import static org.ilo.management.data.amqp.ScrapResultMessage.ScrapResultAttachment.ContentType.MARKDOWN;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.Base64;
import lombok.extern.slf4j.Slf4j;
import org.apache.tika.exception.TikaException;
import org.apache.tika.metadata.Metadata;
import org.apache.tika.parser.AutoDetectParser;
import org.apache.tika.parser.ParseContext;
import org.apache.tika.sax.BodyContentHandler;
import org.ilo.management.model.ScrapAttachment;
import org.ilo.management.model.ScrapResult;
import org.springframework.stereotype.Service;
import org.xml.sax.SAXException;

@Slf4j
@Service
public class ContextService {
  public void rebuildContext(ScrapResult scrapResult) {
    StringBuilder contextBuilder = new StringBuilder();
    contextBuilder.append(scrapResult.getContent());
    contextBuilder.append(lineSeparator());

    for (ScrapAttachment attachment : scrapResult.getAttachments()) {
      try {
        String attachmentContent = convertContent(attachment);

        contextBuilder
            .append(lineSeparator())
            .append("# ATTACHMENT: [")
            .append(attachment.getLabel())
            .append("](")
            .append(attachment.getUrl())
            .append(")")
            .append(lineSeparator())
            .append(attachmentContent)
            .append(lineSeparator());
      } catch (TikaException | IOException | SAXException e) {
        log.error(
            "Failed to read Attachment content for {}, ({})",
            attachment.getLabel(),
            attachment.getUrl());
      }
    }

    scrapResult.setPromptContext(contextBuilder.toString());
  }

  private String convertContent(ScrapAttachment attachment)
      throws IOException, TikaException, SAXException {
    if (MARKDOWN.name().equals(attachment.getContentType())) {
      return attachment.getContent();
    } else if (BASE64.name().equals(attachment.getContentType())) {
      byte[] fileBytes = Base64.getDecoder().decode(attachment.getContent());

      AutoDetectParser parser = new AutoDetectParser();
      BodyContentHandler handler = new BodyContentHandler(-1);
      Metadata metadata = new Metadata();

      metadata.set(Metadata.CONTENT_DISPOSITION, attachment.getLabel());

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
