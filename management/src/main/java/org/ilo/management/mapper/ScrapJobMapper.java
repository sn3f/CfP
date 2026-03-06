package org.ilo.management.mapper;

import lombok.RequiredArgsConstructor;
import org.ilo.management.dto.ScrapJobDto;
import org.ilo.management.model.ScrapJob;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class ScrapJobMapper {
  private final SourceMapper sourceMapper;

  public ScrapJobDto toDto(ScrapJob entity) {
    if (entity == null) {
      return null;
    }

    ScrapJobDto dto = new ScrapJobDto();
    dto.setId(entity.getId());
    dto.setSource(sourceMapper.toDto(entity.getSource()));
    dto.setConfig(entity.getConfig());
    dto.setCreatedAt(entity.getCreatedAt());

    return dto;
  }
}
