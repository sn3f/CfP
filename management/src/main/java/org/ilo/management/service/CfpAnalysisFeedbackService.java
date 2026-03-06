package org.ilo.management.service;

import org.ilo.management.dto.AnalysisFeedbackDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.transaction.annotation.Transactional;

public interface CfpAnalysisFeedbackService {

  Page<AnalysisFeedbackDto> search(String search, Pageable pageable);

  @Transactional(readOnly = true)
  AnalysisFeedbackDto findById(Long id);

  AnalysisFeedbackDto update(Long id, AnalysisFeedbackDto feedbackDto);

  void delete(Long id);

  AnalysisFeedbackDto getOrCreateForAnalysisAndCurrentUser(Long analysisId);

  @Transactional(readOnly = true)
  AnalysisFeedbackDto findByIdForAnalysis(Long analysisId, Long feedbackId);

  AnalysisFeedbackDto updateForAnalysis(
      Long analysisId, Long feedbackId, AnalysisFeedbackDto feedbackDto);

  void deleteForAnalysis(Long analysisId);

  void deleteForAnalysis(Long analysisId, Long feedbackId);
}
