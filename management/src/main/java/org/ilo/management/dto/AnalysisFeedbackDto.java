package org.ilo.management.dto;

import java.time.ZonedDateTime;
import java.util.List;
import lombok.Data;

@Data
public class AnalysisFeedbackDto {
  private Long id;
  private AnalysisDto cfpAnalysis;
  private UserDto owner;
  private ZonedDateTime createdAt;
  private ZonedDateTime updatedAt;
  private List<CfpAnalysisFeedbackItemDto> items;
}
