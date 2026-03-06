package org.ilo.management.model;

import jakarta.persistence.*;
import java.time.ZonedDateTime;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "analysis_job")
public class AnalysisJob {
  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  private String id;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "scrap_result_id", updatable = false)
  private ScrapResult scrapResult;

  @Column private ZonedDateTime createdAt;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "result_id")
  private Analysis result;

  // TODO: Add workerHostname to identify which worker took this job, add status and last updated to
  //   track progres, add jsonb to keep 'random' statistics as provided by classifier

  @PrePersist
  public void prePersist() {
    createdAt = ZonedDateTime.now();
  }
}
