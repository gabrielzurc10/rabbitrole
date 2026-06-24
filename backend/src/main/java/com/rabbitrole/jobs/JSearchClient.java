package com.rabbitrole.jobs;

import com.rabbitrole.common.ApiException;
import com.rabbitrole.jobs.dto.Job;
import com.rabbitrole.profiles.EmploymentType;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpServerErrorException;
import org.springframework.web.client.RestClient;

import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Fetches live job postings from JSearch, which aggregates Google for Jobs. We call
 * OpenWeb Ninja's direct API (the JSearch vendor), not the RapidAPI gateway, so the
 * key is an {@code ak_...} OpenWeb Ninja key passed via {@code x-api-key}. Third-party
 * access is isolated here so {@link JobService} works in terms of our own {@link Job}
 * record. JSearch gives direct apply links and a native remote flag — but no
 * mile-radius, so location goes in the free-text query and proximity is city/metro-level.
 */
@Component
public class JSearchClient {

    /** JSearch occasionally 5xxs; retry a few times before giving up. */
    private static final int MAX_ATTEMPTS = 3;
    private static final long RETRY_BACKOFF_MS = 600;

    private final RestClient http;
    private final String country;

    public JSearchClient(
            @Value("${jsearch.base-url}") String baseUrl,
            @Value("${jsearch.api-key}") String apiKey,
            @Value("${jsearch.country}") String country) {
        this.country = country;
        this.http = RestClient.builder()
                .baseUrl(baseUrl)
                .defaultHeader("x-api-key", apiKey)
                .defaultHeader("Accept", "application/json")
                .build();
    }

    /** Searches the first page of postings for a role (no location/type filter). */
    public List<Job> search(String role) {
        return search(role, null, false, List.of(), 1);
    }

    /**
     * Searches postings for a role, optionally near a location and/or remote.
     * {@code where} is a "City, State" string folded into the free-text query
     * (JSearch has no radius parameter, so proximity is city/metro-level).
     * {@code employmentTypes} maps to JSearch's native {@code job_employment_types}
     * request filter; empty means "any type". {@code page} is JSearch's 1-based page
     * (10 results per page), so callers paginate by bumping it.
     */
    @SuppressWarnings("unchecked")
    public List<Job> search(String role, String where, boolean remoteOnly,
                            List<EmploymentType> employmentTypes, int page) {
        Map<String, Object> response = fetchWithRetry(role, where, remoteOnly, employmentTypes, page);
        if (response == null || response.get("data") == null) {
            return List.of();
        }
        List<Map<String, Object>> raw = (List<Map<String, Object>>) response.get("data");
        // JSearch's native employment_types filter is loose for the less-common types
        // (a PARTTIME/INTERN search still pads results with pure FULLTIME postings), so
        // enforce the selection here too — multi-type aware, against the raw type list.
        return raw.stream()
                .filter(r -> matchesEmploymentTypes(r, employmentTypes))
                .map(this::toJob)
                .toList();
    }

    /**
     * Whether a raw posting matches the requested employment types. Empty selection = any
     * type; a posting with no recognised type is kept ("don't hide a maybe"); otherwise it
     * matches if ANY of its types was requested — so a "FULLTIME,PARTTIME" job is kept for a
     * part-time seeker, while a pure "FULLTIME" job is dropped.
     */
    static boolean matchesEmploymentTypes(Map<String, Object> raw, List<EmploymentType> wanted) {
        if (wanted == null || wanted.isEmpty()) {
            return true;
        }
        Set<EmploymentType> jobTypes = employmentTypesOf(raw);
        return jobTypes.isEmpty() || jobTypes.stream().anyMatch(wanted::contains);
    }

    /** Every employment type JSearch lists for a posting (the array + the singular field). */
    private static Set<EmploymentType> employmentTypesOf(Map<String, Object> raw) {
        Set<EmploymentType> types = new LinkedHashSet<>();
        if (raw.get("job_employment_types") instanceof List<?> list) {
            for (Object value : list) {
                EmploymentType type = EmploymentType.fromApi(value == null ? null : value.toString());
                if (type != null) {
                    types.add(type);
                }
            }
        }
        Object singular = raw.get("job_employment_type");
        EmploymentType type = EmploymentType.fromApi(singular == null ? null : singular.toString());
        if (type != null) {
            types.add(type);
        }
        return types;
    }

