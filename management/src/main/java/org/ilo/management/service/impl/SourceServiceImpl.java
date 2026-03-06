package org.ilo.management.service.impl;

import cz.jirutka.rsql.parser.RSQLParser;
import cz.jirutka.rsql.parser.ast.Node;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.apache.commons.lang3.StringUtils;
import org.ilo.management.dto.SourceDto;
import org.ilo.management.mapper.SourceMapper;
import org.ilo.management.model.Source;
import org.ilo.management.repository.SourceRepository;
import org.ilo.management.service.ScrapJobSchedulerService;
import org.ilo.management.service.SourceService;
import org.ilo.management.specification.SourceSpecification;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional
public class SourceServiceImpl implements SourceService {

  private final SourceRepository sourceRepository;
  private final SourceMapper sourceMapper;
  private final ScrapJobSchedulerService scrapJobSchedulerService;

  @Transactional(readOnly = true)
  @Override
  public Page<SourceDto> search(String search, Pageable pageable) {
    Page<Source> entityPage;
    if (StringUtils.isBlank(search)) {
      entityPage = sourceRepository.findAll(pageable);
    } else {
      try {
        Node rootNode = new RSQLParser().parse(search);
        Specification<Source> specification = rootNode.accept(new SourceSpecification());
        entityPage = sourceRepository.findAll(specification, pageable);
      } catch (Exception e) {
        throw new IllegalArgumentException("Could not parse query: " + search, e);
      }
    }

    return entityPage.map(sourceMapper::toDto);
  }

  @Override
  public SourceDto createSource(SourceDto sourceDto) {
    Source source = sourceMapper.toEntity(sourceDto);
    Source savedSource = sourceRepository.save(source);
    scrapJobSchedulerService.scheduleTask(savedSource);
    return sourceMapper.toDto(savedSource);
  }

  @Transactional(readOnly = true)
  @Override
  public Optional<SourceDto> getSourceById(Long id) {
    return sourceRepository.findById(id).map(sourceMapper::toDto);
  }

  @Override
  public Optional<SourceDto> updateSource(Long id, SourceDto sourceDto) {
    return sourceRepository
        .findById(id)
        .map(
            existingSource -> {
              sourceMapper.updateEntityFromDto(sourceDto, existingSource);
              Source updatedSource = sourceRepository.save(existingSource);
              scrapJobSchedulerService.scheduleTask(updatedSource);
              return sourceMapper.toDto(updatedSource);
            });
  }

  @Override
  public boolean deleteSource(Long id) {
    if (sourceRepository.existsById(id)) {
      sourceRepository.deleteById(id);
      scrapJobSchedulerService.cancelTask(id);
      return true;
    }

    return false;
  }
}
