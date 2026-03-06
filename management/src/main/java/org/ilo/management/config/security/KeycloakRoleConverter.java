package org.ilo.management.config.security;

import java.util.Collection;
import java.util.Map;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import org.springframework.core.convert.converter.Converter;
import org.springframework.lang.NonNull;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;

public class KeycloakRoleConverter implements Converter<Jwt, Collection<GrantedAuthority>> {

  @Override
  public Collection<GrantedAuthority> convert(@NonNull Jwt jwt) {
    Map<String, Object> realmAccess = jwt.getClaimAsMap("realm_access");
    Map<String, Object> resourceAccess = jwt.getClaimAsMap("resource_access");

    Stream<String> realmRoles = Stream.empty();
    if (realmAccess != null && realmAccess.get("roles") instanceof Collection) {
      realmRoles = ((Collection<String>) realmAccess.get("roles")).stream();
    }

    Stream<String> clientRoles = Stream.empty();
    if (resourceAccess != null) {
      clientRoles =
          resourceAccess.values().stream()
              .filter(client -> client instanceof Map)
              .map(client -> (Map<String, Object>) client)
              .filter(clientMap -> clientMap.get("roles") instanceof Collection)
              .flatMap(clientMap -> ((Collection<String>) clientMap.get("roles")).stream());
    }

    return Stream.concat(realmRoles, clientRoles)
        .map(roleName -> "ROLE_" + roleName.toUpperCase())
        .map(SimpleGrantedAuthority::new)
        .collect(Collectors.toList());
  }
}
