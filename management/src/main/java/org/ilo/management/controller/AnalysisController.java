package org.ilo.management.controller;

import java.util.List;
import lombok.RequiredArgsConstructor;
import org.ilo.management.dto.AnalysisDto;
import org.ilo.management.dto.AnalysisJobDto;
import org.ilo.management.mapper.AnalysisMapper;
import org.ilo.management.repository.AnalysisRepository;
import org.ilo.management.service.AnalysisService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/v1/cfp-analysis")
@RequiredArgsConstructor
public class AnalysisController {

  private final AnalysisService analysisService;
  private final AnalysisRepository analysisRepository;
  private final AnalysisMapper analysisMapper;

  /**
   * Updates an existing CfP Analysis.
   *
   * <p>The DTO must contain an ID matching the path variable; otherwise, a {@code 400 Bad Request}
   * response is returned.
   *
   * @param id the identifier of the analysis to update
   * @param analysisDto the updated data for the CfP source
   * @return {@code 200 OK} with updated DTO if found and updated, {@code 400 Bad Request} if ID
   *     validation fails, or {@code 404 Not Found} if the entity does not exist
   */
  @PutMapping("/{id}")
  public ResponseEntity<AnalysisDto> updateAnalysis(
      @PathVariable Long id, @RequestBody AnalysisDto analysisDto) {
    if (analysisDto.getId() == null || !id.equals(analysisDto.getId())) {
      return ResponseEntity.badRequest().build();
    }

    return analysisService
        .update(id, analysisDto)
        .map(ResponseEntity::ok)
        .orElse(ResponseEntity.notFound().build());
  }

  /**
   * Retrieves a paginated and filtered list of CfpAnalysis summaries.
   *
   * @param search RSQL query string for filtering.
   * @param pageable Pagination and sorting information.
   * @return A Page of CfpAnalysisDto.
   */
  @GetMapping
  public ResponseEntity<Page<AnalysisDto>> getAnalyses(
      @RequestParam(value = "search", required = false) String search, Pageable pageable) {
    return ResponseEntity.ok(analysisService.search(search, pageable));
  }

  /**
   * Retrieves a single, detailed CfpAnalysis by its ID.
   *
   * @param id The ID of the CfpAnalysis entity to retrieve.
   * @return ResponseEntity with the detailed CfpAnalysisDto if found, otherwise 404 Not Found.
   */
  @GetMapping("/{id}")
  public ResponseEntity<AnalysisDto> getAnalysisById(@PathVariable Long id) {
    return analysisRepository
        .findById(id)
        .map(analysisMapper::toDto) // Convert entity to DTO
        .map(ResponseEntity::ok)
        .orElse(ResponseEntity.notFound().build());
  }

  /**
   * Deletes a single CfpAnalysis.
   *
   * @param id The ID of the CfpAnalysis entity to delete.
   * @return 204 No Content if it was deleted, otherwise 404 Not Found
   */
  @DeleteMapping("/{id}")
  public ResponseEntity<Void> deleteAnalysis(@PathVariable Long id) {
    if (analysisService.delete(id)) {
      return ResponseEntity.noContent().build();
    } else {
      return ResponseEntity.notFound().build();
    }
  }

  @PostMapping("/{id}/reclassify")
  public ResponseEntity<AnalysisJobDto> reclassify(
      @PathVariable Long id,
      @RequestPart(name = "addAttachments", required = false) List<MultipartFile> addAttachments) {
    return ResponseEntity.ok(analysisService.reclassify(id, addAttachments));
  }
}
