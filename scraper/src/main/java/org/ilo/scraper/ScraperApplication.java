package org.ilo.scraper;

import java.util.Arrays;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.WebApplicationType;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class ScraperApplication {
  public static void main(String[] args) {
    boolean isCliMode = Arrays.stream(args).anyMatch(arg -> arg.startsWith("--mode"));

    SpringApplication app = new SpringApplication(ScraperApplication.class);

    if (isCliMode) {
      app.setAdditionalProfiles("cli");
      app.setWebApplicationType(WebApplicationType.NONE);
    } else {
      app.setAdditionalProfiles("worker");
    }

    app.run(args);
  }
}
