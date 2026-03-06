package org.ilo.management.controller;

import java.net.URI;
import lombok.RequiredArgsConstructor;
import org.ilo.management.dto.AnalysisFeedbackDto;
import org.ilo.management.service.CfpAnalysisFeedbackService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

@RestController
@RequestMapping("/api/v1/cfp-analysis/{analysisId}/feedback")
@RequiredArgsConstructor
public class CfpAnalysisSubresourceController {

  private final CfpAnalysisFeedbackService service;

  @PostMapping
  public ResponseEntity<AnalysisFeedbackDto> getFeedbackForAnalysisAndCurrentUser(
      @PathVariable Long analysisId) {
    AnalysisFeedbackDto createdDto = service.getOrCreateForAnalysisAndCurrentUser(analysisId);
    URI location =
        ServletUriComponentsBuilder.fromCurrentRequest()
            .path("/{id}")
            .buildAndExpand(createdDto.getId())
            .toUri();
    return ResponseEntity.created(location).body(createdDto);
  }

  @GetMapping("/{feedbackId}")
  public ResponseEntity<AnalysisFeedbackDto> getFeedbackByIdForAnalysis(
      @PathVariable Long analysisId, @PathVariable Long feedbackId) {
    return ResponseEntity.ok(service.findByIdForAnalysis(analysisId, feedbackId));
  }

  @PutMapping("/{feedbackId}")
  public ResponseEntity<AnalysisFeedbackDto> updateFeedbackForAnalysis(
      @PathVariable Long analysisId,
      @PathVariable Long feedbackId,
      @RequestBody AnalysisFeedbackDto feedbackDto) {
    return ResponseEntity.ok(service.updateForAnalysis(analysisId, feedbackId, feedbackDto));
  }

  @DeleteMapping("/{feedbackId}")
  public ResponseEntity<Void> deleteFeedbackForAnalysis(
      @PathVariable Long analysisId, @PathVariable Long feedbackId) {
    service.deleteForAnalysis(analysisId, feedbackId);
    return ResponseEntity.noContent().build();
  }
}
