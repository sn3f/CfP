package org.ilo.scraper.data.amqp;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.util.List;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@JsonIgnoreProperties(ignoreUnknown = true)
public class ScrapRequestMessage {
  private String executionId;
  private String rootUri;
  private Configuration configuration;

  @Getter
  @Setter
  @JsonIgnoreProperties(ignoreUnknown = true)
  public static final class Configuration {
    List<ScrapStep> steps;
  }
}
