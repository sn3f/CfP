package org.ilo.management.controller;

import cz.jirutka.rsql.parser.RSQLParser;
import cz.jirutka.rsql.parser.ast.Node;
import java.net.URI;
import lombok.RequiredArgsConstructor;
import org.ilo.management.dto.CriterionTypeDto;
import org.ilo.management.mapper.CriterionTypeMapper;
import org.ilo.management.model.CriterionType;
import org.ilo.management.repository.CriterionTypeRepository;
import org.ilo.management.service.CriterionTypeService;
import org.ilo.management.specification.CriterionTypeSpecification;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

@RestController
@RequestMapping("/api/v1/criterion-types")
@RequiredArgsConstructor
public class CriterionTypeController {

  private final CriterionTypeService criterionTypeService;
  private final CriterionTypeRepository criterionTypeRepository;
  private final CriterionTypeMapper criterionTypeMapper;

  /**
   * Create a new criterion type.
   *
   * @param criterionTypeDto the criterionTypeDto to create.
   * @return the ResponseEntity with status 201 (Created) and with body the new criterionTypeDto, or
   *     with status 400 (Bad Request) if the criterionType has already an ID.
   */
  @PostMapping
  public ResponseEntity<CriterionTypeDto> createCriterionType(
      @RequestBody CriterionTypeDto criterionTypeDto) {
    if (criterionTypeDto.getId() != null) {
      return ResponseEntity.badRequest().build();
    }
    CriterionTypeDto createdDto = criterionTypeService.createCriterionType(criterionTypeDto);
    URI location =
        ServletUriComponentsBuilder.fromCurrentRequest()
            .path("/{id}")
            .buildAndExpand(createdDto.getId())
            .toUri();
    return ResponseEntity.created(location).body(createdDto);
  }

  /**
   * Retrieves a paginated and filtered list of Criterion Types. Allows filtering on all fields of
   * the CriterionType entity. Example RSQL search: fieldName=="organization_eligibility";hard==true
   *
   * @param search RSQL query string for filtering.
   * @param pageable Pagination and sorting information.
   * @return A Page of CriterionTypeDto.
   */
  @GetMapping
  public ResponseEntity<Page<CriterionTypeDto>> getCriterionTypes(
      @RequestParam(value = "search", required = false) String search, Pageable pageable) {

    Page<CriterionType> entityPage;
    if (search == null || search.isBlank()) {
      entityPage = criterionTypeRepository.findAll(pageable);
    } else {
      try {
        Node rootNode = new RSQLParser().parse(search);
        Specification<CriterionType> spec = rootNode.accept(new CriterionTypeSpecification());
        entityPage = criterionTypeRepository.findAll(spec, pageable);
      } catch (Exception e) {
        return ResponseEntity.badRequest().build();
      }
    }
    Page<CriterionTypeDto> dtoPage = entityPage.map(criterionTypeMapper::toDto);
    return ResponseEntity.ok(dtoPage);
  }

  /**
   * Get the "id" criterion type.
   *
   * @param id the id of the criterionTypeDto to retrieve.
   * @return the ResponseEntity with status 200 (OK) and with body the criterionTypeDto, or with
   *     status 404 (Not Found).
   */
  @GetMapping("/{id}")
  public ResponseEntity<CriterionTypeDto> getCriterionTypeById(@PathVariable Long id) {
    return criterionTypeService
        .getCriterionTypeById(id)
        .map(ResponseEntity::ok)
        .orElse(ResponseEntity.notFound().build());
  }

  /**
   * Updates an existing criterion type.
   *
   * @param id the id of the criterionTypeDto to save.
   * @param criterionTypeDto the criterionTypeDto to update.
   * @return the ResponseEntity with status 200 (OK) and with body the updated criterionTypeDto, or
   *     with status 404 (Not Found) if the criterionType is not found, or with status 400 (Bad
   *     Request) if the id in the path does not match the id in the body.
   */
  @PutMapping("/{id}")
  public ResponseEntity<CriterionTypeDto> updateCriterionType(
      @PathVariable Long id, @RequestBody CriterionTypeDto criterionTypeDto) {
    if (criterionTypeDto.getId() == null || !id.equals(criterionTypeDto.getId())) {
      return ResponseEntity.badRequest().build();
    }
    return criterionTypeService
        .updateCriterionType(id, criterionTypeDto)
        .map(ResponseEntity::ok)
        .orElse(ResponseEntity.notFound().build());
  }

  /**
   * Delete the "id" criterion type.
   *
   * @param id the id of the criterionType to delete.
   * @return the ResponseEntity with status 204 (No Content) or 404 (Not Found).
   */
  @DeleteMapping("/{id}")
  public ResponseEntity<Void> deleteCriterionType(@PathVariable Long id) {
    if (criterionTypeService.deleteCriterionType(id)) {
      return ResponseEntity.noContent().build();
    } else {
      return ResponseEntity.notFound().build();
    }
  }
}
