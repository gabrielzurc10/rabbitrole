package com.rabbitrole.jobs;

import com.rabbitrole.jobs.dto.Job;

import java.util.List;

/**
 * Builds the prompt for the "Top matches" re-rank: a precise judgment pass over the
 * coarse embedding shortlist. The model sees the resume + the numbered candidates and
 * returns the best few with a refined 0–100 score and a one-line reason. Candidates are
 * referenced by 1-based INDEX (not the JSearch id) to keep mapping robust.
 */
final class JobRerankPrompt {

    private static final int MAX_RESUME_CHARS = 6000;
    private static final int MAX_DESC_CHARS = 700;

    private JobRerankPrompt() {
    }

    static String system(int topN) {
        return """
            You are an expert technical recruiter. Given a RESUME and a numbered list of
            CANDIDATE job postings (an embedding shortlist), pick the %d that genuinely fit
            the resume best and rank them best-first. Judge on core skills, seniority, and
            relevance — ignore niche/industry specialties only some postings require.
            Return STRICT JSON:
            {"matches":[{"index":<1-based candidate number>,"score":<0-100>,"reason":"<one sentence>"}]}
            - score: how well the resume fits THAT posting (100 = exceptional).
            - reason: one concrete sentence naming what lines up and what's missing; say
              "the resume", never "the candidate".
            Return at most %d matches, best-first. JSON only, no prose.
            """.formatted(topN, topN);
    }

    static String user(String resumeText, List<Job> candidates) {
        StringBuilder list = new StringBuilder();
        for (int i = 0; i < candidates.size(); i++) {
            Job j = candidates.get(i);
            list.append("[").append(i + 1).append("] ")
                    .append(nz(j.title())).append(" @ ").append(nz(j.company())).append("\n")
                    .append(truncate(j.description(), MAX_DESC_CHARS)).append("\n\n");
        }
        return """
            RESUME:
            %s

            CANDIDATES:
            %s
            """.formatted(truncate(resumeText, MAX_RESUME_CHARS), list.toString().strip());
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
