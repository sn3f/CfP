package org.ilo.management.service.impl;

import static org.ilo.management.model.CfpAnalysisFeedbackItemType.*;

import cz.jirutka.rsql.parser.RSQLParser;
import cz.jirutka.rsql.parser.ast.Node;
import jakarta.persistence.EntityNotFoundException;
import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.ilo.management.config.CurrentUser;
import org.ilo.management.config.security.AppRoles;
import org.ilo.management.dto.AnalysisFeedbackDto;
import org.ilo.management.mapper.CfpAnalysisFeedbackMapper;
import org.ilo.management.model.*;
import org.ilo.management.repository.AnalysisFeedbackRepository;
import org.ilo.management.repository.AnalysisRepository;
import org.ilo.management.repository.UserRepository;
import org.ilo.management.service.CfpAnalysisFeedbackService;
import org.ilo.management.specification.CfpAnalysisFeedbackSpecification;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional
public class CfpAnalysisFeedbackServiceImpl implements CfpAnalysisFeedbackService {

  private final UserRepository userRepository;
  private final AnalysisRepository analysisRepository;
  private final AnalysisFeedbackRepository repository;
  private final CfpAnalysisFeedbackMapper mapper;
  private final CurrentUser currentUser;

  @Transactional(readOnly = true)
  @Override
  public Page<AnalysisFeedbackDto> search(String search, Pageable pageable) {
    Page<AnalysisFeedback> entityPage;
    if (search == null || search.isBlank()) {
      entityPage = repository.findAll(pageable);
    } else {
      try {
        Node rootNode = new RSQLParser().parse(search);
        Specification<AnalysisFeedback> spec =
            rootNode.accept(new CfpAnalysisFeedbackSpecification());
        entityPage = repository.findAll(spec, pageable);
      } catch (Exception e) {
        throw new IllegalArgumentException("Could not parse query: " + search, e);
      }
    }
    return entityPage.map(mapper::toDto);
  }

  @Transactional(readOnly = true)
  @Override
  public AnalysisFeedbackDto findById(Long id) {
    return repository
        .findById(id)
        .map(mapper::toDto)
        .orElseThrow(
            () -> new EntityNotFoundException("CfpAnalysisFeedback not found with id: " + id));
  }

  @Override
  public AnalysisFeedbackDto update(Long id, AnalysisFeedbackDto feedbackDto) {
    validateOwner(id);

    AnalysisFeedback existingFeedback =
        repository
            .findById(id)
            .orElseThrow(
                () -> new EntityNotFoundException("CfpAnalysisFeedback not found with id: " + id));

    feedbackDto.setUpdatedAt(ZonedDateTime.now());

    mapper.updateEntityFromDto(feedbackDto, existingFeedback);
    AnalysisFeedback updatedFeedback = repository.save(existingFeedback);
    return mapper.toDto(updatedFeedback);
  }

  @Override
  public void delete(Long id) {
    validateOwner(id);
    repository.deleteById(id);
  }

  @Override
  public AnalysisFeedbackDto getOrCreateForAnalysisAndCurrentUser(Long analysisId) {
    Analysis analysis =
        analysisRepository
            .findById(analysisId)
            .orElseThrow(
                () -> new EntityNotFoundException("CfpAnalysis not found with id: " + analysisId));
    User owner =
        userRepository
            .findById(currentUser.getSub())
            .orElseThrow(
                () ->
                    new IllegalStateException(
                        "CfpAnalysisFeedbackService.createForAnalysis() called with unknown user!"));

    Optional<AnalysisFeedback> existing =
        repository.findByAnalysisIdAndOwnerSub(analysisId, currentUser.getSub());

    if (existing.isPresent()) {
      return mapper.toDto(existing.get());
    } else {
      AnalysisFeedback feedback = new AnalysisFeedback();
      feedback.setAnalysis(analysis);
      feedback.setOwner(owner);
      feedback.setCreatedAt(ZonedDateTime.now());
      feedback.setUpdatedAt(ZonedDateTime.now());

      List<CfpAnalysisFeedbackItem> items = new ArrayList<>();
      feedback.setItems(items);

      items.add(new CfpAnalysisFeedbackItem(feedback, "url", CORE, "url", null, analysis.getUrl()));
      items.add(
          new CfpAnalysisFeedbackItem(
              feedback,
              "eligible",
              CORE,
              "eligible",
              null,
              String.valueOf(analysis.getEligible())));
      items.add(
          new CfpAnalysisFeedbackItem(
              feedback,
              "exclusionReason",
              CORE,
              "exclusionReason",
              null,
              analysis.getExclusionReason()));
      items.add(
          new CfpAnalysisFeedbackItem(
              feedback,
              "classificationSummary",
              CORE,
              "classificationSummary",
              null,
              analysis.getClassificationSummary()));

      analysis
          .getCriteria()
          .forEach(
              criterion -> {
                items.add(
                    new CfpAnalysisFeedbackItem(
                        feedback,
                        "criterion_" + criterion.getId(),
                        CRITERION,
                        criterion.getType().getFieldName(),
                        criterion.getEvidence(),
                        criterion.getStatus()));
              });

      analysis
          .getExtractedData()
          .forEach(
              (key, value) -> {
                items.add(
                    new CfpAnalysisFeedbackItem(
                        feedback, key, EXTRACTED_DATA, key, null, String.valueOf(value)));
              });

      return mapper.toDto(repository.save(feedback));
    }
  }

  @Transactional(readOnly = true)
  @Override
  public AnalysisFeedbackDto findByIdForAnalysis(Long analysisId, Long feedbackId) {
    return repository
        .findByIdAndAnalysisId(feedbackId, analysisId)
        .map(mapper::toDto)
        .orElseThrow(
            () ->
                new EntityNotFoundException(
                    "CfpAnalysisFeedback not found with id: "
                        + feedbackId
                        + " for analysis id: "
                        + analysisId));
  }

  @Override
  public AnalysisFeedbackDto updateForAnalysis(
      Long analysisId, Long feedbackId, AnalysisFeedbackDto feedbackDto) {
    validateOwner(feedbackId);

    AnalysisFeedback existingFeedback =
        repository
            .findByIdAndAnalysisId(feedbackId, analysisId)
            .orElseThrow(
                () ->
                    new EntityNotFoundException(
                        "CfpAnalysisFeedback not found with id: "
                            + feedbackId
                            + " for analysis id: "
                            + analysisId));

    mapper.updateEntityFromDto(feedbackDto, existingFeedback);
    AnalysisFeedback updatedFeedback = repository.save(existingFeedback);
    return mapper.toDto(updatedFeedback);
  }

  @Override
  public void deleteForAnalysis(Long analysisId) {
    repository.deleteByAnalysisId(analysisId);
  }

  @Override
  public void deleteForAnalysis(Long analysisId, Long feedbackId) {
    validateOwner(feedbackId);
    repository.deleteById(feedbackId);
  }

  private void validateOwner(Long feedbackId) {
    if (currentUser.hasRole(AppRoles.SYSTEM_ADMIN)) {
      if (!repository.existsById(feedbackId)) {
        throw new EntityNotFoundException("The Feedback id:" + feedbackId + " does not exist.");
      }
    } else {
      if (!repository.existsByIdAndOwnerSub(feedbackId, currentUser.getSub())) {
        throw new EntityNotFoundException(
            "Current User "
                + currentUser.getSub()
                + " is not an owner of the Feedback id:"
                + feedbackId
                + " or feedback does not exist.");
      }
    }
  }
}
