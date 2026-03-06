package org.ilo.management.config;

import org.aopalliance.aop.Advice;
import org.springframework.amqp.core.*;
import org.springframework.amqp.rabbit.config.RetryInterceptorBuilder;
import org.springframework.amqp.rabbit.config.SimpleRabbitListenerContainerFactory;
import org.springframework.amqp.rabbit.connection.ConnectionFactory;
import org.springframework.amqp.rabbit.retry.MessageRecoverer;
import org.springframework.amqp.rabbit.retry.RejectAndDontRequeueRecoverer;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.springframework.amqp.support.converter.MessageConverter;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.retry.backoff.ExponentialBackOffPolicy;

/**
 * Configures RabbitMQ for the results queue with a robust setup for message retries and a Dead
 * Letter Queue (DLQ).
 */
@Configuration
public class RabbitMqConfig {

  @Value("${amqp.scraper-result.queue}")
  private String scraperResultQueueName;

  @Value("${amqp.scraper-result.exchange}")
  private String scraperResultExchangeName;

  @Value("${amqp.scraper-result.routing-key}")
  private String scraperResultRoutingKey;

  @Value("${amqp.classification-result.queue}")
  private String classificationResultQueueName;

  @Value("${amqp.classification-result.exchange}")
  private String classificationResultExchangeName;

  @Value("${amqp.classification-result.routing-key}")
  private String classificationResultRoutingKey;

  @Value("${amqp.classification-result.dlq.queue}")
  private String classificationResultDeadLetterQueueName;

  @Value("${amqp.classification-result.dlq.exchange}")
  private String classificationResultDeadLetterExchangeName;

  @Value("${amqp.classification-result.dlq.routing-key}")
  private String classificationResultDeadLetterRoutingKey;

  @Value("${amqp.retry.max-attempts}")
  private int maxAttempts;

  @Value("${amqp.retry.initial-interval}")
  private long initialInterval;

  @Value("${amqp.retry.max-interval}")
  private long maxInterval;

  @Value("${amqp.retry.multiplier}")
  private double multiplier;

  @Bean
  public Queue scraperResultQueue() {
    return QueueBuilder.durable(scraperResultQueueName).build();
  }

  @Bean
  public DirectExchange scraperResultExchange() {
    return new DirectExchange(scraperResultExchangeName);
  }

  @Bean
  public Binding scraperResultBinding() {
    return BindingBuilder.bind(scraperResultQueue())
        .to(scraperResultExchange())
        .with(scraperResultRoutingKey);
  }

  @Bean
  public DirectExchange classificationResultDeadLetterExchange() {
    return new DirectExchange(classificationResultDeadLetterExchangeName);
  }

  @Bean
  public Queue classificationResultDeadLetterQueue() {
    return new Queue(classificationResultDeadLetterQueueName);
  }

  @Bean
  public Binding deadLetterBinding() {
    return BindingBuilder.bind(classificationResultDeadLetterQueue())
        .to(classificationResultDeadLetterExchange())
        .with(classificationResultDeadLetterRoutingKey);
  }

  @Bean
  public Queue classificationResultQueue() {
    return QueueBuilder.durable(classificationResultQueueName)
        .withArgument("x-dead-letter-exchange", classificationResultDeadLetterExchangeName)
        .withArgument("x-dead-letter-routing-key", classificationResultDeadLetterRoutingKey)
        .build();
  }

  @Bean
  public DirectExchange classificationResultExchange() {
    return new DirectExchange(classificationResultExchangeName);
  }

  @Bean
  public Binding classificationResultBinding() {
    return BindingBuilder.bind(classificationResultQueue())
        .to(classificationResultExchange())
        .with(classificationResultRoutingKey);
  }

  @Bean
  public MessageConverter jsonMessageConverter() {
    return new Jackson2JsonMessageConverter();
  }

  @Bean
  public MessageRecoverer rejectAndDontRequeueRecoverer() {
    return new RejectAndDontRequeueRecoverer();
  }

  @Bean
  public Advice[] retryInterceptor() {
    ExponentialBackOffPolicy backOffPolicy = new ExponentialBackOffPolicy();
    backOffPolicy.setInitialInterval(initialInterval);
    backOffPolicy.setMultiplier(multiplier);
    backOffPolicy.setMaxInterval(maxInterval);

    return new Advice[] {
      RetryInterceptorBuilder.stateless()
          .maxAttempts(maxAttempts)
          .backOffPolicy(backOffPolicy)
          .recoverer(new RejectAndDontRequeueRecoverer())
          .build()
    };
  }

  @Bean
  public SimpleRabbitListenerContainerFactory rabbitListenerContainerFactory(
      ConnectionFactory connectionFactory) {
    SimpleRabbitListenerContainerFactory factory = new SimpleRabbitListenerContainerFactory();
    factory.setConnectionFactory(connectionFactory);
    factory.setMessageConverter(jsonMessageConverter());
    factory.setAdviceChain(retryInterceptor());
    factory.setAcknowledgeMode(AcknowledgeMode.AUTO);
    return factory;
  }
}
