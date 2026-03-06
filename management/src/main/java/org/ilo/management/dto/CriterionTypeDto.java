package org.ilo.management.dto;

import lombok.Data;

@Data
public class CriterionTypeDto {
  private Long id;
  private String fieldName;
  private String evaluationLogic;
  private String examples;
  private Boolean hard;
}
