package org.ilo.scraper.data.amqp;

import java.net.URI;
import java.util.List;

/**
 * The RabbitMQ message that contains initial request for scrapping work.
 *
 * <p>It contains root URI and a list of steps. During each step an Operation is performed.
 * Intermediate steps perform intermediate operations, the last step performs terminal operation.
 * Each step comes with operation-specific configuration.
 *
 * @param rootUri The initial page to load.
 * @param steps The ordered list of operations to perform.
 */
public record ScrapTarget(URI rootUri, List<ScrapStep> steps) {}
