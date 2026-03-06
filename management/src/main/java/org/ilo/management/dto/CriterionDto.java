package org.ilo.management.dto;

import lombok.Data;

@Data
public class CriterionDto {
  private Long id;
  private String status;
  private String evidence;
  private CriterionTypeDto type;
}
