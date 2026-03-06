package org.ilo.management.mapper;

import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;
import org.ilo.management.dto.CriterionTypeDto;
import org.ilo.management.model.CriterionType;
import org.springframework.stereotype.Component;

@Component
public class CriterionTypeMapper {

  public CriterionTypeDto toDto(CriterionType criterionType) {
    if (criterionType == null) {
      return null;
    }

    CriterionTypeDto dto = new CriterionTypeDto();
    dto.setId(criterionType.getId());
    dto.setFieldName(criterionType.getFieldName());
    dto.setEvaluationLogic(criterionType.getEvaluationLogic());
    dto.setExamples(criterionType.getExamples());
    dto.setHard(criterionType.getHard());
    return dto;
  }

  public CriterionType toEntity(CriterionTypeDto criterionTypeDto) {
    if (criterionTypeDto == null) {
      return null;
    }

    CriterionType entity = new CriterionType();
    entity.setId(criterionTypeDto.getId());
    entity.setFieldName(criterionTypeDto.getFieldName());
    entity.setEvaluationLogic(criterionTypeDto.getEvaluationLogic());
    entity.setExamples(criterionTypeDto.getExamples());
    entity.setHard(criterionTypeDto.getHard());
    return entity;
  }

  public List<CriterionTypeDto> toDtoList(List<CriterionType> criterionTypes) {
    if (criterionTypes == null) {
      return Collections.emptyList();
    }
    return criterionTypes.stream().map(this::toDto).collect(Collectors.toList());
  }

  public void updateEntityFromDto(CriterionTypeDto criterionTypeDto, CriterionType criterionType) {
    if (criterionTypeDto == null || criterionType == null) {
      return;
    }

    criterionType.setFieldName(criterionTypeDto.getFieldName());
    criterionType.setEvaluationLogic(criterionTypeDto.getEvaluationLogic());
    criterionType.setExamples(criterionTypeDto.getExamples());
    criterionType.setHard(criterionTypeDto.getHard());
  }
}
