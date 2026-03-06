package org.ilo.management.repository;

import java.util.Optional;
import org.ilo.management.model.CriterionType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

@Repository
public interface CriterionTypeRepository
    extends JpaRepository<CriterionType, Long>, JpaSpecificationExecutor<CriterionType> {
  /**
   * Finds a CriterionType by its unique field name. This is used to link a new Criterion instance
   * to its definition.
   *
   * @param fieldName The unique field name (e.g., "organization_eligibility").
   * @return An Optional containing the CriterionType if found.
   */
  Optional<CriterionType> findByFieldName(String fieldName);
}
