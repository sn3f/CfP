package org.ilo.management.repository;

import org.ilo.management.model.AnalysisJob;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

@Repository
public interface AnalysisJobRepository
    extends JpaRepository<AnalysisJob, String>, JpaSpecificationExecutor<AnalysisJob> {}
