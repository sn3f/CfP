package org.ilo.management.service.impl;

import com.fasterxml.jackson.databind.ObjectMapper;
import cz.jirutka.rsql.parser.RSQLParser;
import cz.jirutka.rsql.parser.ast.Node;
import jakarta.persistence.EntityNotFoundException;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import org.ilo.management.data.amqp.ScrapRequestMessage;
import org.ilo.management.dto.ScrapJobDto;
import org.ilo.management.mapper.ScrapJobMapper;
import org.ilo.management.model.ScrapJob;
import org.ilo.management.model.Source;
import org.ilo.management.repository.ScrapJobRepository;
import org.ilo.management.repository.SourceRepository;
import org.ilo.management.service.ScrapJobService;
import org.ilo.management.specification.ScrapJobSpecification;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class ScrapJobServiceImpl implements ScrapJobService {
  private final ScrapJobRepository scrapJobRepository;
  private final ScrapJobMapper scrapJobMapper;
  private final SourceRepository sourceRepository;
  private final ObjectMapper objectMapper;

  @Override
  @Transactional(readOnly = true)
  public ScrapJobDto findById(String id) {
    return scrapJobRepository
        .findById(id)
        .map(scrapJobMapper::toDto)
        .orElseThrow(() -> new EntityNotFoundException("Scrap Job not found with id: " + id));
  }

  @Override
  @Transactional(readOnly = true)
  public Page<ScrapJobDto> search(String search, Pageable pageable) {
    Page<ScrapJob> entityPage;
    if (StringUtils.isBlank(search)) {
      entityPage = scrapJobRepository.findAll(pageable);
    } else {
      try {
        Node rootNode = new RSQLParser().parse(search);
        Specification<ScrapJob> specification = rootNode.accept(new ScrapJobSpecification());
        entityPage = scrapJobRepository.findAll(specification, pageable);
      } catch (Exception e) {
        throw new IllegalArgumentException("Could not parse query: " + search, e);
      }
    }

    return entityPage.map(scrapJobMapper::toDto);
  }

  @Override
  @Transactional
  public ScrapRequestMessage createScrapRequest(Long sourceId) {
    Source source =
        sourceRepository
            .findById(sourceId)
            .orElseThrow(
                () -> new IllegalArgumentException("Source with id " + sourceId + " not found"));

    // TODO: Introduce better validation (Each operation has some requirements)
    Map<String, Object> config = source.getConfig();
    if (config == null || !config.containsKey("steps")) {
      throw new IllegalArgumentException("Source config must contain 'steps' array.");
    }

    ScrapJob job = new ScrapJob();
    job.setSource(source);
    job.setConfig(config);
    scrapJobRepository.saveAndFlush(job);

    log.info("Creating ScrapJon for source [{}]({})", source.getName(), source.getWebsiteUrl());

    // TODO: Remove the "cast type via JSON serialization"-thing
    return new ScrapRequestMessage(
        job.getId(),
        source.getWebsiteUrl(),
        objectMapper.convertValue(config, ScrapRequestMessage.Configuration.class));
  }
}
