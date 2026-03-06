package org.ilo.management.mapper;

import static java.util.Optional.ofNullable;

import java.util.Collections;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.ilo.management.dto.AnalysisDto;
import org.ilo.management.dto.AnalysisJobDto;
import org.ilo.management.dto.CriterionDto;
import org.ilo.management.model.Analysis;
import org.ilo.management.model.Criterion;
import org.ilo.management.repository.AnalysisJobRepository;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class AnalysisMapper {
  private final CriterionTypeMapper criterionTypeMapper;
  private final AnalysisJobMapper analysisJobMapper;
  private final AnalysisJobRepository analysisJobRepository;

  public AnalysisDto toDto(Analysis entity) {
    if (entity == null) return null;

    AnalysisDto dto = new AnalysisDto();
    dto.setId(entity.getId());
    dto.setAnalysisJob(analysisJobMapper.toDto(entity.getAnalysisJob()));
    dto.setUrl(entity.getUrl());
    dto.setTimestamp(entity.getTimestamp());
    dto.setEligible(entity.getEligible());
    dto.setExclusionReason(entity.getExclusionReason());
    dto.setConfidenceScore(entity.getConfidenceScore());
    dto.setDeadline(entity.getDeadline());
    dto.setMatch(entity.getMatch());
    dto.setExtractedData(entity.getExtractedData());
    dto.setClassificationSummary(entity.getClassificationSummary());
    if (entity.getCriteria() != null) {
      dto.setCriteria(entity.getCriteria().stream().map(this::toDto).collect(Collectors.toList()));
    }
    return dto;
  }

  public CriterionDto toDto(Criterion entity) {
    if (entity == null) return null;
    CriterionDto dto = new CriterionDto();
    dto.setId(entity.getId());
    dto.setStatus(entity.getStatus());
    dto.setEvidence(entity.getEvidence());
    dto.setType(criterionTypeMapper.toDto(entity.getType()));
    return dto;
  }

  public Analysis toEntity(AnalysisDto dto) {
    if (dto == null) {
      return null;
    }

    Analysis entity = new Analysis();
    entity.setId(dto.getId());
    entity.setAnalysisJob(
        ofNullable(dto.getAnalysisJob())
            .map(AnalysisJobDto::getId)
            .flatMap(analysisJobRepository::findById)
            .orElse(null));
    entity.setUrl(dto.getUrl());
    entity.setTimestamp(dto.getTimestamp());
    entity.setEligible(dto.getEligible());
    entity.setExclusionReason(dto.getExclusionReason());
    entity.setConfidenceScore(dto.getConfidenceScore());
    entity.setDeadline(dto.getDeadline());
    entity.setMatch(dto.getMatch());
    entity.setExtractedData(dto.getExtractedData());
    entity.setClassificationSummary(dto.getClassificationSummary());

    if (dto.getCriteria() != null) {
      entity.setCriteria(
          dto.getCriteria().stream()
              .map(
                  criterionDto -> {
                    Criterion criterion = toEntity(criterionDto);
                    criterion.setAnalysis(entity);
                    return criterion;
                  })
              .collect(Collectors.toList()));
    } else {
      entity.setCriteria(Collections.emptyList());
    }

    return entity;
  }

  public Criterion toEntity(CriterionDto dto) {
    if (dto == null) {
      return null;
    }
    Criterion entity = new Criterion();
    entity.setId(dto.getId());
    entity.setStatus(dto.getStatus());
    entity.setEvidence(dto.getEvidence());
    entity.setType(criterionTypeMapper.toEntity(dto.getType()));
    return entity;
  }
}
