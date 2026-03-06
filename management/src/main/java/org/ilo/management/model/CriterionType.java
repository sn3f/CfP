package org.ilo.management.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "criterion_type")
public class CriterionType {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  /** The unique field name for the criterion, e.g., "organization_eligibility". */
  @Column(name = "field_name", nullable = false, unique = true)
  private String fieldName;

  @Column(name = "evaluation_logic", columnDefinition = "TEXT")
  private String evaluationLogic;

  @Column(columnDefinition = "TEXT")
  private String examples;

  private Boolean hard;
}
