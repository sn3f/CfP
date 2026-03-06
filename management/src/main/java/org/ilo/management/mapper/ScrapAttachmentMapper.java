package org.ilo.management.mapper;

import static org.ilo.management.data.amqp.ScrapResultMessage.ScrapResultAttachment.ContentType.BASE64;

import java.io.IOException;
import java.util.Base64;
import lombok.RequiredArgsConstructor;
import org.ilo.management.data.amqp.ScrapResultMessage;
import org.ilo.management.dto.ScrapAttachmentDto;
import org.ilo.management.model.ScrapAttachment;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

@Component
@RequiredArgsConstructor
public class ScrapAttachmentMapper {

  public ScrapAttachmentDto toDto(ScrapAttachment entity) {
    if (entity == null) {
      return null;
    }

    ScrapAttachmentDto dto = new ScrapAttachmentDto();
    dto.setId(entity.getId());
    dto.setLabel(entity.getLabel());
    dto.setUrl(entity.getUrl());
    dto.setSubId(entity.getSubId());

    return dto;
  }

  public ScrapAttachment toEntity(ScrapResultMessage.ScrapResultAttachment attachment) {
    if (attachment == null) {
      return null;
    }

    ScrapAttachment entity = new ScrapAttachment();
    entity.setLabel(attachment.getLabel());
    entity.setUrl(attachment.getUri());
    entity.setSubId(attachment.getSubId());
    entity.setContentType(attachment.getContentType().name());
    entity.setContent(attachment.getEncodedContent());

    return entity;
  }

  public ScrapAttachment toEntity(MultipartFile attachment) {
    if (attachment == null) {
      return null;
    }

    ScrapAttachment entity = new ScrapAttachment();
    entity.setLabel(attachment.getOriginalFilename());
    entity.setUrl(attachment.getName());
    entity.setSubId(null);
    entity.setContentType(BASE64.name());

    try {
      entity.setContent(Base64.getEncoder().encodeToString(attachment.getBytes()));
    } catch (IOException ioe) {
      throw new IllegalArgumentException("Failed to read attachment: " + attachment.getName(), ioe);
    }

    return entity;
  }
}
