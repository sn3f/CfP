package org.ilo.management.repository;

import org.ilo.management.model.ScrapJob;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

@Repository
public interface ScrapJobRepository
    extends JpaRepository<ScrapJob, String>, JpaSpecificationExecutor<ScrapJob> {}
