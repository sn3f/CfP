package org.ilo.management.model;

import jakarta.persistence.*;
import java.time.ZonedDateTime;
import java.util.List;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "cfp_analysis_feedback")
public class AnalysisFeedback {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "cfp_analysis_id", updatable = false)
  private Analysis analysis;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "owner_id", updatable = false)
  private User owner;

  @Column(nullable = false, updatable = false)
  private ZonedDateTime createdAt;

  @Column(nullable = false, updatable = false)
  private ZonedDateTime updatedAt;

  @OneToMany(mappedBy = "analysisFeedback", cascade = CascadeType.ALL, orphanRemoval = true)
  private List<CfpAnalysisFeedbackItem> items;
}
