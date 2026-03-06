package org.ilo.scraper.service.operation;

import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import org.ilo.scraper.data.operation.ContentUri;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;

@Service
@Profile("cli")
public class InMemoryVisitedUrlService implements VisitedUrlService {
  private final Set<String> visitedUrls = ConcurrentHashMap.newKeySet();

  @Override
  public boolean checkAndAdd(ContentUri uri) {
    String key = uri.subId() + "@" + uri.uri();
    return visitedUrls.add(key);
  }

  @Override
  public boolean check(ContentUri uri) {
    String key = uri.subId() + "@" + uri.uri();
    return visitedUrls.contains(key);
  }
}
