package org.ilo.management.repository;

import java.util.List;
import org.ilo.management.model.Source;
import org.ilo.management.model.SourceStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

@Repository
public interface SourceRepository
    extends JpaRepository<Source, Long>, JpaSpecificationExecutor<Source> {
  List<Source> findAllByStatus(SourceStatus status);
}
