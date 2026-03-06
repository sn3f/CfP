package org.ilo.management.service;

import static java.util.Optional.ofNullable;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.ilo.management.data.amqp.ClassificationRequestMessage;
import org.ilo.management.dto.AnalysisJobDto;
import org.ilo.management.dto.ScrapJobDto;
import org.ilo.management.dto.SourceDto;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class ClassificationRequestProducer {
  private final RabbitTemplate rabbitTemplate;
  private final AnalysisJobService analysisJobService;

  @Value("${amqp.classification-target.exchange}")
  private String classificationTargetExchange;

  @Value("${amqp.classification-target.routing-key}")
  private String classificationTargetRoutingKey;

  public AnalysisJobDto triggerClassification(Long scrapResultId) {
    AnalysisJobDto analysisJob = analysisJobService.createAnalysisJob(scrapResultId);

    log.info(
        "Creating AnalysisJob for scrap result {}-{}",
        ofNullable(analysisJob.getScrapResult().getScrapJob())
            .map(ScrapJobDto::getSource)
            .map(SourceDto::getName)
            .orElse("unknown"),
        analysisJob.getScrapResult().getTimestamp());

    ClassificationRequestMessage message =
        new ClassificationRequestMessage(
            analysisJob.getId(),
            analysisJob.getScrapResult().getId().toString(),
            analysisJob.getScrapResult().getUrl(),
            analysisJob.getScrapResult().getSubId(),
            analysisJob.getScrapResult().getPromptContext());

    rabbitTemplate.convertAndSend(
        classificationTargetExchange, classificationTargetRoutingKey, message);
    log.info(
        "Message sent to exchange [{}] with routing key [{}]",
        classificationTargetExchange,
        classificationTargetRoutingKey);

    return analysisJob;
  }
}
