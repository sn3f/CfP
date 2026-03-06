package org.ilo.management.dto;

import java.time.ZonedDateTime;
import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode
public class AnalysisJobDto {
  private String id;
  private ScrapResultDto scrapResult;
  private ZonedDateTime createdAt;
}
