package org.ilo.management.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "cfp_analysis_feedback_item")
@NoArgsConstructor
public class CfpAnalysisFeedbackItem {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "cfp_analysis_feedback_id", updatable = false)
  private AnalysisFeedback analysisFeedback;

  @Column(nullable = false, updatable = false)
  private String key;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, updatable = false)
  private CfpAnalysisFeedbackItemType type;

  @Column(nullable = false, updatable = false)
  private String name;

  @Column(columnDefinition = "TEXT", updatable = false)
  private String evidence;

  @Column(columnDefinition = "TEXT", updatable = false)
  private String value;

  private Boolean correct;

  @Column(columnDefinition = "TEXT")
  private String comment;

  public CfpAnalysisFeedbackItem(
      AnalysisFeedback analysisFeedback,
      String key,
      CfpAnalysisFeedbackItemType type,
      String name,
      String evidence,
      String value) {
    this.analysisFeedback = analysisFeedback;
    this.key = key;
    this.type = type;
    this.name = name;
    this.evidence = evidence;
    this.value = value;
    this.correct = true;
  }
}
