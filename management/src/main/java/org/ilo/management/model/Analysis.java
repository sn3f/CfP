package org.ilo.management.model;

import jakarta.persistence.*;
import java.time.LocalDate;
import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Getter
@Setter
@Entity
@Table(name = "cfp_analysis")
public class Analysis {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "analysis_job_id", updatable = false)
  private AnalysisJob analysisJob;

  @Column(length = 2048)
  private String url;

  private ZonedDateTime timestamp;

  private Boolean eligible;

  @Column(columnDefinition = "TEXT")
  private String exclusionReason;

  @Column(columnDefinition = "TEXT")
  private String classificationSummary;

  private Double confidenceScore;

  private LocalDate deadline;

  private Double match;

  @JdbcTypeCode(SqlTypes.JSON)
  @Column(columnDefinition = "jsonb")
  private Map<String, Object> extractedData;

  @OneToMany(mappedBy = "analysis", cascade = CascadeType.ALL, orphanRemoval = true)
  private List<Criterion> criteria = new ArrayList<>();
}
