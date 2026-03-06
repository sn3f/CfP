package org.ilo.management.controller;

import lombok.RequiredArgsConstructor;
import org.ilo.management.dto.AnalysisFeedbackDto;
import org.ilo.management.mapper.CfpAnalysisFeedbackMapper;
import org.ilo.management.repository.AnalysisFeedbackRepository;
import org.ilo.management.service.CfpAnalysisFeedbackService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/cfp-analysis-feedback")
@RequiredArgsConstructor
public class CfpAnalysisFeedbackController {

  private final CfpAnalysisFeedbackService service;
  private final AnalysisFeedbackRepository repository;
  private final CfpAnalysisFeedbackMapper mapper;

  @GetMapping
  public ResponseEntity<Page<AnalysisFeedbackDto>> getFeedback(
      @RequestParam(value = "search", required = false) String search, Pageable pageable) {
    return ResponseEntity.ok(service.search(search, pageable));
  }

  @GetMapping("/{id}")
  public ResponseEntity<AnalysisFeedbackDto> getFeedbackById(@PathVariable Long id) {
    return ResponseEntity.ok(service.findById(id));
  }

  @PutMapping("/{id}")
  public ResponseEntity<AnalysisFeedbackDto> updateFeedback(
      @PathVariable Long id, @RequestBody AnalysisFeedbackDto feedbackDto) {
    return ResponseEntity.ok(service.update(id, feedbackDto));
  }

  @DeleteMapping("/{id}")
  public ResponseEntity<Void> deleteFeedback(@PathVariable Long id) {
    service.delete(id);
    return ResponseEntity.noContent().build();
  }
}
