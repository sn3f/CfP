package org.ilo.management.data.amqp;

import java.util.List;
import java.util.Map;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ScrapRequestMessage {

  private String executionId;

  private String rootUri;

  private Configuration configuration;

  @Data
  @NoArgsConstructor
  @AllArgsConstructor
  public static class Configuration {
    private List<Step> steps;
  }

  @Data
  @NoArgsConstructor
  @AllArgsConstructor
  public static class Step {
    private String name;
    private String operation;
    private Map<String, String> configuration;
  }
}
