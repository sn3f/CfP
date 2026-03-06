package org.ilo.management.mapper;

import org.ilo.management.dto.CfpAnalysisFeedbackItemDto;
import org.ilo.management.model.CfpAnalysisFeedbackItem;
import org.springframework.stereotype.Component;

@Component
public class CfpAnalysisFeedbackItemMapper {

  public CfpAnalysisFeedbackItem toEntity(CfpAnalysisFeedbackItemDto dto) {
    if (dto == null) {
      return null;
    }
    CfpAnalysisFeedbackItem entity = new CfpAnalysisFeedbackItem();
    entity.setId(dto.getId());
    entity.setType(dto.getType());
    entity.setKey(dto.getKey());
    entity.setName(dto.getName());
    entity.setEvidence(dto.getEvidence());
    entity.setValue(dto.getValue());
    entity.setCorrect(dto.getCorrect());
    entity.setComment(dto.getComment());
    return entity;
  }

  public CfpAnalysisFeedbackItemDto toDto(CfpAnalysisFeedbackItem entity) {
    if (entity == null) {
      return null;
    }
    CfpAnalysisFeedbackItemDto dto = new CfpAnalysisFeedbackItemDto();
    dto.setId(entity.getId());
    dto.setType(entity.getType());
    dto.setKey(entity.getKey());
    dto.setName(entity.getName());
    dto.setEvidence(entity.getEvidence());
    dto.setValue(entity.getValue());
    dto.setCorrect(entity.getCorrect());
    dto.setComment(entity.getComment());
    return dto;
  }
}
