package org.ilo.management.model;

import jakarta.persistence.*;
import java.time.ZonedDateTime;
import java.util.List;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "scrap_result")
public class ScrapResult {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "scrap_job_id", updatable = false)
  private ScrapJob scrapJob;

  @Column(length = 2048)
  private String url;

  @Column(columnDefinition = "TEXT")
  private String content;

  @Column(columnDefinition = "TEXT")
  private String promptContext;

  private ZonedDateTime timestamp;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false)
  private ScrapResultStatus status;

  private String subId;

  @OneToMany(mappedBy = "scrapResult", cascade = CascadeType.ALL, orphanRemoval = true)
  private List<ScrapAttachment> attachments;
}
