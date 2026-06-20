package com.rabbitrole.jobs.dto;

/**
 * A live job posting (from JSearch) with an optional match score. {@code matchPercent}
 * is null until scored against a resume; the description backs both matching and
 * the Flavor A RAG grounding in analysis. {@code url} is a direct link to the
 * source posting and {@code employerLogo} the company's logo URL (may be null).
 *
 * <p>{@code city}/{@code state} come from JSearch's structured location fields
 * (the free-form {@code location} string is a display fallback). {@code workMode}
 * is {@code "remote"} (from the native {@code job_is_remote} flag) or null, and
 * {@code employmentType} ({@code "full-time"}/{@code "contract"}/{@code "part-time"}/
 * {@code "internship"} / null) comes from JSearch's native {@code job_employment_types}.
 *
 * <p>{@code postedAt} is an ISO-8601 UTC instant ({@code job_posted_at_datetime_utc}),
 * {@code publisher} the source aggregator ({@code job_publisher}, e.g. "LinkedIn"), and
 * the {@code salary*} fields are JSearch's structured pay range — all are frequently
 * absent in the aggregated data, so each is nullable and rendered only when present.
 * {@code salaryPeriod} is JSearch's enum ({@code "YEAR"}/{@code "MONTH"}/{@code "HOUR"}/…)
 * and {@code salaryCurrency} an ISO currency code (e.g. "USD").
 */
public record Job(
        String id,
        String title,
        String company,
        String employerLogo,
        String location,
        String city,
        String state,
        String workMode,
        String employmentType,
        String description,
        String url,
        String postedAt,
        String publisher,
        Double salaryMin,
        Double salaryMax,
        String salaryPeriod,
        String salaryCurrency,
        Integer matchPercent,
        String reason) {

    /**
     * Backward-compatible constructor without {@code reason} (null) — used by the
     * JSearch mapping and tests, which never set a re-rank reason. {@code reason} is
     * populated only for the LLM-reranked "Top matches".
     */
    public Job(String id, String title, String company, String employerLogo, String location,
               String city, String state, String workMode, String employmentType, String description,
               String url, String postedAt, String publisher, Double salaryMin, Double salaryMax,
               String salaryPeriod, String salaryCurrency, Integer matchPercent) {
        this(id, title, company, employerLogo, location, city, state, workMode, employmentType,
                description, url, postedAt, publisher, salaryMin, salaryMax, salaryPeriod,
                salaryCurrency, matchPercent, null);
    }

    /** Returns a copy of this posting with its resume match score set (reason preserved). */
    public Job withMatch(int matchPercent) {
        return new Job(id, title, company, employerLogo, location, city, state, workMode,
                employmentType, description, url, postedAt, publisher, salaryMin, salaryMax,
                salaryPeriod, salaryCurrency, matchPercent, reason);
    }

    /** Returns a copy with a re-rank-refined score + the "why this match" reason. */
    public Job withRerank(int matchPercent, String reason) {
        return new Job(id, title, company, employerLogo, location, city, state, workMode,
                employmentType, description, url, postedAt, publisher, salaryMin, salaryMax,
                salaryPeriod, salaryCurrency, matchPercent, reason);
    }
}
