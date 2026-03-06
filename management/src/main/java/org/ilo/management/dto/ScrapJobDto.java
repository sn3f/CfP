package org.ilo.management.dto;

import java.time.ZonedDateTime;
import java.util.Map;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ScrapJobDto {
  String id;
  SourceDto source;
  Map<String, Object> config;
  ZonedDateTime createdAt;
}
