package org.ilo.scraper.service.operation.eufundingapi;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@JsonIgnoreProperties(ignoreUnknown = true)
public class PublicationDocument {
  private String nameDoc;
  private String docUrl;
}
