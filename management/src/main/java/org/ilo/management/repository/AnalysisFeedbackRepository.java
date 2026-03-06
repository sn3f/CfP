package org.ilo.management.repository;

import java.util.Optional;
import org.ilo.management.model.AnalysisFeedback;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

@Repository
public interface AnalysisFeedbackRepository
    extends JpaRepository<AnalysisFeedback, Long>, JpaSpecificationExecutor<AnalysisFeedback> {
  Optional<AnalysisFeedback> findByIdAndAnalysisId(Long id, Long analysisId);

  boolean existsByIdAndOwnerSub(Long id, String ownerSub);

  Optional<AnalysisFeedback> findByAnalysisIdAndOwnerSub(Long analysisId, String ownerSub);

  void deleteByAnalysisId(Long analysisId);
}
