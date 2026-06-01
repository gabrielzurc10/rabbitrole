package com.rabbitrole.config;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.env.EnvironmentPostProcessor;
import org.springframework.core.env.ConfigurableEnvironment;
import org.springframework.core.env.MapPropertySource;
import software.amazon.awssdk.services.ssm.SsmClient;
import software.amazon.awssdk.services.ssm.model.GetParameterRequest;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Loads the OpenAI/Adzuna secrets from SSM Parameter Store into the Spring
 * Environment so {@code OpenAiClient}/{@code AdzunaClient} bind them unchanged.
 * Runs only under the aws profile (dev/prod on Lambda); locally the keys come
 * from the repo .env. Registered in META-INF/spring.factories so it runs before
 * bean creation, overriding the empty application.yml defaults.
 */
public class SsmSecretsEnvironmentPostProcessor implements EnvironmentPostProcessor {

    @Override
    public void postProcessEnvironment(ConfigurableEnvironment env, SpringApplication app) {
        if (!awsProfileActive(env)) {
            return;
        }

        String prefix = env.getProperty("SSM_PREFIX");
        if (prefix == null || prefix.isBlank()) {
            return;
        }

        Map<String, Object> resolved = new LinkedHashMap<>();
        try (SsmClient ssm = SsmClient.create()) {
            resolved.put("openai.api-key", fetch(ssm, prefix + "/openai-api-key"));
            resolved.put("adzuna.app-id", fetch(ssm, prefix + "/adzuna-app-id"));
            resolved.put("adzuna.app-key", fetch(ssm, prefix + "/adzuna-app-key"));
        }
        // addFirst → highest precedence, so it wins over the yml placeholders.
        env.getPropertySources().addFirst(new MapPropertySource("ssm-secrets", resolved));
    }

    /**
     * Group-expanded profiles ({@code dev}/{@code prod} → {@code aws}) may not be
     * resolved yet at post-process time, so also honour the raw active set the
     * Lambda passes via SPRING_PROFILES_ACTIVE.
     */
    private boolean awsProfileActive(ConfigurableEnvironment env) {
        for (String p : env.getActiveProfiles()) {
            if (p.equals("aws")) {
                return true;
            }
        }
        String active = env.getProperty("spring.profiles.active", "");
        return active.contains("aws") || active.contains("dev") || active.contains("prod");
    }

    private String fetch(SsmClient ssm, String name) {
        GetParameterRequest request = GetParameterRequest.builder()
                .name(name)
                .withDecryption(true)
                .build();
        return ssm.getParameter(request).parameter().value();
    }
}
