package org.ilo.management.mapper;

import jakarta.persistence.EntityNotFoundException;
import java.time.ZonedDateTime;
import lombok.RequiredArgsConstructor;
import org.ilo.management.data.amqp.ScrapResultMessage;
import org.ilo.management.dto.ScrapResultDto;
import org.ilo.management.model.ScrapResult;
import org.ilo.management.model.ScrapResultStatus;
import org.ilo.management.repository.ScrapJobRepository;
import org.ilo.management.service.ai.ContextService;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class ScrapResultMapper {
  private final ScrapAttachmentMapper scrapAttachmentMapper;
  private final ScrapJobRepository scrapJobRepository;
  private final ScrapJobMapper scrapJobMapper;
  private final ContextService contextService;

  public ScrapResultDto toDto(ScrapResult entity) {
    if (entity == null) {
      return null;
    }

    ScrapResultDto dto = new ScrapResultDto();
    dto.setId(entity.getId());
    dto.setTimestamp(entity.getTimestamp());
    dto.setScrapJob(scrapJobMapper.toDto(entity.getScrapJob()));
    dto.setStatus(entity.getStatus());
    dto.setUrl(entity.getUrl());
    dto.setSubId(entity.getSubId());
    dto.setContent(entity.getContent());
    dto.setPromptContext(entity.getPromptContext());
    dto.setAttachments(entity.getAttachments().stream().map(scrapAttachmentMapper::toDto).toList());

    return dto;
  }

  public ScrapResult toEntity(ScrapResultMessage message) {
    if (message == null) {
      return null;
    }

    ScrapResult entity = new ScrapResult();
    entity.setTimestamp(ZonedDateTime.now());
    entity.setScrapJob(
        scrapJobRepository
            .findById(message.getExecutionId())
            .orElseThrow(
                () ->
                    new EntityNotFoundException(
                        "Scrap Job not found with Execution Id: " + message.getExecutionId())));
    entity.setStatus(ScrapResultStatus.NEW);
    entity.setUrl(message.getUri());
    entity.setSubId(message.getSubId());
    entity.setContent(message.getPageMarkdown());
    entity.setAttachments(
        message.getAttachments().stream().map(scrapAttachmentMapper::toEntity).toList());
    entity.getAttachments().forEach(a -> a.setScrapResult(entity));

    contextService.rebuildContext(entity);

    return entity;
  }
}
