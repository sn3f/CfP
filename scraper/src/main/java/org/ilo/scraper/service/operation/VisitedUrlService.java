package org.ilo.scraper.service.operation;

import org.ilo.scraper.data.operation.ContentUri;

public interface VisitedUrlService {
  boolean checkAndAdd(ContentUri uri);

  boolean check(ContentUri uri);
}