    private Map<String, Object> fetchWithRetry(String role, String where, boolean remoteOnly,
                                               List<EmploymentType> employmentTypes, int page) {
        String query = (where == null || where.isBlank()) ? role : role + " in " + where;
        // JSearch's native type filter: comma-separated enum values (e.g. "CONTRACTOR,PARTTIME").
        // Null when none picked so the param is omitted entirely ("any type"). NOTE: the
        // REQUEST param is `employment_types`; `job_employment_types` is the RESPONSE field
        // and is silently ignored as a query param (returns full-time-dominated defaults).
        String types = (employmentTypes == null || employmentTypes.isEmpty()) ? null
                : employmentTypes.stream().map(EmploymentType::apiValue).collect(Collectors.joining(","));

        RuntimeException last = null;
        for (int attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
            try {
                return http.get()
                        .uri(uriBuilder -> {
                            uriBuilder.path("/search")
                                    .queryParam("query", query)
                                    .queryParam("page", page)
                                    .queryParam("num_pages", 1)
                                    .queryParam("country", country)
                                    .queryParam("date_posted", "all")
                                    // OpenWeb Ninja uses work_from_home, not remote_jobs_only
                                    // (the latter is silently ignored on /search).
                                    .queryParam("work_from_home", remoteOnly);
                            if (types != null) {
                                uriBuilder.queryParam("employment_types", types);
                            }
                            return uriBuilder.build();
                        })
                        .retrieve()
                        .body(Map.class);
            } catch (HttpServerErrorException e) {
                // Transient 5xx — back off and retry.
                last = e;
                sleep(RETRY_BACKOFF_MS * attempt);
            } catch (RuntimeException e) {
                // Client errors / parse issues won't fix themselves; fail fast.
                throw new ApiException(HttpStatus.BAD_GATEWAY, "JSearch request failed: " + e.getMessage());
            }
        }
        throw new ApiException(HttpStatus.BAD_GATEWAY,
                "JSearch unavailable after " + MAX_ATTEMPTS + " attempts: "
                        + (last == null ? "unknown" : last.getMessage()));
    }

    private void sleep(long ms) {
        try {
            Thread.sleep(ms);
        } catch (InterruptedException ie) {
            Thread.currentThread().interrupt();
        }
    }

    private Job toJob(Map<String, Object> r) {
        String city = str(r.get("job_city"));
        String state = str(r.get("job_state"));
        boolean remote = Boolean.TRUE.equals(r.get("job_is_remote"));
        String logo = str(r.get("employer_logo"));
        return new Job(
                str(r.get("job_id")),
                str(r.get("job_title")),
                str(r.get("employer_name")),
                logo.isEmpty() ? null : logo,
                location(city, state, str(r.get("job_location")), str(r.get("job_country"))),
                city,
                state,
                remote ? "remote" : null,                       // native remote flag
                // Prefer the array, fall back to the singular string ("Full-time") — JSearch
                // often populates only one, and a missing type would otherwise slip past the
                // employment-type filter (which keeps untyped postings).
                employmentType(r.get("job_employment_types"), r.get("job_employment_type")),
                str(r.get("job_description")),
                str(r.get("job_apply_link")),    // direct link to the source posting
                nullIfEmpty(str(r.get("job_posted_at_datetime_utc"))), // ISO-8601 UTC
                nullIfEmpty(str(r.get("job_publisher"))),              // source aggregator
                dbl(r.get("job_min_salary")),
                dbl(r.get("job_max_salary")),
                nullIfEmpty(str(r.get("job_salary_period"))),          // YEAR/MONTH/HOUR/…
                nullIfEmpty(str(r.get("job_salary_currency"))),        // ISO currency code
                null);
    }

    /** Trims JSearch's frequent empty-string fields down to null so the UI can skip them. */
    private static String nullIfEmpty(String s) {
        return s == null || s.isEmpty() ? null : s;
    }

    /** A numeric JSON value (salary fields arrive as Number) as a Double, or null. */
    private static Double dbl(Object o) {
        return o instanceof Number n ? n.doubleValue() : null;
    }

    /**
     * Maps JSearch's employment type to our slug, or null. Prefers the array
     * {@code job_employment_types} (e.g. ["FULLTIME"]) — taking the first value we
     * recognise — then falls back to the singular {@code job_employment_type}
     * ("Full-time"), since a posting frequently carries only one of the two.
     */
    private static String employmentType(Object plural, Object singular) {
        if (plural instanceof List<?> list) {
            for (Object value : list) {
                EmploymentType type = EmploymentType.fromApi(value == null ? null : value.toString());
                if (type != null) {
                    return type.slug();
                }
            }
        }
        EmploymentType type = EmploymentType.fromApi(singular == null ? null : singular.toString());
        return type == null ? null : type.slug();
    }

    /**
     * Display location: structured "City, State", then JSearch's {@code job_location}
     * string, then the bare country. Verified against the live API: located jobs carry a
     * real {@code job_location} ("Austin, TX") even when city/state are null, while a
     * fully-remote posting has null city/state/country and {@code job_location} = "Anywhere"
     * — so remote jobs intentionally show "Anywhere", which is the only location JSearch has.
     */
    private static String location(String city, String state, String display, String country) {
        StringBuilder sb = new StringBuilder();
        if (!city.isEmpty()) {
            sb.append(city);
        }
        if (!state.isEmpty()) {
            if (sb.length() > 0) {
                sb.append(", ");
            }
            sb.append(state);
        }
        if (sb.length() > 0) {
            return sb.toString();
        }
        return !display.isEmpty() ? display : country;
    }

    private String str(Object o) {
        return o == null ? "" : o.toString();
    }
}
