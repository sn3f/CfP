package org.ilo.management.data.amqp;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class ClassificationRequestMessage {
  private String executionId;
  private String scrapResultId;
  private String url;
  private String subId;
  private String content;
}
