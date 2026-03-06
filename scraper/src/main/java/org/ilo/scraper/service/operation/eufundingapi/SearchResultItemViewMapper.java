package org.ilo.scraper.service.operation.eufundingapi;

import static java.util.Optional.empty;
import static java.util.Optional.ofNullable;

import com.vladsch.flexmark.html2md.converter.FlexmarkHtmlConverter;
import java.util.List;
import java.util.Optional;
import java.util.function.Function;
import org.ilo.scraper.service.operation.eufundingapi.SearchResultResponse.Metadata;
import org.springframework.stereotype.Component;

@Component
public class SearchResultItemViewMapper {
  private final FlexmarkHtmlConverter htmlToMarkdownConverter;

  public SearchResultItemViewMapper() {
    this.htmlToMarkdownConverter = FlexmarkHtmlConverter.builder().build();
  }

  public SearchResultItemView toView(SearchResultResponse.Item item) {
    SearchResultItemView itemView = new SearchResultItemView();
    itemView.setUrl(getItemUri(item));
    itemView.setStartDate(fallback(item, Metadata::getStartDate, unknown()));
    itemView.setDeadlineModel(fallback(item, Metadata::getDeadlineModel, unknown()));
    itemView.setDeadlineDate(fallback(item, Metadata::getDeadlineDate, unknown()));
    itemView.setIdentifier(fallback(item, Metadata::getIdentifier, literal(item.getReference())));
    itemView.setTitle(
        fallback(item, Metadata::getCallTitle, Metadata::getTitle, literal(item.getTitle())));
    itemView.setSummary(item.getSummary());
    itemView.setDuration(fallback(item, Metadata::getDuration, unknown()));
    itemView.setBudget(fallback(item, Metadata::getBudget, unknown()));
    itemView.setCurrency(fallback(item, Metadata::getCurrency, literal("EUR")));
    itemView.setBudgetOverview(fallback(item, Metadata::getBudgetOverview));
    itemView.setDescription(
        combineHtml(
            item,
            literal(item.getContent()),
            Metadata::getDescriptionByte,
            Metadata::getDescription,
            Metadata::getTopicConditions,
            Metadata::getSupportInfo,
            Metadata::getFurtherInformation,
            Metadata::getBeneficiaryAdministration));
    // TODO: Extract JSON
    //   Metadata::getLatestInfos
    return itemView;
  }

  @SafeVarargs
  private String fallback(
      SearchResultResponse.Item item, Function<Metadata, List<String>>... propGetters) {
    for (Function<Metadata, List<String>> propGetter : propGetters) {
      Optional<String> value = md(item).map(propGetter).flatMap(this::last);

      if (value.isPresent()) {
        return value.get();
      }
    }

    return null;
  }

  @SafeVarargs
  private String combineHtml(
      SearchResultResponse.Item item, Function<Metadata, List<String>>... propGetters) {
    StringBuilder combinedPropValue = new StringBuilder();

    for (Function<Metadata, List<String>> propGetter : propGetters) {
      Optional<String> value = md(item).map(propGetter).flatMap(this::last);
      value
          .map(htmlToMarkdownConverter::convert)
          .ifPresent(s -> combinedPropValue.append(s).append(System.lineSeparator()));
    }

    return combinedPropValue.toString();
  }

  private String getItemUri(SearchResultResponse.Item item) {
    if (item.getMetadata().getType().stream().findFirst().map("8"::equals).orElse(false)) {
      return item.getMetadata().getCallccm2Id().stream()
          .findFirst()
          .map(
              id ->
                  "https://ec.europa.eu/info/funding-tenders/opportunities/portal/screen/opportunities/competitive-calls-cs/"
                      + id)
          .orElseGet(item::getUrl);
    } else if (item.getMetadata().getType().stream().findFirst().map("2"::equals).orElse(false)) {
      return "https://ec.europa.eu/info/funding-tenders/opportunities/portal/screen/opportunities/prospect-details/"
          + item.getReference();
    } else {
      return item.getUrl();
    }
  }

  private Optional<Metadata> md(SearchResultResponse.Item item) {
    return ofNullable(item.getMetadata());
  }

  private <T> Optional<T> last(List<T> list) {
    return list.isEmpty() ? empty() : ofNullable(list.getLast());
  }

  private StaticProp literal(String value) {
    return new StaticProp(value);
  }

  private StaticProp unknown() {
    return new StaticProp("unknown");
  }

  private record StaticProp(String staticValue) implements Function<Metadata, List<String>> {
    @Override
    public List<String> apply(Metadata metadata) {
      return List.of(staticValue);
    }
  }
}
