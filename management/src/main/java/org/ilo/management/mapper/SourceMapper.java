package org.ilo.management.mapper;

import lombok.RequiredArgsConstructor;
import org.ilo.management.dto.SourceDto;
import org.ilo.management.model.Source;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class SourceMapper {

  public SourceDto toDto(Source entity) {
    if (entity == null) {
      return null;
    }

    SourceDto dto = new SourceDto();
    dto.setId(entity.getId());
    dto.setName(entity.getName());
    dto.setWebsiteUrl(entity.getWebsiteUrl());
    dto.setStatus(entity.getStatus());
    dto.setFrequency(entity.getFrequency());
    dto.setClassification(entity.getClassification());
    dto.setGuidelines(entity.getGuidelines());
    dto.setConfig(entity.getConfig());

    return dto;
  }

  public Source toEntity(SourceDto sourceDto) {
    if (sourceDto == null) {
      return null;
    }

    Source entity = new Source();
    entity.setId(sourceDto.getId());
    entity.setName(sourceDto.getName());
    entity.setWebsiteUrl(sourceDto.getWebsiteUrl());
    entity.setStatus(sourceDto.getStatus());
    entity.setFrequency(sourceDto.getFrequency());
    entity.setClassification(sourceDto.getClassification());
    entity.setGuidelines(sourceDto.getGuidelines());
    entity.setConfig(sourceDto.getConfig());

    return entity;
  }

  public void updateEntityFromDto(SourceDto sourceDto, Source source) {
    if (sourceDto == null || source == null) {
      return;
    }

    source.setName(sourceDto.getName());
    source.setWebsiteUrl(sourceDto.getWebsiteUrl());
    source.setStatus(sourceDto.getStatus());
    source.setFrequency(sourceDto.getFrequency());
    source.setClassification(sourceDto.getClassification());
    source.setGuidelines(sourceDto.getGuidelines());
    source.setConfig(sourceDto.getConfig());
  }
}
