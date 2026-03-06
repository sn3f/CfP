package org.ilo.management.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.ilo.management.data.amqp.ScrapResultMessage;
import org.ilo.management.dto.ScrapResultDto;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class ScrapResultConsumer {

  private final ScrapResultService scrapResultService;

  @RabbitListener(queues = "${amqp.scraper-result.queue}")
  public void processScrapResult(ScrapResultMessage message) {
    log.info("Received new scrap result message for URL: {}", message.getUri());
    ScrapResultDto scrapResult = scrapResultService.acceptScrapResultMessage(message);
    scrapResultService.triggerClassificationAutomatic(scrapResult.getId());
    log.info("Successfully processed and saved scrap result for URL: {}", message.getUri());
  }
}
