package com.rabbitrole.analysis;

import com.rabbitrole.jobs.dto.Job;

import java.util.List;
import java.util.stream.Collectors;

/**
 * Builds the critique prompt. Flavor A RAG: the resume is graded against what
 * live postings for the target role actually ask for, so feedback is grounded
 * in real demand rather than generic advice.
 */
final class AnalysisPrompt {

    /** Cap grounding + resume text so the prompt stays cheap and within limits. */
    private static final int MAX_RESUME_CHARS = 6000;
    private static final int MAX_JOB_CHARS = 800;
    private static final int MAX_JOBS = 5;

    private AnalysisPrompt() {
    }

    static String system() {
        return """
            You are an expert technical resume reviewer. Critique the resume for the
            target role, grounded in the real job postings provided. Return STRICT JSON:
            {"tags":[{"severity","message","reason","suggestion","location"}]}
            - severity is one of: CRITICAL, WARNING, OPTIONAL.
            - CRITICAL: likely to get the resume rejected. WARNING: notably weakens it.
              OPTIONAL: nice-to-have polish.
            - message: the issue, short. reason: why it matters for THIS role, citing
              what the postings expect. suggestion: a concrete rewrite or action.
            - location: the resume section or a short quoted snippet it applies to.
            Return 5-12 tags, ordered most to least important. JSON only, no prose.
            """;
    }

    static String user(String role, String resumeText, List<Job> groundingJobs) {
        String resume = truncate(resumeText, MAX_RESUME_CHARS);
        String postings = groundingJobs.stream()
                .limit(MAX_JOBS)
                .map(j -> "- " + j.title() + " @ " + j.company() + "\n"
                        + truncate(j.description(), MAX_JOB_CHARS))
                .collect(Collectors.joining("\n\n"));
        if (postings.isBlank()) {
            postings = "(no live postings available — use general expectations for the role)";
        }

        return """
            TARGET ROLE: %s

            LIVE JOB POSTINGS FOR THIS ROLE (grounding):
            %s

            RESUME:
            %s
            """.formatted(role, postings, resume);
    }

    private static String truncate(String s, int max) {
        if (s == null) {
            return "";
        }
        return s.length() <= max ? s : s.substring(0, max);
    }
}
