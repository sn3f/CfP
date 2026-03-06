package org.ilo.scraper.data.amqp;

import java.util.Map;

/**
 * A single step during scrapping process.
 *
 * @param name The name of step.
 * @param operation The operation to perform during the Step.
 * @param configuration The operation-specific configuration.
 */
public record ScrapStep(String name, Operation operation, Map<String, String> configuration) {}
