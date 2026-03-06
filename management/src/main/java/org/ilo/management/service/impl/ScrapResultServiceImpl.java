package org.ilo.management.service.impl;

import cz.jirutka.rsql.parser.RSQLParser;
import cz.jirutka.rsql.parser.ast.Node;
import jakarta.persistence.EntityNotFoundException;
import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.apache.commons.lang3.StringUtils;
import org.ilo.management.data.amqp.ScrapResultMessage;
import org.ilo.management.dto.AnalysisJobDto;
import org.ilo.management.dto.ScrapResultDto;
import org.ilo.management.mapper.ScrapAttachmentMapper;
import org.ilo.management.mapper.ScrapResultMapper;
import org.ilo.management.model.*;
import org.ilo.management.repository.ScrapResultRepository;
import org.ilo.management.service.ClassificationRequestProducer;
import org.ilo.management.service.ScrapResultService;
import org.ilo.management.service.VisitedUrlService;
import org.ilo.management.service.ai.ContextService;
import org.ilo.management.specification.ScrapResultSpecificationBuilder;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

@Service
@RequiredArgsConstructor
public class ScrapResultServiceImpl implements ScrapResultService {

  private final ScrapResultRepository repository;
  private final ScrapResultMapper scrapResultMapper;
  private final ScrapAttachmentMapper scrapAttachmentMapper;
  private final ClassificationRequestProducer classificationRequestProducer;
  private final ContextService contextService;
  private final VisitedUrlService visitedUrlService;

  @Transactional(readOnly = true)
  @Override
  public Page<ScrapResultDto> search(String search, Pageable pageable) {
    Page<ScrapResult> entityPage;
    if (StringUtils.isBlank(search)) {
      entityPage = repository.findAll(pageable);
    } else {
      try {
        Node rootNode = new RSQLParser().parse(search);
        ScrapResultSpecificationBuilder specBuilder = new ScrapResultSpecificationBuilder();
        Specification<ScrapResult> spec = specBuilder.createSpecification(rootNode);
        entityPage = repository.findAll(spec, pageable);
      } catch (Exception e) {
        throw new IllegalArgumentException("Could not parse query: " + search, e);
      }
    }

    return entityPage.map(scrapResultMapper::toDto);
  }

  @Transactional(readOnly = true)
  @Override
  public ScrapResultDto findById(Long id) {
    return repository
        .findById(id)
        .map(scrapResultMapper::toDto)
        .orElseThrow(() -> new EntityNotFoundException("Scrap result not found with id: " + id));
  }

  @Transactional
  @Override
  public boolean deleteScrapResult(Long id) {
    Optional<ScrapResult> scrapResult = repository.findById(id);
    if (scrapResult.isPresent()) {
      visitedUrlService.deleteUrl(scrapResult.get().getUrl(), scrapResult.get().getSubId());
      repository.deleteById(id);
      return true;
    }

    return false;
  }

  @Transactional
  @Override
  public AnalysisJobDto triggerClassification(Long scrapResultId) {
    ScrapResult scrapResult =
        repository
            .findById(scrapResultId)
            .orElseThrow(
                () ->
                    new EntityNotFoundException("ScrapResult not found for ID: " + scrapResultId));

    return internalTriggerClassification(scrapResult, ScrapResultStatus.CLASSIFIED_MANUALLY);
  }

  private AnalysisJobDto internalTriggerClassification(
      ScrapResult scrapResult, ScrapResultStatus status) {

    scrapResult.setStatus(status);
    repository.saveAndFlush(scrapResult);
    return classificationRequestProducer.triggerClassification(scrapResult.getId());
  }

  @Transactional
  @Override
  public AnalysisJobDto triggerReclassification(Long scrapResultId) {
    ScrapResult scrapResult =
        repository
            .findById(scrapResultId)
            .orElseThrow(
                () ->
                    new EntityNotFoundException("ScrapResult not found for ID: " + scrapResultId));

    return internalTriggerClassification(scrapResult, ScrapResultStatus.RECLASSIFIED);
  }

  @Transactional
  @Override
  public void triggerClassificationAutomatic(Long id) {
    Optional<ScrapResult> scrapResult = repository.findById(id);

    if (scrapResult
        .map(ScrapResult::getScrapJob)
        .map(ScrapJob::getSource)
        .map(source -> source.getClassification() == ClassificationStatus.AUTO)
        .orElse(Boolean.FALSE)) {
      scrapResult.get().setStatus(ScrapResultStatus.CLASSIFIED_AUTO);
      repository.saveAndFlush(scrapResult.get());
      classificationRequestProducer.triggerClassification(scrapResult.get().getId());
    }
  }

  @Transactional
  @Override
  public boolean reject(Long id) {
    Optional<ScrapResult> scrapResult = repository.findById(id);

    if (scrapResult.isPresent()) {
      scrapResult.get().setStatus(ScrapResultStatus.REJECTED);
      repository.save(scrapResult.get());
      return true;
    }

    return false;
  }

  @Transactional
  @Override
  public ScrapResultDto acceptScrapResultMessage(ScrapResultMessage message) {
    ScrapResult scrapResult = scrapResultMapper.toEntity(message);
    return scrapResultMapper.toDto(repository.save(scrapResult));
  }

  @Transactional
  @Override
  public void addAttachments(Long id, List<MultipartFile> attachments) {
    ScrapResult scrapResult =
        repository
            .findById(id)
            .orElseThrow(() -> new EntityNotFoundException("ScrapResult not found for ID: " + id));

    addAttachments(scrapResult, attachments);
    contextService.rebuildContext(scrapResult);
    scrapResultMapper.toDto(repository.saveAndFlush(scrapResult));
  }

  private void addAttachments(ScrapResult scrapResult, List<MultipartFile> attachments) {
    if (attachments == null) {
      return;
    }

    for (MultipartFile attachment : attachments) {
      if (attachment.isEmpty()) {
        continue;
      }

      ScrapAttachment scrapAttachment = scrapAttachmentMapper.toEntity(attachment);
      scrapAttachment.setScrapResult(scrapResult);
      scrapResult.getAttachments().add(scrapAttachment);
    }
  }

  @Transactional
  @Override
  public AnalysisJobDto classify(String url, String content, List<MultipartFile> attachments) {
    ScrapResult scrapResult = new ScrapResult();
    scrapResult.setStatus(ScrapResultStatus.NEW);
    scrapResult.setTimestamp(ZonedDateTime.now());
    scrapResult.setAttachments(new ArrayList<>());
    scrapResult.setUrl(url);
    scrapResult.setContent(content);

    addAttachments(scrapResult, attachments);

    contextService.rebuildContext(scrapResult);
    scrapResult = repository.saveAndFlush(scrapResult);

    return internalTriggerClassification(scrapResult, ScrapResultStatus.CLASSIFIED_MANUALLY);
  }
}
