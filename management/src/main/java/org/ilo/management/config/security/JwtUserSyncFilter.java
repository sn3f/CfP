package org.ilo.management.config.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.time.Duration;
import java.time.Instant;
import java.util.Optional;
import org.ilo.management.model.User;
import org.ilo.management.repository.UserRepository;
import org.springframework.lang.NonNull;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
public class JwtUserSyncFilter extends OncePerRequestFilter {

  private final UserRepository userRepository;
  private static final Duration SYNC_INTERVAL = Duration.ofHours(24);

  public JwtUserSyncFilter(UserRepository userRepository) {
    this.userRepository = userRepository;
  }

  @Override
  protected void doFilterInternal(
      @NonNull HttpServletRequest request,
      @NonNull HttpServletResponse response,
      @NonNull FilterChain filterChain)
      throws ServletException, IOException {
    Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

    if (authentication != null
        && authentication.isAuthenticated()
        && authentication.getPrincipal() instanceof Jwt jwt) {
      String sub = jwt.getSubject();
      Optional<User> existingUser = userRepository.findById(sub);

      if (existingUser.isPresent()) {
        User user = existingUser.get();
        Instant lastSynced =
            user.getLastSyncedAt() != null ? user.getLastSyncedAt() : Instant.EPOCH;

        if (Instant.now().isAfter(lastSynced.plus(SYNC_INTERVAL))) {
          updateUserFromJwt(user, jwt);
          userRepository.save(user);
        }
      } else {
        User newUser = createUserFromJwt(jwt);
        userRepository.save(newUser);
      }
    }

    filterChain.doFilter(request, response);
  }

  private User createUserFromJwt(Jwt jwt) {
    User user = new User();
    user.setSub(jwt.getSubject());
    user.setName(jwt.getClaimAsString("name"));
    user.setEmail(jwt.getClaimAsString("email"));
    user.setLastSyncedAt(Instant.now());
    return user;
  }

  private void updateUserFromJwt(User user, Jwt jwt) {
    user.setName(jwt.getClaimAsString("name"));
    user.setEmail(jwt.getClaimAsString("email"));
    user.setLastSyncedAt(Instant.now());
  }
}
