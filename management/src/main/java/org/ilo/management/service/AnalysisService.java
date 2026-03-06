package org.ilo.management.service;

import jakarta.persistence.EntityNotFoundException;
import java.util.List;
import java.util.Optional;
import org.ilo.management.dto.AnalysisDto;
import org.ilo.management.dto.AnalysisJobDto;
import org.ilo.management.dto.CfpAnalysisClassificationDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.web.multipart.MultipartFile;

public interface AnalysisService {
  Page<AnalysisDto> search(String search, Pageable pageable);

  /**
   * Creates and persists a new CfpAnalysis and its associated Criteria from a CfpAnalysisDto.
   *
   * @param cfpAnalysisClassificationDto The DTO containing the analysis data.
   */
  void createAnalysis(CfpAnalysisClassificationDto cfpAnalysisClassificationDto);

  Optional<AnalysisDto> update(Long id, AnalysisDto analysisDto);

  boolean delete(Long id);

  /**
   * @param id The ID of Analysis to reclassify.
   * @param addAttachments The List of files to add to the Analysis before reclassifying.
   * @return The AnalysisJob created as a result of reclassification request.
   * @throws EntityNotFoundException When Analysis entity with given ID was not found, or the
   *     Analysis entity had no ScrapResult linked.
   */
  AnalysisJobDto reclassify(Long id, List<MultipartFile> addAttachments);
}
