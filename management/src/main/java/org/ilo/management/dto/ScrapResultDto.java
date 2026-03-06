package org.ilo.management.dto;

import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.List;
import lombok.Getter;
import lombok.Setter;
import org.ilo.management.model.ScrapResultStatus;

@Getter
@Setter
public class ScrapResultDto {
  private Long id;
  private ZonedDateTime timestamp;
  private ScrapJobDto scrapJob;
  private ScrapResultStatus status;
  private String url;
  private String subId;
  private String content;
  private List<ScrapAttachmentDto> attachments = new ArrayList<>();
  private String promptContext;
}
