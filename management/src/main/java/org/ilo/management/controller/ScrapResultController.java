package org.ilo.management.controller;

import java.util.List;
import lombok.RequiredArgsConstructor;
import org.ilo.management.dto.AnalysisJobDto;
import org.ilo.management.dto.ScrapResultDto;
import org.ilo.management.service.ScrapResultService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

/**
 * REST controller responsible for managing {@link org.ilo.management.model.ScrapResult} resources.
 *
 * <p>This controller provides search and delete operations and dynamic search support using RSQL
 * syntax. It exposes endpoints under /api/v1/scrap-results.
 */
@RestController
@RequestMapping("/api/v1/scrap-results")
@RequiredArgsConstructor
public class ScrapResultController {

  private final ScrapResultService scrapResultService;

  @GetMapping
  public ResponseEntity<Page<ScrapResultDto>> getResults(
      @RequestParam(value = "search", required = false) String search, Pageable pageable) {
    return ResponseEntity.ok(scrapResultService.search(search, pageable));
  }

  /**
   * Retrieves a scrap result by its unique identifier.
   *
   * @param id the ID of the scrap result to retrieve
   * @return {@code 200 OK} with the {@link ScrapResultDto} if found. When not found exception is
   *     thrown.
   */
  @GetMapping("/{id}")
  public ResponseEntity<ScrapResultDto> getResultById(@PathVariable Long id) {
    return ResponseEntity.ok(scrapResultService.findById(id));
  }

  /**
   * Deletes an existing scrap result by its ID.
   *
   * @param id the ID of the scrap result to delete
   * @return {@code 204 No Content} if deletion succeeded, or {@code 404 Not Found} if there is no
   *     entity with the given ID
   */
  @DeleteMapping("/{id}")
  public ResponseEntity<Void> deleteScrapResult(@PathVariable Long id) {
    if (scrapResultService.deleteScrapResult(id)) {
      return ResponseEntity.noContent().build();
    } else {
      return ResponseEntity.notFound().build();
    }
  }

  /**
   * Triggers classification for scrap result
   *
   * @param id id of scrap result
   * @return no content
   */
  @PostMapping("/{id}/classify")
  public ResponseEntity<AnalysisJobDto> triggerClassification(@PathVariable Long id) {
    return ResponseEntity.ok(scrapResultService.triggerClassification(id));
  }

  /**
   * Rejects the scrap result.
   *
   * @param id id of scrap result
   * @return no content
   */
  @PostMapping("/{id}/reject")
  public ResponseEntity<Void> reject(@PathVariable Long id) {
    if (scrapResultService.reject(id)) {
      return ResponseEntity.noContent().build();
    } else {
      return ResponseEntity.notFound().build();
    }
  }

  @PostMapping("/classify")
  public ResponseEntity<AnalysisJobDto> classify(
      @RequestPart(name = "url", required = false) String url,
      @RequestPart("content") String content,
      @RequestPart(name = "attachments", required = false) List<MultipartFile> attachments) {
    return ResponseEntity.ok(scrapResultService.classify(url, content, attachments));
  }
}
