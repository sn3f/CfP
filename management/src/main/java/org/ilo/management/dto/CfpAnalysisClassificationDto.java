package org.ilo.management.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.Map;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.ilo.management.data.amqp.ClassificationRequestMessage;

@Data
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class CfpAnalysisClassificationDto {

  @JsonProperty("original_message")
  private ClassificationRequestMessage originalMessage;

  @JsonProperty("classification_result")
  private ClassificationResult classificationResult;

  @Data
  @NoArgsConstructor
  @AllArgsConstructor
  @JsonIgnoreProperties(ignoreUnknown = true)
  public static class ClassificationResult {
    private Boolean eligible;

    @JsonProperty("exclusion_reason")
    private String exclusionReason;

    @JsonProperty("classification_summary")
    private String classificationSummary;

    /**
     * Using a Map to handle dynamic keys for criteria. The key is the criterion name (e.g.,
     * "organization_eligibility").
     */
    private Map<String, Criterion> criteria;

    /**
     * Using Map<String, Object> to handle dynamic keys and varied value types (String, Number,
     * List<String>, null) in extracted_data.
     */
    @JsonProperty("extracted_data")
    private Map<String, Object> extractedData;

    @JsonProperty("confidence_score")
    private Double confidenceScore;

    private String deadline;
  }

  /** DTO for the individual criterion object inside the 'criteria' map. */
  @Data
  @NoArgsConstructor
  @AllArgsConstructor
  @JsonIgnoreProperties(ignoreUnknown = true)
  public static class Criterion {
    private Boolean status;
    private String evidence;
  }
}
