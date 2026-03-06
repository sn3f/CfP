package org.ilo.scraper.service.operation.eufundingapi;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class SearchResultItemView {
  private String url;
  private String startDate;
  private String deadlineModel;
  private String deadlineDate;
  private String identifier; // metadata.identifier
  private String title; // title or metadata.title or metadata.callTitle
  private String summary;
  private String duration;
  private String budget;
  private String currency;
  private String budgetOverview;
  private String description; // content + metadata.description + metadata.descriptionByte +
  // metadata.furtherInformation + metadata.latestInfos
}
