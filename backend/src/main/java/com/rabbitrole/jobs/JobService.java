package com.rabbitrole.jobs;

import com.rabbitrole.jobs.dto.Job;
import com.rabbitrole.profiles.Profile;
import com.rabbitrole.profiles.WorkMode;
import org.springframework.stereotype.Service;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Fetches live postings for a role and (optionally) ranks them against a resume.
 * Reused by {@code analysis} for Flavor A RAG grounding.
 */
@Service
public class JobService {

    /** Bound total Adzuna calls per profile request so fan-out stays cheap. */
    private static final int MAX_QUERIES = 8;

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

    /**
     * Postings matching the whole profile: every target role × (each city for
     * HYBRID/IN_PERSON, or a remote search for REMOTE), merged + deduped by id,
     * then ranked against the resume. Each query is best-effort — a failing one
     * is skipped rather than failing the request.
     */
    public List<Job> forProfile(Profile profile, String resumeText) {
        Map<String, Job> merged = new LinkedHashMap<>();
        int queries = 0;

        outer:
        for (String role : profile.targetRoles()) {
            for (List<Job> batch : queriesFor(role, profile)) {
                if (queries++ >= MAX_QUERIES) {
                    break outer;
                }
                for (Job job : batch) {
                    merged.putIfAbsent(job.id(), job);
                }
            }
        }

        List<Job> jobs = List.copyOf(merged.values());
        if (resumeText == null || resumeText.isBlank() || jobs.isEmpty()) {
            return jobs; // unscored when there's no resume to rank against
        }
        return scorer.score(resumeText, jobs);
    }

    /** The Adzuna result batches to fetch for one role given the work mode. */
    private List<List<Job>> queriesFor(String role, Profile profile) {
        boolean remote = profile.workMode() == WorkMode.REMOTE
                || profile.cities() == null || profile.cities().isEmpty();
        if (remote) {
            return List.of(safeSearch(role, null, null, true));
        }
        return profile.cities().stream()
                .map(c -> safeSearch(role, c.city() + ", " + c.state(), c.distanceMiles(), false))
                .toList();
    }

    private List<Job> safeSearch(String role, String where, Integer distanceMiles, boolean remote) {
        try {
            return adzuna.search(role, where, distanceMiles, remote);
        } catch (RuntimeException e) {
            return List.of();
        }
    }
}
