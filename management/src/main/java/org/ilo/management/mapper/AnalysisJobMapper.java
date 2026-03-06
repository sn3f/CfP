package org.ilo.management.mapper;

import lombok.RequiredArgsConstructor;
import org.ilo.management.dto.AnalysisJobDto;
import org.ilo.management.model.AnalysisJob;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class AnalysisJobMapper {
  private final ScrapResultMapper scrapResultMapper;

  public AnalysisJobDto toDto(AnalysisJob entity) {
    if (entity == null) {
      return null;
    }

    AnalysisJobDto dto = new AnalysisJobDto();
    dto.setId(entity.getId());
    dto.setCreatedAt(entity.getCreatedAt());
    dto.setScrapResult(scrapResultMapper.toDto(entity.getScrapResult()));

    return dto;
  }
}
