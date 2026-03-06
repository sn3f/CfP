package org.ilo.management.config.security;

import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.security.oauth2.server.resource.web.authentication.BearerTokenAuthenticationFilter;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
@RequiredArgsConstructor
public class SecurityConfig {

  private final JwtUserSyncFilter jwtUserSyncFilter;

  @Bean
  public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
    JwtAuthenticationConverter keycloakJwtAuthenticationConverter =
        new JwtAuthenticationConverter();
    keycloakJwtAuthenticationConverter.setJwtGrantedAuthoritiesConverter(
        new KeycloakRoleConverter());

    http.authorizeHttpRequests(
            authorize ->
                authorize
                    .requestMatchers("/actuator/health/readiness", "/actuator/health/liveness")
                    .permitAll()
                    .anyRequest()
                    .authenticated())
        .oauth2ResourceServer(
            oauth2 ->
                oauth2.jwt(
                    jwt -> jwt.jwtAuthenticationConverter(keycloakJwtAuthenticationConverter)))
        .addFilterAfter(jwtUserSyncFilter, BearerTokenAuthenticationFilter.class);

    return http.build();
  }
}
