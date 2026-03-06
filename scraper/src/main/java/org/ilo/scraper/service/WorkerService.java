package org.ilo.scraper.service;

import static org.ilo.scraper.data.amqp.ScrapResultMessage.ScrapResultAttachment.ContentType.BASE64;
import static org.ilo.scraper.data.amqp.ScrapResultMessage.ScrapResultAttachment.ContentType.MARKDOWN;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.rabbitmq.client.Channel;
import java.io.IOException;
import java.net.URI;
import java.util.Objects;
import java.util.concurrent.ExecutorService;
import lombok.extern.slf4j.Slf4j;
import org.ilo.scraper.data.amqp.ScrapRequestMessage;
import org.ilo.scraper.data.amqp.ScrapResultMessage;
import org.ilo.scraper.data.amqp.ScrapTarget;
import org.ilo.scraper.data.operation.Attachment;
import org.ilo.scraper.data.operation.result.TerminalResult;
import org.springframework.amqp.core.Message;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.amqp.rabbit.listener.MessageListenerContainer;
import org.springframework.amqp.rabbit.listener.RabbitListenerEndpointRegistry;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@Profile("!cli")
public class WorkerService {

  private static final String LISTENER_ID = "WorkerServiceListener";

  private final ObjectMapper objectMapper;
  private final RabbitListenerEndpointRegistry registry;
  private final RabbitTemplate rabbitTemplate;
  private final ExecutorService serviceWorkExecutor;
  private final ScrapingRunner scrapingRunner;

  @Value("${amqp.target.queue}")
  private String targetQueue;

  @Value("${amqp.result.exchange}")
  private String resultExchange;

  @Value("${amqp.result.routing-key}")
  private String resultRoutingKey;

  private volatile boolean isProcessing = false;

  public WorkerService(
      ObjectMapper objectMapper,
      RabbitListenerEndpointRegistry registry,
      RabbitTemplate rabbitTemplate,
      @Qualifier("WorkerServiceExecutor") ExecutorService serviceWorkExecutor,
      ScrapingRunner scrapingRunner) {
    this.objectMapper = objectMapper;
    this.registry = registry;
    this.rabbitTemplate = rabbitTemplate;
    this.serviceWorkExecutor = serviceWorkExecutor;
    this.scrapingRunner = scrapingRunner;
  }

  @RabbitListener(
      id = LISTENER_ID,
      queues = "${amqp.target.queue}",
      ackMode = "MANUAL",
      concurrency = "1")
  public void onMessage(Message message, Channel channel) throws IOException {
    long deliveryTag = message.getMessageProperties().getDeliveryTag();
    String messageBody = new String(message.getBody());

    log.info("Received Target message {}", objectMapper.writeValueAsString(messageBody));

    if (isProcessing) {
      log.error(
          "Worker unexpectedly received a message while already busy. Rejecting message: {}",
          messageBody);
      channel.basicReject(deliveryTag, true);
      return;
    }

    try {
      channel.basicAck(deliveryTag, false);
      log.info("Message ACKed immediately. Starting long task...");

      isProcessing = true;
      stopListenerContainer();
      serviceWorkExecutor.submit(() -> doWork(messageBody));
    } catch (Exception e) {
      log.error("Failed to process message or stop listener", e);
      if (!isProcessing) {
        startListenerContainer();
      }
    }
  }

  private void doWork(String messageBody) {
    try {
      ScrapRequestMessage scrapRequestMessage =
          objectMapper.readValue(messageBody, ScrapRequestMessage.class);

      // TODO: Send Progress Start message from here

      scrapingRunner
          .processTarget(
              new ScrapTarget(
                  URI.create(scrapRequestMessage.getRootUri()),
                  scrapRequestMessage.getConfiguration().getSteps()))
          .doOnNext(
              result ->
                  rabbitTemplate.convertAndSend(
                      resultExchange,
                      resultRoutingKey,
                      newScrapResultMessage(scrapRequestMessage, result)))
          .subscribe();

    } catch (JsonProcessingException e) {
      log.error("Failed to deserialize JSON message {}", messageBody, e);
    } finally {
      // TODO: Send Progress Complete message from here

      isProcessing = false;
      startListenerContainer();
      log.info("Listener restarted. Ready for next message.");
    }
  }

  private void stopListenerContainer() {
    MessageListenerContainer container = registry.getListenerContainer(LISTENER_ID);
    if (container != null && container.isRunning()) {
      log.info("Stopping listener container...");
      container.stop();
    }
  }

  private void startListenerContainer() {
    MessageListenerContainer container = registry.getListenerContainer(LISTENER_ID);
    if (container != null && !container.isRunning()) {
      log.info("Starting listener container...");
      container.start();
    }
  }

  private ScrapResultMessage newScrapResultMessage(
      ScrapRequestMessage scrapRequestMessage, TerminalResult result) {
    return new ScrapResultMessage(
        scrapRequestMessage.getExecutionId(),
        result.pageMarkdown().contentLocation().uri().toASCIIString(),
        result.pageMarkdown().contentLocation().subId(),
        result.pageMarkdown().contentMarkdown(),
        result.attachments().stream()
            .map(
                att -> {
                  if (att instanceof Attachment.ScrapedPageAttachment scrapedPageAttachment) {
                    return new ScrapResultMessage.ScrapResultAttachment(
                        scrapedPageAttachment.attachmentUri().label(),
                        scrapedPageAttachment.attachmentUri().uri().toString(),
                        scrapedPageAttachment.attachmentUri().subId(),
                        MARKDOWN,
                        scrapedPageAttachment.markdownContent());
                  } else if (att instanceof Attachment.FileAttachment fileAttachment) {
                    return new ScrapResultMessage.ScrapResultAttachment(
                        fileAttachment.attachmentUri().label(),
                        fileAttachment.attachmentUri().uri().toString(),
                        fileAttachment.attachmentUri().subId(),
                        BASE64,
                        fileAttachment.base64Content());
                  } else {
                    return null;
                  }
                })
            .filter(Objects::nonNull)
            .toList());
  }
}
