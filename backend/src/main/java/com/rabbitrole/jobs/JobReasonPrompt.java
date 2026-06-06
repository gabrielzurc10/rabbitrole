package com.rabbitrole.jobs;

import com.rabbitrole.jobs.dto.ReasonRequest;

/**
 * Builds the prompt for the on-demand "why this match?" explanation. Inputs are
 * truncated so each call stays a cheap, bounded gpt-4o-mini request.
 */
final class JobReasonPrompt {

    private static final int MAX_RESUME_CHARS = 6000;
    private static final int MAX_DESC_CHARS = 2000;

    private JobReasonPrompt() {
    }

    static String system() {
        return """
            You explain, in ONE concise sentence, why the resume does or does not
            match a specific job posting. Refer to "the resume", never "the candidate".
            Ground it in concrete specifics from BOTH sides (skills, tools, seniority,
            domain) — name what lines up and what's missing. Return STRICT JSON:
            {"reasoning": "<one sentence>"}. JSON only, no prose.
            """;
    }

    static String user(String resumeText, ReasonRequest job) {
        String pct = job.matchPercent() == null ? "n/a" : job.matchPercent() + "%";
        return """
            JOB TITLE: %s
            COMPANY: %s
            CURRENT MATCH SCORE: %s

            JOB POSTING:
            %s

            RESUME:
            %s
            """.formatted(
                nz(job.title()),
                nz(job.company()),
                pct,
                truncate(job.description(), MAX_DESC_CHARS),
                truncate(resumeText, MAX_RESUME_CHARS));
    }

    private static String truncate(String s, int max) {
        if (s == null) {
            return "";
        }
        return s.length() <= max ? s : s.substring(0, max);
    }

    private static String nz(String s) {
        return s == null ? "" : s;
    }
}
