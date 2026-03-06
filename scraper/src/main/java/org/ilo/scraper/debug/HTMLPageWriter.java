package org.ilo.scraper.debug;

import com.microsoft.playwright.Page;
import com.microsoft.playwright.PlaywrightException;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.concurrent.atomic.AtomicInteger;
import lombok.extern.slf4j.Slf4j;

@Slf4j
public class HTMLPageWriter {
  private static final AtomicInteger fileCounter = new AtomicInteger(0);

  private HTMLPageWriter() {}

  public static void dumpPageToFile(Page pagePlay, Path resultDirectory) {
    try {
      String filePath = "dump_" + fileCounter.getAndIncrement() + ".html";
      String pageSource = pagePlay.content();
      Files.createDirectories(resultDirectory);
      Files.writeString(resultDirectory.resolve(filePath), pageSource);
      log.info("Page source successfully dumped to: {}", filePath);
    } catch (IOException e) {
      log.error("Error dumping page source to file: {}", e.getMessage());
    } catch (PlaywrightException e) {
      log.error("Error getting page content from Playwright: {}", e.getMessage());
    }
  }
}
