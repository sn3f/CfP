package org.ilo.management.config;

import java.util.Set;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public class CurrentUser {
  // Not a record, must be open for extension to be injectable

  public static final CurrentUser ANONYMOUS =
      new CurrentUser(null, null, "Anonymous User", Set.of());

  private final String sub;
  private final String email;
  private final String name;
  private final Set<String> roles;

  public boolean isAnonymous() {
    return this.sub == null;
  }

  public boolean hasRole(String role) {
    return roles.contains(role);
  }
}
