package com.rabbitrole.jobs;

import com.rabbitrole.jobs.dto.Job;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * Fetches live postings for a role and (optionally) ranks them against a resume.
 * Reused by {@code analysis} for Flavor A RAG grounding.
 */
@Service
public class JobService {

    private final AdzunaClient adzuna;
    private final MatchScorer scorer;

    public JobService(AdzunaClient adzuna, MatchScorer scorer) {
        this.adzuna = adzuna;
        this.scorer = scorer;
    }

    /** Postings for a role, unscored. */
    public List<Job> forRole(String role) {
        return adzuna.search(role);
    }

    /** Postings for a role, scored and ranked against the resume text. */
    public List<Job> matches(String role, String resumeText) {
        return scorer.score(resumeText, adzuna.search(role));
    }
}
