package org.ilo.management.service;

import java.util.Optional;
import org.ilo.management.dto.CriterionTypeDto;
import org.springframework.transaction.annotation.Transactional;

public interface CriterionTypeService {
  /**
   * Creates a new CriterionType.
   *
   * @param criterionTypeDto DTO containing data for the new entity.
   * @return The created entity mapped to a DTO.
   */
  CriterionTypeDto createCriterionType(CriterionTypeDto criterionTypeDto);

  /**
   * Updates an existing CriterionType.
   *
   * @param id The ID of the entity to update.
   * @param criterionTypeDto DTO containing the new data.
   * @return An Optional containing the updated DTO if the entity was found, otherwise empty.
   */
  Optional<CriterionTypeDto> updateCriterionType(Long id, CriterionTypeDto criterionTypeDto);

  /**
   * Deletes a CriterionType by its ID.
   *
   * @param id The ID of the entity to delete.
   * @return true if the entity was found and deleted, false otherwise.
   */
  boolean deleteCriterionType(Long id);

  /**
   * Retrieves a single CriterionType by its ID.
   *
   * @param id The ID of the entity to retrieve.
   * @return An Optional containing the DTO if found, otherwise empty.
   */
  @Transactional(readOnly = true)
  Optional<CriterionTypeDto> getCriterionTypeById(Long id);
}
