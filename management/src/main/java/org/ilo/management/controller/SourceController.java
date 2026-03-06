package org.ilo.management.controller;

import java.net.URI;
import lombok.RequiredArgsConstructor;
import org.ilo.management.dto.SourceDto;
import org.ilo.management.model.Source;
import org.ilo.management.service.ScrapRequestProducer;
import org.ilo.management.service.SourceService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

/**
 * REST controller responsible for managing {@link Source} resources.
 *
 * <p>This controller provides CRUD operations and dynamic search support using RSQL syntax. It
 * exposes endpoints under /api/v1/cfp-sources.
 */
@RestController
@RequestMapping("/api/v1/cfp-sources")
@RequiredArgsConstructor
public class SourceController {

  private final SourceService service;
  private final ScrapRequestProducer scrapRequestProducer;

  /**
   * Creates a new CfP source entry.
   *
   * @param sourceDto the DTO representing the source to create
   * @return {@code 201 Created} with a Location header pointing to the created resource, or {@code
   *     400 Bad Request} if the DTO already contains an ID
   */
  @PostMapping
  public ResponseEntity<SourceDto> createSource(@RequestBody SourceDto sourceDto) {
    if (sourceDto.getId() != null) {
      return ResponseEntity.badRequest().build();
    }

    SourceDto createdDto = service.createSource(sourceDto);
    URI location =
        ServletUriComponentsBuilder.fromCurrentRequest()
            .path("/{id}")
            .buildAndExpand(createdDto.getId())
            .toUri();

    return ResponseEntity.created(location).body(createdDto);
  }

  /**
   * Retrieves a CfP source by its unique identifier.
   *
   * @param id the ID of the CfP source to retrieve
   * @return {@code 200 OK} with the {@link SourceDto} if found, or {@code 404 Not Found} if there
   *     is no resource matching the given ID
   */
  @GetMapping("/{id}")
  public ResponseEntity<SourceDto> getSourceById(@PathVariable Long id) {
    return service
        .getSourceById(id)
        .map(ResponseEntity::ok)
        .orElse(ResponseEntity.notFound().build());
  }

  /**
   * Retrieves a paginated list of CfP sources.
   *
   * <h4>Examples</h4>
   *
   * <ul>
   *   <li>{@code /api/v1/cfp-sources?search=status==ACTIVE}
   *   <li>{@code /api/v1/cfp-sources?search=name==*test*;frequency==DAILY}
   * </ul>
   *
   * @param search optional RSQL query for filtering results
   * @param pageable pagination and sorting configuration
   * @return {@code 200 OK} with page of matched {@link SourceDto} instances, or {@code 400 Bad
   *     Request} if the RSQL expression is invalid
   */
  @GetMapping
  public ResponseEntity<Page<SourceDto>> getSources(
      @RequestParam(value = "search", required = false) String search, Pageable pageable) {
    return ResponseEntity.ok(service.search(search, pageable));
  }

  /**
   * Updates an existing CfP source.
   *
   * <p>The DTO must contain an ID matching the path variable; otherwise, a {@code 400 Bad Request}
   * response is returned.
   *
   * @param id the identifier of the source to update
   * @param sourceDto the updated data for the CfP source
   * @return {@code 200 OK} with updated DTO if found and updated, {@code 400 Bad Request} if ID
   *     validation fails, or {@code 404 Not Found} if the entity does not exist
   */
  @PutMapping("/{id}")
  public ResponseEntity<SourceDto> updateSource(
      @PathVariable Long id, @RequestBody SourceDto sourceDto) {
    if (sourceDto.getId() == null || !id.equals(sourceDto.getId())) {
      return ResponseEntity.badRequest().build();
    }

    return service
        .updateSource(id, sourceDto)
        .map(ResponseEntity::ok)
        .orElse(ResponseEntity.notFound().build());
  }

  /**
   * Deletes an existing CfP source by its ID.
   *
   * @param id the ID of the source to delete
   * @return {@code 204 No Content} if deletion succeeded, or {@code 404 Not Found} if there is no
   *     entity with the given ID
   */
  @DeleteMapping("/{id}")
  public ResponseEntity<Void> deleteSource(@PathVariable Long id) {
    if (service.deleteSource(id)) {
      return ResponseEntity.noContent().build();
    } else {
      return ResponseEntity.notFound().build();
    }
  }

  /**
   * Triggers scraping for cfp source
   *
   * @param id id of cfp source
   * @return no content
   */
  @PostMapping("/{id}/scrape")
  public ResponseEntity<Void> triggerScraping(@PathVariable Long id) {
    scrapRequestProducer.triggerScraping(id);

    return ResponseEntity.noContent().build();
  }
}
