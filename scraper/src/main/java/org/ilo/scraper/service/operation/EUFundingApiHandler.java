package org.ilo.scraper.service.operation;

import static java.util.Optional.empty;
import static java.util.Optional.ofNullable;
import static org.springframework.util.StringUtils.hasText;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.ObjectReader;
import com.samskivert.mustache.Mustache;
import com.samskivert.mustache.Template;
import java.net.URI;
import java.util.*;
import java.util.function.Function;
import lombok.extern.slf4j.Slf4j;
import org.ilo.scraper.config.EUFundingApiHandlerConfig;
import org.ilo.scraper.data.amqp.Operation;
import org.ilo.scraper.data.operation.Attachment;
import org.ilo.scraper.data.operation.Content;
import org.ilo.scraper.data.operation.ContentUri;
import org.ilo.scraper.data.operation.result.IntermediateResult;
import org.ilo.scraper.service.operation.eufundingapi.PublicationDocument;
import org.ilo.scraper.service.operation.eufundingapi.SearchResultItemView;
import org.ilo.scraper.service.operation.eufundingapi.SearchResultItemViewMapper;
import org.ilo.scraper.service.operation.eufundingapi.SearchResultResponse;
import org.ilo.scraper.service.operation.eufundingapi.SearchResultResponse.Metadata;
import org.ilo.scraper.service.web.attachment.AttachmentDownloader;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClient;
import org.springframework.web.util.UriComponentsBuilder;
import reactor.core.publisher.Flux;

/** Designed for EU Funding & Tenders. */
@Slf4j
@Service
@EnableConfigurationProperties(EUFundingApiHandlerConfig.class)
public class EUFundingApiHandler implements IntermediateOperationHandler {
  private static final int MAX_PAGES = 100;

  private final EUFundingApiHandlerConfig handlerConfig;
  private final Template itemViewMustache;
  private final SearchResultItemViewMapper itemViewMapper;
  private final AttachmentDownloader attachmentDownloader;

  private final RestClient restClient;
  private final ObjectReader formDataFieldReader;
  private final ObjectReader publicationDocumentsReader;

  public EUFundingApiHandler(
      EUFundingApiHandlerConfig handlerConfig,
      Mustache.TemplateLoader mustacheTemplateLoader,
      SearchResultItemViewMapper itemViewMapper,
      AttachmentDownloader attachmentDownloader) {
    this.handlerConfig = handlerConfig;
    this.itemViewMustache =
        Mustache.compiler()
            .emptyStringIsFalse(true)
            .defaultValue("")
            .withLoader(mustacheTemplateLoader)
            .loadTemplate("eu-funding-item-view");
    this.itemViewMapper = itemViewMapper;
    this.attachmentDownloader = attachmentDownloader;

    this.restClient = RestClient.create();

    ObjectMapper objectMapper = new ObjectMapper();
    this.formDataFieldReader =
        objectMapper.readerFor(EUFundingApiHandlerConfig.FORM_DATA_FIELDS_TYPE);
    this.publicationDocumentsReader =
        objectMapper.readerFor(new TypeReference<List<PublicationDocument>>() {});
  }

  @Override
  public Operation getOperation() {
    return Operation.EU_FUNDING_API;
  }

  @Override
  public Flux<IntermediateResult> execute(
      Map<String, String> configuration, IntermediateResult intermediateResult) {
    log.warn("EU Funding & Tenders Handler overrides configured root URI.");

    return fetchAllPages(configuration, URI.create(handlerConfig.getRootUrl()));
  }

