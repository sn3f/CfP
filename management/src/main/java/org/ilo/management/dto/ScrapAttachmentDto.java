package org.ilo.management.dto;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ScrapAttachmentDto {
  private Long id;
  private String label;
  private String url;
  private String subId;
}
