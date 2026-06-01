package com.rabbitrole.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.web.SecurityFilterChain;

/**
 * Local-dev security (non-aws profile): permit everything so the app runs
 * without a Cognito pool. No JWT issuer is configured here, so the build and
 * {@code ./gradlew bootRun} work fully offline. {@link com.rabbitrole.common.CurrentUser}
 * supplies a fixed local user id when no token is present.
 */
@Configuration
@EnableWebSecurity
@Profile("!aws")
public class LocalSecurityConfig {

    @Bean
    SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                .csrf(csrf -> csrf.disable())
                .authorizeHttpRequests(auth -> auth.anyRequest().permitAll());
        return http.build();
    }
}
