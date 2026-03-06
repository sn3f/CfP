package org.ilo.management.service;

import org.ilo.management.dto.AnalysisJobDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface AnalysisJobService {
  AnalysisJobDto findById(String id);

  Page<AnalysisJobDto> search(String search, Pageable pageable);

  AnalysisJobDto createAnalysisJob(Long scrapResultId);
}