  private Flux<IntermediateResult> fetchAllPages(Map<String, String> configuration, URI rootUri) {
    return Flux.create(
        emitter -> {
          try {
            for (int pageNumber = 1; pageNumber <= MAX_PAGES; ++pageNumber) {
              URI pageUri =
                  UriComponentsBuilder.fromUri(rootUri)
                      .queryParam(handlerConfig.getPaginationQueryParam(), pageNumber)
                      .build()
                      .toUri();
              MultiValueMap<String, Object> body = getFormDataParts(configuration);

              log.info("Reading EU Funding & Tenders page {}, URL: {}", pageNumber, pageUri);

              SearchResultResponse response =
                  restClient
                      .post()
                      .uri(pageUri)
                      .contentType(MediaType.MULTIPART_FORM_DATA)
                      .body(body)
                      .retrieve()
                      .body(SearchResultResponse.class);

              if (response == null) {
                throw new IllegalStateException("Empty response for rootUri: " + rootUri);
              }

              if (response.getResults().isEmpty()) {
                log.info("Finished reading EU Funding & Tenders after {} pages.", pageNumber);
                break;
              }

              log.info(
                  "Reading page: {}, size: {}, of items: {}",
                  response.getPageNumber(),
                  response.getPageSize(),
                  response.getTotalResults());

              for (SearchResultResponse.Item resultItem : response.getResults()) {
                String itemIdentifier =
                    resultItem.getMetadata().getIdentifier().stream().findFirst().orElse(null);
                SearchResultItemView itemView = itemViewMapper.toView(resultItem);
                String contentMarkdown = itemViewMustache.execute(itemView);

                List<String> htmlsSnippets = new ArrayList<>();
                add(resultItem, Metadata::getTopicConditions, htmlsSnippets);
                add(resultItem, Metadata::getDescriptionByte, htmlsSnippets);
                add(resultItem, Metadata::getSupportInfo, htmlsSnippets);
                add(resultItem, Metadata::getDescription, htmlsSnippets);
                add(resultItem, Metadata::getFurtherInformation, htmlsSnippets);
                add(resultItem, Metadata::getBeneficiaryAdministration, htmlsSnippets);
                List<Attachment> attachments =
                    attachmentDownloader.downloadAttachmentsHtml(htmlsSnippets);

                Optional<String> publicationDocumentsJson =
                    md(resultItem).map(Metadata::getPublicationDocuments).flatMap(this::last);
                if (publicationDocumentsJson.isPresent()) {
                  List<PublicationDocument> publicationDocuments =
                      publicationDocumentsReader.readValue(publicationDocumentsJson.get());
                  attachments.addAll(
                      attachmentDownloader.downloadAttachmentsUris(
                          publicationDocuments.stream()
                              .map(
                                  doc ->
                                      new ContentUri(doc.getNameDoc(), URI.create(doc.getDocUrl())))
                              .toList()));
                }

                emitter.next(
                    new IntermediateResult(
                        new Content(
                            new ContentUri(URI.create(itemView.getUrl()), itemIdentifier),
                            contentMarkdown),
                        List.of(),
                        attachments));
              }
            }

            emitter.complete();
          } catch (Exception e) {
            emitter.error(e);
          }
        });
  }

  private MultiValueMap<String, Object> getFormDataParts(Map<String, String> configuration) {
    String formDataJson = handlerConfig.getSearchQueryFormData();

    if (!hasText(formDataJson)) {
      log.error("RestApiIteratorHandler requires formData config param.");
      throw new IllegalStateException("<formData> required to read parts from.");
    }

    try {
      List<EUFundingApiHandlerConfig.FormDataPartConfig> formDataPartConfigs =
          formDataFieldReader.readValue(formDataJson);
      MultiValueMap<String, Object> formDataParts = new LinkedMultiValueMap<>();

      for (EUFundingApiHandlerConfig.FormDataPartConfig partConfig : formDataPartConfigs) {
        formDataParts.add(partConfig.name(), newHttpEntityPart(partConfig));
      }

      return formDataParts;
    } catch (JsonProcessingException e) {
      log.error("RestApiIteratorHandler formData must be valid JSON of proper schema.");
      throw new IllegalArgumentException(e);
    }
  }

  private HttpEntity<String> newHttpEntityPart(
      EUFundingApiHandlerConfig.FormDataPartConfig config) {
    HttpHeaders headers = new HttpHeaders();
    headers.setContentType(MediaType.parseMediaType(config.contentType()));
    return new HttpEntity<>(config.value(), headers);
  }

  private void add(
      SearchResultResponse.Item item,
      Function<Metadata, List<String>> propGetter,
      Collection<String> list) {
    md(item).map(propGetter).flatMap(this::last).ifPresent(list::add);
  }

  private Optional<Metadata> md(SearchResultResponse.Item item) {
    return ofNullable(item.getMetadata());
  }

  private <T> Optional<T> last(List<T> list) {
    return list.isEmpty() ? empty() : ofNullable(list.getLast());
  }
}
