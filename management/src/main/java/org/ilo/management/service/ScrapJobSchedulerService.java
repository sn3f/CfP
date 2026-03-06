package org.ilo.management.service;

import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ScheduledFuture;
import lombok.extern.slf4j.Slf4j;
import org.ilo.management.model.Source;
import org.ilo.management.model.SourceStatus;
import org.ilo.management.repository.SourceRepository;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.scheduling.TaskScheduler;
import org.springframework.scheduling.support.CronTrigger;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
public class ScrapJobSchedulerService implements ApplicationRunner {

  private final SourceRepository sourceRepository;
  private final TaskScheduler taskScheduler;
  private final ScrapRequestProducer scrapRequestProducer;

  // Map to store running tasks: Key is the Source ID, Value is the ScheduledFuture
  private final Map<Long, ScheduledFuture<?>> scheduledTasks = new ConcurrentHashMap<>();

  public ScrapJobSchedulerService(
      SourceRepository sourceRepository,
      @Qualifier("ScrapJobScheduler") TaskScheduler taskScheduler,
      ScrapRequestProducer scrapRequestProducer) {
    this.sourceRepository = sourceRepository;
    this.taskScheduler = taskScheduler;
    this.scrapRequestProducer = scrapRequestProducer;
  }

  private Runnable createTask(Source source) {
    return () -> {
      log.info("Executing Source scrapping for: {}", source.getName());
      scrapRequestProducer.triggerScraping(source.getId());
    };
  }

  public void scheduleTask(Source source) {
    ScheduledFuture<?> existingFuture = scheduledTasks.get(source.getId());
    if (existingFuture != null && !existingFuture.isDone()) {
      existingFuture.cancel(false);
      log.warn("Cancelled existing task for source: {}", source.getName());
    }

    if (source.getStatus() == SourceStatus.INACTIVE) {
      log.info("Inactive Source: {}", source.getName());
      return;
    }

    try {
      Runnable taskRunnable = createTask(source);
      CronTrigger trigger = new CronTrigger(source.getFrequency());

      ScheduledFuture<?> future = taskScheduler.schedule(taskRunnable, trigger);

      scheduledTasks.put(source.getId(), future);

      log.info(
          "Successfully scheduled/rescheduled task for source: {} with CRON: {}",
          source.getName(),
          source.getFrequency());
    } catch (IllegalArgumentException e) {
      log.error(
          "Failed to schedule task for source: {} due to invalid CRON expression: {}",
          source.getName(),
          source.getFrequency(),
          e);
      scheduledTasks.remove(source.getId());
    }
  }

  public void cancelTask(Long sourceId) {
    ScheduledFuture<?> future = scheduledTasks.remove(sourceId);
    if (future != null) {
      future.cancel(true);
      log.warn("Cancelled and removed scheduled task for source ID: {}", sourceId);
    }
  }

  @Transactional(readOnly = true)
  public void scheduleAllTasks() {
    log.info("Attempting to load sources and schedule all tasks from the database...");
    List<Source> tasks = sourceRepository.findAllByStatus(SourceStatus.ACTIVE);

    scheduledTasks.values().forEach(future -> future.cancel(false));
    scheduledTasks.clear();

    tasks.forEach(this::scheduleTask);
    log.info("Total tasks scheduled: {}", tasks.size());
  }

  @Override
  public void run(ApplicationArguments args) {
    this.scheduleAllTasks();
  }
}
