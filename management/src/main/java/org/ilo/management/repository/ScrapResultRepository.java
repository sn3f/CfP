package org.ilo.management.repository;

import org.ilo.management.model.ScrapResult;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

@Repository
public interface ScrapResultRepository
    extends JpaRepository<ScrapResult, Long>, JpaSpecificationExecutor<ScrapResult> {}
