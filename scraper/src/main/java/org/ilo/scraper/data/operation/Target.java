package org.ilo.scraper.data.operation;

import java.util.Map;

public record Target(ContentUri target, Map<String, String> configuration) {}
