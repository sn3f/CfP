package org.ilo.scraper.config;

import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class ExecutorServiceConfig {
  @Bean("WorkerServiceExecutor")
  public ExecutorService scrapingTaskExecutor() {
    return Executors.newSingleThreadExecutor();
  }

  @Bean("StepTaskExecutor")
  public ExecutorService stepTaskExecutor() {
    return Executors.newVirtualThreadPerTaskExecutor();
  }
}
