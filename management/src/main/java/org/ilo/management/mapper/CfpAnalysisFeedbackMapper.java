package org.ilo.management.mapper;

import static java.util.Comparator.comparing;

import java.util.Collections;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.ilo.management.dto.AnalysisFeedbackDto;
import org.ilo.management.dto.CfpAnalysisFeedbackItemDto;
import org.ilo.management.model.AnalysisFeedback;
import org.ilo.management.model.CfpAnalysisFeedbackItem;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class CfpAnalysisFeedbackMapper {

  private final CfpAnalysisFeedbackItemMapper itemMapper;
  private final UserMapper userMapper;
  private final AnalysisMapper analysisMapper;

  public AnalysisFeedbackDto toDto(AnalysisFeedback entity) {
    if (entity == null) {
      return null;
    }

    AnalysisFeedbackDto dto = new AnalysisFeedbackDto();
    dto.setId(entity.getId());
    dto.setCreatedAt(entity.getCreatedAt());
    dto.setOwner(userMapper.toDto(entity.getOwner()));
    dto.setCfpAnalysis(analysisMapper.toDto(entity.getAnalysis()));

    if (entity.getItems() != null) {
      dto.setItems(
          entity.getItems().stream()
              .map(itemMapper::toDto)
              .sorted(comparing(CfpAnalysisFeedbackItemDto::getId))
              .collect(Collectors.toList()));
    } else {
      dto.setItems(Collections.emptyList());
    }

    return dto;
  }

  public void updateEntityFromDto(AnalysisFeedbackDto dto, AnalysisFeedback entity) {
    if (dto == null || entity == null) {
      return;
    }

    entity.setUpdatedAt(dto.getUpdatedAt());

    entity.getItems().clear();
    if (dto.getItems() != null) {
      dto.getItems()
          .forEach(
              itemDto -> {
                CfpAnalysisFeedbackItem item = itemMapper.toEntity(itemDto);
                item.setAnalysisFeedback(entity);
                entity.getItems().add(item);
              });
    }
  }
}
