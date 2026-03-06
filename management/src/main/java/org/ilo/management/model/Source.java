package org.ilo.management.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.util.Map;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Getter
@Setter
@Entity
@Table(name = "cfp_source")
public class Source {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(nullable = false, unique = true)
  private String name;

  @Column(nullable = false, length = 2048)
  private String websiteUrl;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false)
  private SourceStatus status;

  @Column(nullable = false)
  private String frequency;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false)
  private ClassificationStatus classification;

  @Column(columnDefinition = "TEXT")
  private String guidelines;

  @JdbcTypeCode(SqlTypes.JSON)
  @Column(columnDefinition = "jsonb")
  private Map<String, Object> config;
}
