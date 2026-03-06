package org.ilo.management.service.impl;

import lombok.RequiredArgsConstructor;
import org.ilo.management.service.VisitedUrlService;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class RedisVisitedUrlService implements VisitedUrlService {
  private static final String VISITED_URLS_KEY = "urls:visited";

  private final RedisTemplate<String, String> redisTemplate;

  @Override
  public void deleteUrl(String uri, String subId) {
    try {
      String value = subId + "@" + uri;
      redisTemplate.opsForSet().remove(VISITED_URLS_KEY, value);
    } catch (Exception e) {
      System.err.println("WARNING: Could not connect to Redis to delete URL. " + e.getMessage());
    }
  }
}
