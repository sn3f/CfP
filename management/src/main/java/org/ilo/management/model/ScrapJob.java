package org.ilo.management.model;

import jakarta.persistence.*;
import java.time.ZonedDateTime;
import java.util.Map;
import java.util.Set;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Getter
@Setter
@Entity
@Table(name = "scrap_job")
public class ScrapJob {
  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  private String id;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "source_id", updatable = false)
  private Source source;

  @JdbcTypeCode(SqlTypes.JSON)
  @Column(columnDefinition = "jsonb")
  private Map<String, Object> config;

  @Column private ZonedDateTime createdAt;

  @OneToMany(mappedBy = "scrapJob", cascade = CascadeType.ALL, orphanRemoval = true)
  private Set<ScrapResult> results;

  // TODO: Add workerHostname to identify which worker took this job, add status and last updated to
  //   track progres, add jsonb to keep 'random' statistics as provided by scraper

  @PrePersist
  public void prePersist() {
    createdAt = ZonedDateTime.now();
  }
}
