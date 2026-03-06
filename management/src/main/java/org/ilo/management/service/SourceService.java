package org.ilo.management.service;

import java.util.Optional;
import org.ilo.management.dto.SourceDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

/**
 * Service interface responsible for managing CfP Source entities.
 *
 * <p>Provides operations for creating, retrieving, updating, and deleting CfP Source records.
 * Implementations of this interface handle transactional boundaries and data persistence logic.
 */
public interface SourceService {
  Page<SourceDto> search(String search, Pageable pageable);

  /**
   * Creates a new CfP Source entity based on the provided DTO.
   *
   * @param sourceDto the DTO containing information about the new CfP source
   * @return the persisted CfP Source as a DTO, including its generated ID
   */
  SourceDto createSource(SourceDto sourceDto);

  /**
   * Retrieves a CfP Source by its unique identifier.
   *
   * @param id the ID of the CfP source to retrieve
   * @return an {@link Optional} containing the corresponding {@link SourceDto} if found, or an
   *     empty Optional if the entity does not exist
   */
  Optional<SourceDto> getSourceById(Long id);

  /**
   * Updates an existing CfP Source identified by its ID.
   *
   * @param id the ID of the CfP source to update
   * @param sourceDto the updated CfP Source data
   * @return an {@link Optional} containing the updated {@link SourceDto} if the update was
   *     successful, or empty if the entity was not found
   */
  Optional<SourceDto> updateSource(Long id, SourceDto sourceDto);

  /**
   * Deletes an existing CfP Source by its ID.
   *
   * @param id the ID of the CfP source to delete
   * @return {@code true} if the entity was successfully deleted, or {@code false} if no entity with
   *     the specified ID exists
   */
  boolean deleteSource(Long id);
}
