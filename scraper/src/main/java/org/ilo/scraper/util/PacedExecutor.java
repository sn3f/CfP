package org.ilo.scraper.util;

import java.util.function.Supplier;
import lombok.Getter;

/** A simple class to ensure actions are paced with a minimum interval between their start times. */
public class PacedExecutor {
  @Getter private final long minIntervalMs;
  private long nextActionTime;

  /**
   * @param minIntervalMs The minimum time (in milliseconds) between the start of one action and the
   *     start of the next.
   */
  public PacedExecutor(long minIntervalMs) {
    this.minIntervalMs = minIntervalMs;
    this.nextActionTime = System.currentTimeMillis();
  }

  /**
   * Waits if necessary to maintain the pace, then executes the action. WARNING: This uses
   * Thread.sleep() and will block the calling thread.
   */
  public <R> R executeBlocking(Supplier<R> action) {
    try {
      long now = System.currentTimeMillis();
      long waitTime = nextActionTime - now;

      if (waitTime > 0) {
        Thread.sleep(waitTime);
      }

      nextActionTime = System.currentTimeMillis() + minIntervalMs;

      return action.get();
    } catch (InterruptedException e) {
      Thread.currentThread().interrupt();
      System.err.println("Paced executor was interrupted.");
      return null;
    }
  }
}
