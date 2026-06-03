package com.rabbitrole.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;

/**
 * Resource-server security for dev/prod (aws profile): every {@code /api/**}
 * call must carry a valid Cognito-issued JWT, validated against the pool's
 * issuer-uri (see application.yml). Stateless — no sessions, no CSRF, since the
 * SPA authenticates with a bearer token. The user's {@code sub} is then read by
 * {@link com.rabbitrole.common.CurrentUser} to scope data per account.
 */
@Configuration
@EnableWebSecurity
@Profile("aws")
public class SecurityConfig {

    @Bean
    SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                .cors(Customizer.withDefaults())
                .csrf(csrf -> csrf.disable())
                .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        // CORS preflight (OPTIONS) is handled by the CorsFilter above,
                        // but permit it explicitly as well so it never hits auth.
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                        .requestMatchers("/healthz", "/actuator/health", "/error").permitAll()
                        // Passwordless sign-in bootstrap runs pre-login (no token).
                        .requestMatchers(HttpMethod.POST, "/api/auth/email/start").permitAll()
                        .requestMatchers("/api/**").authenticated()
                        .anyRequest().permitAll())
                .oauth2ResourceServer(oauth -> oauth.jwt(Customizer.withDefaults()));
        return http.build();
    }
}
