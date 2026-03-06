package org.ilo.management.service.impl;

import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.ilo.management.dto.CriterionTypeDto;
import org.ilo.management.mapper.CriterionTypeMapper;
import org.ilo.management.model.CriterionType;
import org.ilo.management.repository.CriterionTypeRepository;
import org.ilo.management.service.CriterionTypeService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional
public class CriterionTypeServiceImpl implements CriterionTypeService {

  private final CriterionTypeRepository criterionTypeRepository;
  private final CriterionTypeMapper criterionTypeMapper;

  @Override
  public CriterionTypeDto createCriterionType(CriterionTypeDto criterionTypeDto) {
    CriterionType criterionType = criterionTypeMapper.toEntity(criterionTypeDto);
    CriterionType savedCriterionType = criterionTypeRepository.save(criterionType);
    return criterionTypeMapper.toDto(savedCriterionType);
  }

  @Override
  public Optional<CriterionTypeDto> updateCriterionType(
      Long id, CriterionTypeDto criterionTypeDto) {
    return criterionTypeRepository
        .findById(id)
        .map(
            existingCriterionType -> {
              criterionTypeMapper.updateEntityFromDto(criterionTypeDto, existingCriterionType);
              CriterionType updatedCriterionType =
                  criterionTypeRepository.save(existingCriterionType);
              return criterionTypeMapper.toDto(updatedCriterionType);
            });
  }

  @Override
  public boolean deleteCriterionType(Long id) {
    if (criterionTypeRepository.existsById(id)) {
      criterionTypeRepository.deleteById(id);
      return true;
    }
    return false;
  }

  @Transactional(readOnly = true)
  @Override
  public Optional<CriterionTypeDto> getCriterionTypeById(Long id) {
    return criterionTypeRepository.findById(id).map(criterionTypeMapper::toDto);
  }
}
