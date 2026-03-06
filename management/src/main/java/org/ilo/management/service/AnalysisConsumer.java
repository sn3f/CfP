package org.ilo.management.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.ilo.management.dto.CfpAnalysisClassificationDto;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class AnalysisConsumer {
  private final AnalysisService analysisService;

  /**
   * Listens for messages on the specified queue, deserializes the JSON payload into a
   * CfpAnalysisClassificationDto, and processes it using the CfpAnalysisService.
   *
   * @param cfpDto The deserialized message payload.
   */
  @RabbitListener(queues = "${amqp.classification-result.queue}", returnExceptions = "true")
  public void processCfpAnalysis(CfpAnalysisClassificationDto cfpDto) {
    log.info("Received new CFP analysis message for URL: {}", cfpDto.getOriginalMessage().getUrl());
    analysisService.createAnalysis(cfpDto);
    log.info(
        "Successfully processed and saved CFP analysis for URL: {}",
        cfpDto.getOriginalMessage().getUrl());
  }
}
