package org.ilo.management.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.ilo.management.data.amqp.ScrapRequestMessage;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class ScrapRequestProducer {
  private final RabbitTemplate rabbitTemplate;
  private final ScrapJobService scrapJobService;

  @Value("${amqp.scraper-target.exchange}")
  private String scraperTargetExchange;

  @Value("${amqp.scraper-target.routing-key}")
  private String scraperTargetRoutingKey;

  public void triggerScraping(Long sourceId) {
    ScrapRequestMessage message = scrapJobService.createScrapRequest(sourceId);
    rabbitTemplate.convertAndSend(scraperTargetExchange, scraperTargetRoutingKey, message);
    log.info(
        "Message sent to exchange [{}] with routing key [{}]",
        scraperTargetExchange,
        scraperTargetRoutingKey);
  }
}
