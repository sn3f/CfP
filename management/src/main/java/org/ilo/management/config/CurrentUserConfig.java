package org.ilo.management.config;

import static java.util.stream.Collectors.toSet;

import java.util.Set;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Scope;
import org.springframework.context.annotation.ScopedProxyMode;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.context.WebApplicationContext;

@Configuration
public class CurrentUserConfig {

  @Bean
  @Scope(value = WebApplicationContext.SCOPE_REQUEST, proxyMode = ScopedProxyMode.TARGET_CLASS)
  public CurrentUser currentUser() {
    Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

    if (authentication != null && authentication.getPrincipal() instanceof Jwt jwt) {
      Set<String> roles =
          authentication.getAuthorities().stream()
              .map(GrantedAuthority::getAuthority)
              .collect(toSet());

      return new CurrentUser(
          jwt.getSubject(), jwt.getClaimAsString("email"), jwt.getClaimAsString("name"), roles);
    }

    return CurrentUser.ANONYMOUS;
  }
}
