package org.ilo.management.service;

import java.util.List;
import org.ilo.management.data.amqp.ScrapResultMessage;
import org.ilo.management.dto.AnalysisJobDto;
import org.ilo.management.dto.ScrapResultDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.web.multipart.MultipartFile;

/**
 * Service interface responsible for managing ScrapResult entities.
 *
 * <p>Provides operations for searching and deleting ScrapResult records.
 */
public interface ScrapResultService {
  /**
   * Retrieves paginated scrap results using search query
   *
   * @param search RSQL query string for filtering.
   * @param pageable Pagination and sorting information.
   * @return A Page of ScrapResultDto.
   */
  Page<ScrapResultDto> search(String search, Pageable pageable);

  /**
   * Retrieves Scrap result by id
   *
   * @param id id of scrap result
   * @return ScrapResultDto object
   */
  ScrapResultDto findById(Long id);

  /**
   * Deletes scrap result
   *
   * @param id scrap result id to delete
   * @return true when deletion succeeded, false otherwise
   */
  boolean deleteScrapResult(Long id);

  /**
   * Triggers classification of Scrap Result.
   *
   * @param scrapResultId The Scrap Result id.
   * @return The AnalysisJob created for this classification request.
   */
  AnalysisJobDto triggerClassification(Long scrapResultId);

  AnalysisJobDto triggerReclassification(Long scrapResultId);

  /**
   * Triggers classification of Scrap Result only if it was configured to trigger in Automatic mode.
   *
   * @param id The Scrap Result id.
   */
  void triggerClassificationAutomatic(Long id);

  /**
   * Rejects the scrap result.
   *
   * @param id The Scrap Result id.
   * @return true if rejected, false if there was no Scrap Result with given ID.
   */
  boolean reject(Long id);

  /**
   * Accepts new ScrapResultMessage.
   *
   * @param message The new Scrap Result Message.
   * @return the new ScrapResult, never null
   */
  ScrapResultDto acceptScrapResultMessage(ScrapResultMessage message);

  void addAttachments(Long id, List<MultipartFile> attachments);

  AnalysisJobDto classify(String url, String content, List<MultipartFile> attachments);
}
