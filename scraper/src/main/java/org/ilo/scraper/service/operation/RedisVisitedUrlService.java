package org.ilo.scraper.service.operation;

import lombok.RequiredArgsConstructor;
import org.ilo.scraper.data.operation.ContentUri;
import org.springframework.context.annotation.Profile;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

@Service
@Profile("!cli")
@RequiredArgsConstructor
public class RedisVisitedUrlService implements VisitedUrlService {
  private static final String VISITED_URLS_KEY = "urls:visited";

  private final RedisTemplate<String, String> redisTemplate;

  @Override
  public boolean checkAndAdd(ContentUri uri) {
    try {
      String value = uri.subId() + "@" + uri.uri();
      Long addedCount = redisTemplate.opsForSet().add(VISITED_URLS_KEY, value);
      return addedCount != null && addedCount > 0;
    } catch (Exception e) {
      System.err.println(
          "WARNING: Could not connect to Redis. Allowing operation to proceed. " + e.getMessage());
      return true;
    }
  }

  @Override
  public boolean check(ContentUri uri) {
    try {
      String value = uri.subId() + "@" + uri.uri();
      Boolean isMember = redisTemplate.opsForSet().isMember(VISITED_URLS_KEY, value);
      return Boolean.TRUE.equals(isMember);
    } catch (Exception e) {
      System.err.println(
          "WARNING: Could not connect to Redis. Assuming URL not visited. " + e.getMessage());
      return false;
    }
  }
}
