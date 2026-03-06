package org.ilo.scraper;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.microsoft.playwright.Page;
import com.microsoft.playwright.options.WaitUntilState;
import java.nio.file.Path;
import java.util.Arrays;
import java.util.List;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.ilo.scraper.data.amqp.ScrapTarget;
import org.ilo.scraper.debug.HTMLPageWriter;
import org.ilo.scraper.debug.TerminalResultWriter;
import org.ilo.scraper.service.ScrapingRunner;
import org.ilo.scraper.service.web.BrowserFactory;
import org.ilo.scraper.service.web.BrowserPage;
import org.ilo.scraper.service.web.ElementScraper;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@Profile("cli")
@RequiredArgsConstructor
public class CliRunner implements ApplicationRunner {

  private final ScrapingRunner scrapingRunner;
  private final TerminalResultWriter terminalResultWriter;
  private final ObjectMapper objectMapper;

  private final BrowserFactory browserFactory;
  private final ElementScraper elementScraper;

  private static final String MODE_RUN_TARGET = "run-target";
  private static final String MODE_REMOVE_BOILERPLATE = "remove-boilerplate";

  @Override
  public void run(ApplicationArguments args) throws Exception {
    log.info("Application starting in CLI mode.");

    if (!args.containsOption("mode")) {
      printGlobalUsage();
      System.exit(1);
    }

    String mode = args.getOptionValues("mode").getFirst();

    try {
      switch (mode) {
        case MODE_RUN_TARGET:
          runTargetMode(args);
          break;

        case MODE_REMOVE_BOILERPLATE:
          runBoilerplateMode(args);
          break;

        default:
          log.error("Unknown mode: {}", mode);
          printGlobalUsage();
          System.exit(1);
      }
    } catch (Exception e) {
      log.error("An error occurred during CLI processing for mode '{}'.", mode, e);
      System.exit(1);
    }

    log.info("CLI execution finished. Exiting.");
    System.exit(0);
  }

  private void runTargetMode(ApplicationArguments args) throws Exception {
    log.info("Running in '{}' mode.", MODE_RUN_TARGET);
    checkRequiredArgs(args, MODE_RUN_TARGET, "jsonMessage", "outputDir");

    String jsonMessage = args.getOptionValues("jsonMessage").getFirst();
    String outputDir = args.getOptionValues("outputDir").getFirst();

    log.info("Input JSON: {}", jsonMessage);
    log.info("Output Directory: {}", outputDir);

    ScrapTarget scrapTarget = objectMapper.readValue(jsonMessage, ScrapTarget.class);

    final AtomicInteger fileCounter = new AtomicInteger(0);

    scrapingRunner
        .processTarget(scrapTarget)
        .doOnNext(
            result ->
                terminalResultWriter.writePageToFile(
                    result, Path.of(outputDir), fileCounter.getAndIncrement()))
        .subscribe();

    log.info("Successfully processed message for mode '{}'.", MODE_RUN_TARGET);
  }

  private void runBoilerplateMode(ApplicationArguments args) throws Exception {
    log.info("Running in '{}' mode.", MODE_REMOVE_BOILERPLATE);
    checkRequiredArgs(args, MODE_REMOVE_BOILERPLATE, "url", "outputDir");

    String url = args.getOptionValues("url").getFirst();
    String selector =
        args.containsOption("selector") ? args.getOptionValues("selector").getFirst() : null;
    String outputDir = args.getOptionValues("outputDir").getFirst();

    log.info("Input URL: {}", url);
    log.info("Output Directory: {}", outputDir);

    try (BrowserPage browserPage = browserFactory.newPage()) {
      browserPage
          .page()
          .navigate(url, new Page.NavigateOptions().setWaitUntil(WaitUntilState.NETWORKIDLE));

      if (!elementScraper.removeBoilerplate(browserPage.page(), selector)) {
        log.error("The removeBoilerplate failed.");
      }

      HTMLPageWriter.dumpPageToFile(browserPage.page(), Path.of(outputDir));
    }

    log.info("Successfully processed URL for mode '{}'.", MODE_REMOVE_BOILERPLATE);
  }

  private void printGlobalUsage() {
    log.error("Missing required argument: --mode=<mode_name>");
    log.error("Available modes:");
    log.error(
        "  --mode={} : Processes a full ScrapTarget JSON. Requires --jsonMessage and --outputDir",
        MODE_RUN_TARGET);
    log.error(
        "  --mode={} : Removes boilerplate from a URL. Requires --url and --outputDir",
        MODE_REMOVE_BOILERPLATE);
    log.error("  ... (add other modes here)");
  }

  private void checkRequiredArgs(ApplicationArguments args, String mode, String... optionNames) {
    List<String> missingArgs =
        Arrays.stream(optionNames)
            .filter(opt -> !args.containsOption(opt))
            .collect(Collectors.toList());

    if (!missingArgs.isEmpty()) {
      log.error("Missing required arguments for mode '{}': {}", mode, missingArgs);
      log.error(
          "Usage for mode '{}': java -jar app.jar --mode={} {}",
          mode,
          mode,
          Arrays.stream(optionNames)
              .map(opt -> String.format("--%s=...", opt))
              .collect(Collectors.joining(" ")));
      System.exit(1);
    }
  }
}
