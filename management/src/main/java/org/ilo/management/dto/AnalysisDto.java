package org.ilo.management.dto;

import java.time.LocalDate;
import java.time.ZonedDateTime;
import java.util.List;
import java.util.Map;
import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode
public class AnalysisDto {
  private Long id;
  private AnalysisJobDto analysisJob;
  private String url;
  private String title;
  private ZonedDateTime timestamp;
  private Boolean eligible;
  private String exclusionReason;
  private Double confidenceScore;
  private LocalDate deadline;
  private Double match;
  private Map<String, Object> extractedData;
  private String content;
  private String classificationSummary;
  private List<CriterionDto> criteria;
}
