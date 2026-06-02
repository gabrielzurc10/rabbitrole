package com.rabbitrole.jobs;

import com.rabbitrole.common.ApiException;
import com.rabbitrole.jobs.dto.Job;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpServerErrorException;
import org.springframework.web.client.RestClient;

import java.util.List;
import java.util.Map;

/**
 * Fetches live job postings from the Adzuna API. Third-party access is isolated
 * here so {@link JobService} works in terms of our own {@link Job} record.
 */
@Component
public class AdzunaClient {

    /** Adzuna's edge intermittently returns 5xx; retry a few times before giving up. */
    private static final int MAX_ATTEMPTS = 3;
    private static final long RETRY_BACKOFF_MS = 600;

    private final RestClient http;
    private final String appId;
    private final String appKey;
    private final String country;
    private final int results;

    public AdzunaClient(
            @Value("${adzuna.base-url}") String baseUrl,
            @Value("${adzuna.app-id}") String appId,
            @Value("${adzuna.app-key}") String appKey,
            @Value("${adzuna.country}") String country,
            @Value("${adzuna.results}") int results) {
        this.appId = appId;
        this.appKey = appKey;
        this.country = country;
        this.results = results;
        // Adzuna's edge (WAF) 503s clients without a real User-Agent/Accept,
        // so set them explicitly rather than relying on the Java client defaults.
        this.http = RestClient.builder()
                .baseUrl(baseUrl)
                .defaultHeader("User-Agent", "rabbitrole/0.1")
                .defaultHeader("Accept", "application/json")
                .build();
    }

    /** Searches postings for a role (no location filter); scores filled in later. */
    public List<Job> search(String role) {
        return search(role, null, null, false);
    }

    /**
     * Searches postings for a role, optionally near a location and/or remote.
     * {@code where} is a "City, State" string; {@code distanceMiles} maps to
     * Adzuna's {@code distance} param (which is in KM, so we convert). Adzuna has
     * no first-class remote flag, so {@code remoteOnly} just biases the query
     * term with "remote" — best-effort.
     */
    @SuppressWarnings("unchecked")
    public List<Job> search(String role, String where, Integer distanceMiles, boolean remoteOnly) {
        Map<String, Object> response = fetchWithRetry(role, where, distanceMiles, remoteOnly);
        if (response == null || response.get("results") == null) {
            return List.of();
        }
        List<Map<String, Object>> raw = (List<Map<String, Object>>) response.get("results");
        return raw.stream().map(this::toJob).toList();
    }

    private Map<String, Object> fetchWithRetry(String role, String where, Integer distanceMiles, boolean remoteOnly) {
        String what = remoteOnly ? role + " remote" : role;
        String whereParam = (where == null || where.isBlank()) ? null : where;
        Integer distanceKm = distanceMiles == null ? null : (int) Math.round(distanceMiles * 1.60934);

        RuntimeException last = null;
        for (int attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
            try {
                return http.get()
                        .uri(uriBuilder -> {
                            uriBuilder.path("/jobs/{country}/search/1")
                                    .queryParam("app_id", appId)
                                    .queryParam("app_key", appKey)
                                    .queryParam("what", what)
                                    .queryParam("results_per_page", results);
                            if (whereParam != null) {
                                uriBuilder.queryParam("where", whereParam);
                            }
                            if (distanceKm != null) {
                                uriBuilder.queryParam("distance", distanceKm);
                            }
                            return uriBuilder.build(country);
                        })
                        .retrieve()
                        .body(Map.class);
            } catch (HttpServerErrorException e) {
                // Transient Adzuna 5xx — back off and retry.
                last = e;
                sleep(RETRY_BACKOFF_MS * attempt);
            } catch (RuntimeException e) {
                // Client errors / parse issues won't fix themselves; fail fast.
                throw new ApiException(HttpStatus.BAD_GATEWAY, "Adzuna request failed: " + e.getMessage());
            }
        }
        throw new ApiException(HttpStatus.BAD_GATEWAY,
                "Adzuna unavailable after " + MAX_ATTEMPTS + " attempts: "
                        + (last == null ? "unknown" : last.getMessage()));
    }

    private void sleep(long ms) {
        try {
            Thread.sleep(ms);
        } catch (InterruptedException ie) {
            Thread.currentThread().interrupt();
        }
    }

    @SuppressWarnings("unchecked")
    private Job toJob(Map<String, Object> r) {
        Map<String, Object> company = (Map<String, Object>) r.getOrDefault("company", Map.of());
        Map<String, Object> location = (Map<String, Object>) r.getOrDefault("location", Map.of());
        return new Job(
                String.valueOf(r.get("id")),
                str(r.get("title")),
                str(company.get("display_name")),
                str(location.get("display_name")),
                str(r.get("description")),
                str(r.get("redirect_url")),
                null);
    }

    private String str(Object o) {
        return o == null ? "" : o.toString();
    }
}
