package org.ilo.scraper.config;

import java.util.HashMap;
import java.util.Map;
import org.springframework.amqp.core.*;
import org.springframework.amqp.support.converter.DefaultJackson2JavaTypeMapper;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.springframework.amqp.support.converter.MessageConverter;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class RabbitMQConfig {

  @Value("${amqp.target.exchange}")
  private String targetExchange;

  @Value("${amqp.target.queue}")
  private String targetQueue;

  @Value("${amqp.target.routing-key}")
  private String targetRoutingKey;

  @Value("${amqp.target-dlq.exchange}")
  private String targetDlqExchange;

  @Value("${amqp.target-dlq.queue}")
  private String targetDlqQueue;

  @Value("${amqp.target-dlq.routing-key}")
  private String targetDlqRoutingKey;

  @Value("${amqp.result.exchange}")
  private String resultExchange;

  @Value("${amqp.result.queue}")
  private String resultQueue;

  @Value("${amqp.result.routing-key}")
  private String resultRoutingKey;

  @Value("${amqp.result-errors.exchange}")
  private String resultErrorsExchange;

  @Value("${amqp.result-errors.queue}")
  private String resultErrorsQueue;

  @Value("${amqp.result-errors.routing-key}")
  private String resultErrorsRoutingKey;

  @Bean
  public DirectExchange targetExchange() {
    return new DirectExchange(targetExchange);
  }

  @Bean
  public DirectExchange targetDlqExchange() {
    return new DirectExchange(targetDlqExchange);
  }

  @Bean
  public DirectExchange resultExchange() {
    return new DirectExchange(resultExchange);
  }

  @Bean
  public DirectExchange resultErrorsExchange() {
    return new DirectExchange(resultErrorsExchange);
  }

  /**
   * The queue that the application consumes messages from. It's configured with a Dead Letter
   * Exchange (DLX) and a Dead Letter Routing Key. If a message from this queue is rejected or
   * nacked, it will be sent to the DLX with the specified routing key.
   */
  @Bean
  public Queue targetQueue() {
    return QueueBuilder.durable(targetQueue)
        .withArgument("x-dead-letter-exchange", targetDlqExchange)
        .withArgument("x-dead-letter-routing-key", targetDlqRoutingKey)
        .build();
  }

  /** The Dead Letter Queue for the main target queue. */
  @Bean
  public Queue targetDlqQueue() {
    return new Queue(targetDlqQueue);
  }

  @Bean
  public Queue resultQueue() {
    return new Queue(resultQueue);
  }

  @Bean
  public Queue resultErrorsQueue() {
    return new Queue(resultErrorsQueue);
  }

  @Bean
  public Binding targetBinding() {
    return BindingBuilder.bind(targetQueue()).to(targetExchange()).with(targetRoutingKey);
  }

  @Bean
  public Binding targetDlqBinding() {
    return BindingBuilder.bind(targetDlqQueue()).to(targetDlqExchange()).with(targetDlqRoutingKey);
  }

  @Bean
  public Binding resultBinding() {
    return BindingBuilder.bind(resultQueue()).to(resultExchange()).with(resultRoutingKey);
  }

  @Bean
  public Binding resultErrorsBinding() {
    return BindingBuilder.bind(resultErrorsQueue())
        .to(resultErrorsExchange())
        .with(resultErrorsRoutingKey);
  }

  @Bean
  public MessageConverter jsonMessageConverter() {
    Map<String, Class<?>> idClassMapping = new HashMap<>();
    idClassMapping.put(
        "org.ilo.management.data.amqp.ScrapRequestMessage",
        org.ilo.scraper.data.amqp.ScrapRequestMessage.class);

    DefaultJackson2JavaTypeMapper typeMapper = new DefaultJackson2JavaTypeMapper();
    typeMapper.setIdClassMapping(idClassMapping);

    Jackson2JsonMessageConverter jsonConverter = new Jackson2JsonMessageConverter();
    jsonConverter.setJavaTypeMapper(typeMapper);
    return jsonConverter;
  }
}
