package org.ilo.scraper.service.operation.eufundingapi;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.util.List;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@JsonIgnoreProperties(ignoreUnknown = true)
public class SearchResultResponse {
  private Integer totalResults;
  private Integer pageNumber;
  private Integer pageSize;
  private List<Item> results;

  @Getter
  @Setter
  @JsonIgnoreProperties(ignoreUnknown = true)
  public static class Item {
    private String url;
    private String reference;
    private String title;
    private String summary;
    private String content;
    private Metadata metadata;
  }

  @Getter
  @Setter
  @JsonIgnoreProperties(ignoreUnknown = true)
  public static class Metadata {
    private List<String> type;
    private List<String> title;
    private List<String> callTitle;
    private List<String> callccm2Id;
    private List<String> description;
    private List<String> descriptionByte;
    private List<String> duration;
    private List<String> budget;
    private List<String> currency;
    private List<String> budgetOverview;
    private List<String> identifier;
    private List<String> furtherInformation;
    private List<String> startDate;
    private List<String> deadlineModel;
    private List<String> deadlineDate;
    private List<String> latestInfos;
    private List<String> topicConditions;
    private List<String> publicationDocuments;
    private List<String> supportInfo;
    private List<String> beneficiaryAdministration;
    private List<String> links;
  }
}
