package org.ilo.management.controller;

import lombok.RequiredArgsConstructor;
import org.ilo.management.dto.ScrapJobDto;
import org.ilo.management.service.ScrapJobService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * REST controller responsible for managing {@link org.ilo.management.model.ScrapJob} resources.
 *
 * <p>This controller provides search and delete operations and dynamic search support using RSQL
 * syntax. It exposes endpoints under /api/v1/scrap-jobs.
 */
@RestController
@RequestMapping("/api/v1/scrap-jobs")
@RequiredArgsConstructor
public class ScrapJobController {

  private final ScrapJobService scrapJobService;

  @GetMapping
  public ResponseEntity<Page<ScrapJobDto>> getResults(
      @RequestParam(value = "search", required = false) String search, Pageable pageable) {
    return ResponseEntity.ok(scrapJobService.search(search, pageable));
  }

  /**
   * Retrieves a scrap result by its unique identifier.
   *
   * @param id the ID of the scrap result to retrieve
   * @return {@code 200 OK} with the {@link ScrapJobDto} if found. When not found exception is
   *     thrown.
   */
  @GetMapping("/{id}")
  public ResponseEntity<ScrapJobDto> getResultById(@PathVariable String id) {
    return ResponseEntity.ok(scrapJobService.findById(id));
  }
}
