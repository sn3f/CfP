package org.ilo.management.repository;

import org.ilo.management.model.Analysis;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

@Repository
public interface AnalysisRepository
    extends JpaRepository<Analysis, Long>, JpaSpecificationExecutor<Analysis> {}
