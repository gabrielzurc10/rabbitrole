package com.rabbitrole.jobs.dto;

/**
 * A live job posting (from Adzuna) with an optional match score. {@code matchPercent}
 * is null until scored against a resume; the description backs both matching and
 * the Flavor A RAG grounding in analysis.
 */
public record Job(
        String id,
        String title,
        String company,
        String location,
        String description,
        String url,
        Integer matchPercent) {

    /** Returns a copy of this posting with its resume match score set. */
    public Job withMatch(int matchPercent) {
        return new Job(id, title, company, location, description, url, matchPercent);
    }
}
