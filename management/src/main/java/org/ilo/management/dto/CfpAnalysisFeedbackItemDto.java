package org.ilo.management.dto;

import lombok.Data;
import org.ilo.management.model.CfpAnalysisFeedbackItemType;

@Data
public class CfpAnalysisFeedbackItemDto {
  private Long id;
  private String key;
  private CfpAnalysisFeedbackItemType type;
  private String name;
  private String evidence;
  private String value;
  private Boolean correct;
  private String comment;
}
