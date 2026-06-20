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
            You are an expert resume reviewer. Critique the resume for the TARGET ROLE,
            using the provided postings only as a guide to what the role GENERALLY demands.
            Return STRICT JSON:
            {"subScores":{"skills":<0-100>,"experience":<0-100>,"impact":<0-100>,"clarity":<0-100>},
             "missingSkills":[<string>],
             "tags":[{"severity","message","reason","suggestion","location"}]}

            Judge the resume against the CORE, transferable competencies of the role — the
            skills, tools, and qualifications common to MOST postings for it. The postings
            are a small live SAMPLE and may include niche or industry-specific openings.
            Do NOT critique the resume for lacking:
            - a domain/industry specialization that only some postings happen to require
              (e.g. defense/military, robotics, healthcare, finance, a specific product),
            - a security clearance, certification, or company/tool-specific experience that
              is not standard for the role,
            - any one-off requirement that appears in only a single sampled posting.
            Flag a missing skill ONLY if it is genuinely standard for this role across the
            board — never penalize a candidate for not matching a narrow specialty.

            - subScores: rate each dimension 0-100 for fit to the role's CORE expectations
              (100 = exceptional, 0 = no fit). Be discerning but don't dock for niche gaps:
              - skills: coverage of the core skills/tools the role demands.
              - experience: relevance and seniority of the work history for the role.
              - impact: use of quantified outcomes (numbers, scale, results) vs vague duties.
              - clarity: structure, concision, and ATS-friendly formatting/wording.
            - missingSkills: up to 6 concrete skills/tools that are STANDARD for this role
              and absent or weak in the resume. Omit niche specialties. [] if none.
            - severity is one of: CRITICAL, WARNING, OPTIONAL.
            - CRITICAL: likely to get the resume rejected. WARNING: notably weakens it.
              OPTIONAL: nice-to-have polish.
            - message: the issue, short. reason: why it matters for the role's core
              expectations. suggestion: a concrete rewrite or action.
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

            SAMPLE LIVE POSTINGS FOR THIS ROLE — a guide to the role's COMMON demand only.
            Some may be niche/industry-specific; ignore any specialty not core to the role:
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
