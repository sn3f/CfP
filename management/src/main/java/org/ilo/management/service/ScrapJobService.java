package org.ilo.management.service;

import org.ilo.management.data.amqp.ScrapRequestMessage;
import org.ilo.management.dto.ScrapJobDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface ScrapJobService {
  ScrapJobDto findById(String id);

  Page<ScrapJobDto> search(String search, Pageable pageable);

  ScrapRequestMessage createScrapRequest(Long sourceId);
}
