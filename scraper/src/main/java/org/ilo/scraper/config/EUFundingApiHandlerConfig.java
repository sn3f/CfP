package org.ilo.scraper.config;

import com.fasterxml.jackson.core.type.TypeReference;
import java.util.List;
import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;

@Getter
@Setter
@ConfigurationProperties(prefix = "eufundingapi")
public class EUFundingApiHandlerConfig {
  private String rootUrl =
      "https://api.tech.ec.europa.eu/search-api/prod/rest/search?apiKey=SEDIA&text=***&pageSize=50";
  private String paginationQueryParam = "pageNumber";
  private String searchQueryFormData =
      "[{\"name\":\"query\",\"contentType\":\"application/json\",\"value\":\"{\\\"bool\\\":{\\\"must\\\":[{\\\"terms\\\":{\\\"type\\\":[\\\"1\\\",\\\"2\\\",\\\"8\\\"]}},{\\\"terms\\\":{\\\"status\\\":[\\\"31094501\\\",\\\"31094502\\\"]}}]}}\"},{\"name\":\"languages\",\"contentType\":\"application/json\",\"value\":\"[\\\"en\\\"]\"}]";

  public static final TypeReference<List<FormDataPartConfig>> FORM_DATA_FIELDS_TYPE =
      new TypeReference<>() {};

  public record FormDataPartConfig(String name, String contentType, String value) {}
}
