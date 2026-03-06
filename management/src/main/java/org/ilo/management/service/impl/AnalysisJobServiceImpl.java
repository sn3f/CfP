package org.ilo.management.service.impl;

import com.fasterxml.jackson.databind.ObjectMapper;
import cz.jirutka.rsql.parser.RSQLParser;
import cz.jirutka.rsql.parser.ast.Node;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import org.ilo.management.dto.AnalysisJobDto;
import org.ilo.management.mapper.AnalysisJobMapper;
import org.ilo.management.model.AnalysisJob;
import org.ilo.management.model.ScrapResult;
import org.ilo.management.repository.AnalysisJobRepository;
import org.ilo.management.repository.ScrapResultRepository;
import org.ilo.management.service.AnalysisJobService;
import org.ilo.management.specification.AnalysisJobSpecification;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class AnalysisJobServiceImpl implements AnalysisJobService {
  private final AnalysisJobRepository analysisJobRepository;
  private final AnalysisJobMapper analysisJobMapper;
  private final ScrapResultRepository scrapResultRepository;
  private final ObjectMapper objectMapper;

  @Override
  @Transactional(readOnly = true)
  public AnalysisJobDto findById(String id) {
    return analysisJobRepository
        .findById(id)
        .map(analysisJobMapper::toDto)
        .orElseThrow(() -> new EntityNotFoundException("Analysis Job not found with id: " + id));
  }

  @Override
  @Transactional(readOnly = true)
  public Page<AnalysisJobDto> search(String search, Pageable pageable) {
    Page<AnalysisJob> entityPage;
    if (StringUtils.isBlank(search)) {
      entityPage = analysisJobRepository.findAll(pageable);
    } else {
      try {
        Node rootNode = new RSQLParser().parse(search);
        Specification<AnalysisJob> specification = rootNode.accept(new AnalysisJobSpecification());
        entityPage = analysisJobRepository.findAll(specification, pageable);
      } catch (Exception e) {
        log.error("Could not parse query: {}", search, e);
        throw new IllegalArgumentException("Could not parse query: " + search, e);
      }
    }

    return entityPage.map(analysisJobMapper::toDto);
  }

  @Override
  @Transactional
  public AnalysisJobDto createAnalysisJob(Long scrapResultId) {
    ScrapResult scrapResult =
        scrapResultRepository
            .findById(scrapResultId)
            .orElseThrow(
                () ->
                    new IllegalArgumentException(
                        "Scrap Result with id " + scrapResultId + " not found"));

    AnalysisJob analysisJob = new AnalysisJob();
    analysisJob.setScrapResult(scrapResult);
    return analysisJobMapper.toDto(analysisJobRepository.saveAndFlush(analysisJob));
  }
}
