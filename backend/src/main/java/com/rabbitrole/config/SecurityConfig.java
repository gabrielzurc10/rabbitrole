package com.rabbitrole.config;

import static org.springframework.security.web.util.matcher.AntPathRequestMatcher.antMatcher;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.session.NullAuthenticatedSessionStrategy;

/**
 * Resource-server security for dev/prod (aws profile): every {@code /api/**}
 * call must carry a valid Cognito-issued JWT, validated against the pool's
 * issuer-uri (see application.yml). Stateless — no sessions, no CSRF, since the
 * SPA authenticates with a bearer token. The user's {@code sub} is then read by
 * {@link com.rabbitrole.common.CurrentUser} to scope data per account.
 *
 * <p>Matchers use {@code antMatcher(...)} (AntPathRequestMatcher) rather than the
 * default String form. On Lambda the app runs inside aws-serverless-java-container's
 * servlet-less MVC, where {@code ServletRegistration.getMappings()} is null; a String
 * {@code requestMatchers} would resolve to an MvcRequestMatcher and pull in Spring
 * Security's HandlerMappingIntrospector cache filter, which NPEs on that null. Ant
 * matchers are path-based and skip the introspector entirely.
 */
@Configuration
@EnableWebSecurity
@Profile("aws")
public class SecurityConfig {

    @Bean
    SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                // CORS is handled by API Gateway in the deployed env (the serverless
                // runtime doesn't reliably emit the app's CorsFilter headers).
                .csrf(csrf -> csrf.disable())
                .sessionManagement(s -> s
                        .sessionCreationPolicy(SessionCreationPolicy.STATELESS)
                        // The serverless servlet has no sessions and its changeSessionId()
                        // throws UnsupportedOperationException; a no-op strategy stops Spring
                        // Security's session-fixation step from calling it on each authenticated
                        // request (which 500s the call).
                        .sessionAuthenticationStrategy(new NullAuthenticatedSessionStrategy()))
                .authorizeHttpRequests(auth -> auth
                        // CORS preflight (OPTIONS) is answered by API Gateway and won't
                        // reach Lambda, but permit it so it never hits auth if it does.
                        .requestMatchers(antMatcher(HttpMethod.OPTIONS, "/**")).permitAll()
                        .requestMatchers(antMatcher("/healthz"), antMatcher("/actuator/health"), antMatcher("/error")).permitAll()
                        // Passwordless sign-in bootstrap runs pre-login (no token).
                        .requestMatchers(antMatcher(HttpMethod.POST, "/api/auth/email/start")).permitAll()
                        .requestMatchers(antMatcher("/api/**")).authenticated()
                        .anyRequest().permitAll())
                // Stateless JWT API: disable the saved-request cache, whose default
                // HttpSessionRequestCache would also reach for the unsupported servlet session.
                .requestCache(rc -> rc.disable())
                .oauth2ResourceServer(oauth -> oauth.jwt(Customizer.withDefaults()));
        return http.build();
    }
}
