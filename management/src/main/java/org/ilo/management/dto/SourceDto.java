package org.ilo.management.dto;

import java.util.Map;
import lombok.Data;
import org.ilo.management.model.ClassificationStatus;
import org.ilo.management.model.SourceStatus;

@Data
public class SourceDto {
  private Long id;
  private String name;
  private String websiteUrl;
  private SourceStatus status;
  private String frequency;
  private ClassificationStatus classification;
  private String guidelines;
  private Map<String, Object> config;
}
