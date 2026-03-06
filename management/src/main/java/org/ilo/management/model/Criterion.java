package org.ilo.management.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "criterion")
public class Criterion {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  /**
   * Using a string to store status to handle "true", "false", or other potential states. Can be
   * converted to a Boolean in the service layer if needed.
   */
  @Column(nullable = false)
  private String status;

  @Column(columnDefinition = "TEXT")
  private String evidence;

  /** Links this specific criterion instance back to its classification result. */
  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "cfp_analysis_id")
  private Analysis analysis;

  /**
   * Many-to-One relationship to a CriterionType. This allows multiple criterion instances (across
   * different analyses) to refer to the same definition of a criterion.
   */
  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "criterion_type_id")
  private CriterionType type;
}
