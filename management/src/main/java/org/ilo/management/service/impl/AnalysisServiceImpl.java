package org.ilo.management.service.impl;

import static java.util.Optional.ofNullable;
import static org.ilo.management.java.FunctionalUtils.quietly;

import cz.jirutka.rsql.parser.RSQLParser;
import cz.jirutka.rsql.parser.ast.Node;
import jakarta.persistence.EntityNotFoundException;
import java.time.LocalDate;
import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.ilo.management.data.amqp.ClassificationRequestMessage;
import org.ilo.management.dto.AnalysisDto;
import org.ilo.management.dto.AnalysisJobDto;
import org.ilo.management.dto.CfpAnalysisClassificationDto;
import org.ilo.management.mapper.AnalysisMapper;
import org.ilo.management.model.Analysis;
import org.ilo.management.model.Criterion;
import org.ilo.management.model.CriterionType;
import org.ilo.management.model.ScrapResult;
import org.ilo.management.repository.AnalysisJobRepository;
import org.ilo.management.repository.AnalysisRepository;
import org.ilo.management.repository.CriterionTypeRepository;
import org.ilo.management.service.AnalysisService;
import org.ilo.management.service.CfpAnalysisFeedbackService;
import org.ilo.management.service.ScrapResultService;
import org.ilo.management.specification.CfpAnalysisSpecificationBuilder;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

@Slf4j
@Service
@RequiredArgsConstructor
public class AnalysisServiceImpl implements AnalysisService {

  private final AnalysisRepository repository;
  private final CfpAnalysisFeedbackService analysisFeedbackService;
  private final CriterionTypeRepository criterionTypeRepository;
  private final AnalysisMapper mapper;
  private final AnalysisJobRepository analysisJobRepository;
  private final ScrapResultService scrapResultService;

  @Transactional(readOnly = true)
  @Override
  public Page<AnalysisDto> search(String search, Pageable pageable) {
    Page<Analysis> entityPage;
    if (search == null || search.isBlank()) {
      entityPage = repository.findAll(pageable);
    } else {
      try {
        Node rootNode = new RSQLParser().parse(search);
        CfpAnalysisSpecificationBuilder specBuilder = new CfpAnalysisSpecificationBuilder();
        Specification<Analysis> spec = specBuilder.createSpecification(rootNode);
        entityPage = repository.findAll(spec, pageable);
      } catch (Exception e) {
        log.error("Could not parse query: {}", search, e);
        throw new IllegalArgumentException("Could not parse query: " + search, e);
      }
    }

    return entityPage.map(mapper::toDto);
  }

  @Transactional
  @Override
  public void createAnalysis(CfpAnalysisClassificationDto dto) {
    Analysis analysis = new Analysis();
    ClassificationRequestMessage message = dto.getOriginalMessage();
    CfpAnalysisClassificationDto.ClassificationResult result = dto.getClassificationResult();

    analysis.setAnalysisJob(
        analysisJobRepository
            .findById(message.getExecutionId())
            .orElseGet(
                () -> {
                  log.warn("Analysis Job not found for id: {}", message.getExecutionId());
                  return null;
                }));
    analysis.setUrl(message.getUrl());
    analysis.setTimestamp(ZonedDateTime.now());

    analysis.setEligible(result.getEligible());
    analysis.setExclusionReason(result.getExclusionReason());
    analysis.setClassificationSummary(result.getClassificationSummary());
    analysis.setConfidenceScore(result.getConfidenceScore());

    ofNullable(result.getDeadline())
        .or(
            () ->
                ofNullable(result.getExtractedData())
                    .map(extracted -> extracted.get("deadline"))
                    .map(Object::toString))
        .map(quietly(LocalDate::parse))
        .ifPresent(analysis::setDeadline);

    ofNullable(result.getExtractedData())
        .map(extracted -> extracted.get("match"))
        .filter(matchContainer -> matchContainer instanceof Map<?, ?>)
        .map(matchContainer -> ((Map<?, ?>) matchContainer).get("value"))
        .map(Object::toString)
        .map(quietly(Double::parseDouble))
        .ifPresent(analysis::setMatch);

    analysis.setExtractedData(result.getExtractedData());

    List<Criterion> criteriaList = new ArrayList<>();
    if (result.getCriteria() != null) {
      for (Map.Entry<String, CfpAnalysisClassificationDto.Criterion> entry :
          result.getCriteria().entrySet()) {
        String criterionFieldName = entry.getKey();
        CfpAnalysisClassificationDto.Criterion criterionDto = entry.getValue();

        CriterionType criterionType =
            criterionTypeRepository
                .findByFieldName(criterionFieldName)
                .orElseGet(
                    () -> {
                      CriterionType newType = new CriterionType();
                      newType.setFieldName(criterionFieldName);
                      return criterionTypeRepository.save(newType);
                    });

        Criterion criterion = new Criterion();
        criterion.setStatus(String.valueOf(criterionDto.getStatus()));
        criterion.setEvidence(criterionDto.getEvidence());
        criterion.setType(criterionType);

        criterion.setAnalysis(analysis);
        criteriaList.add(criterion);
      }
    }
    analysis.setCriteria(criteriaList);

    repository.save(analysis);
  }

  @Transactional
  @Override
  public Optional<AnalysisDto> update(Long id, AnalysisDto analysisDto) {
    return repository
        .findById(id)
        .map(
            existingAnalysis -> {
              Analysis analysis = mapper.toEntity(analysisDto);
              Analysis updatedAnalysis = repository.save(analysis);
              return mapper.toDto(updatedAnalysis);
            });
  }

  @Transactional
  @Override
  public boolean delete(Long id) {
    if (repository.existsById(id)) {
      analysisFeedbackService.deleteForAnalysis(id);
      repository.deleteById(id);
      return true;
    }

    return false;
  }

  @Override
  @Transactional
  public AnalysisJobDto reclassify(Long id, List<MultipartFile> addAttachments) {
    Analysis analysis =
        repository
            .findById(id)
            .orElseThrow(() -> new EntityNotFoundException("Analysis not found for ID: " + id));

    if (analysis.getAnalysisJob() == null || analysis.getAnalysisJob().getScrapResult() == null) {
      throw new EntityNotFoundException("ScrapResult for Analysis ID: " + id + " not found.");
    }

    ScrapResult scrapResult = analysis.getAnalysisJob().getScrapResult();
    if (addAttachments != null && !addAttachments.isEmpty()) {
      scrapResultService.addAttachments(scrapResult.getId(), addAttachments);
    }
    delete(id);

    return scrapResultService.triggerReclassification(scrapResult.getId());
  }
}
