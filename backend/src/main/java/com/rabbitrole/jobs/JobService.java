package com.rabbitrole.jobs;

import com.rabbitrole.jobs.dto.Job;
import com.rabbitrole.profiles.CityPreference;
import com.rabbitrole.profiles.EmploymentType;
import com.rabbitrole.profiles.Profile;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Fetches live postings for a role and (optionally) ranks them against a resume.
 * Reused by {@code analysis} for Flavor A RAG grounding. Both filter dimensions are
 * now native to JSearch — remote (the {@code remote_jobs_only} search) and employment
 * type — so there's no LLM classification step.
 */
@Service
public class JobService {

    /** Bound total JSearch calls per profile request — its free tier is small. */
    private static final int MAX_QUERIES = 6;

    private final JSearchClient client;
    private final MatchScorer scorer;

    public JobService(JSearchClient client, MatchScorer scorer) {
        this.client = client;
        this.scorer = scorer;
    }

    /** Postings for a role, unscored. */
    public List<Job> forRole(String role) {
        return client.search(role);
    }

    /** Postings for a role, scored and ranked against the resume text. */
    public List<Job> matches(String role, String resumeText) {
        return scorer.score(resumeText, client.search(role));
    }

    /**
     * Postings matching the whole profile: every target role × (a remote search when
     * {@code remote}, else each city), merged + deduped, filtered to the chosen
     * employment types, then ranked against the resume. We search the bare role so the
     * candidate pool stays broad. Each query is best-effort.
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
                    // Dedupe on content, not the source's id: the same posting is often
                    // cross-listed (e.g. across cities, or reposted) under different ids.
                    merged.putIfAbsent(dedupKey(job), job);
                }
            }
        }

        List<Job> jobs = filterToProfile(new ArrayList<>(merged.values()), profile);
        if (resumeText == null || resumeText.isBlank() || jobs.isEmpty()) {
            return jobs; // unscored when there's no resume to rank against
        }
        return scorer.score(resumeText, jobs);
    }

    /**
     * The JSearch result batches to fetch for one role given the profile. Remote
     * eligibility is location-agnostic: JSearch returns "Anywhere" postings with no
     * city/state, so a per-city search can't narrow them. A remote search is therefore a
     * single global query; only a non-remote search fans out per city (or all locations).
     */
    private List<List<Job>> queriesFor(String role, Profile profile) {
        List<EmploymentType> types = profile.employmentTypes();
        List<List<Job>> batches = new ArrayList<>();
        if (profile.remote()) {
            batches.add(safeSearch(role, null, true, types)); // one global remote query
            return batches;
        }
        if (profile.cities() != null) {
            for (CityPreference c : profile.cities()) {
                batches.add(safeSearch(role, c.city() + ", " + c.state(), false, types));
            }
        }
        if (batches.isEmpty()) {
            // No cities = "all locations": a search with no location filter.
            batches.add(safeSearch(role, null, false, types));
        }
        return batches;
    }

    /**
     * Belt-and-suspenders pass over what JSearch already filtered natively (via
     * {@code job_employment_types} on the request): keep postings whose type is one
     * the user picked. An empty selection means "any type"; a job with no type
     * (rare — the field is native) is kept rather than hidden.
     */
    private static List<Job> filterToProfile(List<Job> jobs, Profile profile) {
        List<EmploymentType> wanted = profile.employmentTypes();
        if (wanted == null || wanted.isEmpty()) {
            return jobs;
        }
        Set<String> wantedSlugs = wanted.stream().map(EmploymentType::slug).collect(Collectors.toSet());
        return jobs.stream()
                .filter(j -> j.employmentType() == null || wantedSlugs.contains(j.employmentType()))
                .toList();
    }

    /** Content key collapsing the same posting cross-listed under different ids. */
    private String dedupKey(Job job) {
        return (nz(job.title()) + "|" + nz(job.company()) + "|" + nz(job.city()))
                .toLowerCase(Locale.ROOT).strip();
    }

    private static String nz(String s) {
        return s == null ? "" : s;
    }

    private List<Job> safeSearch(String role, String where, boolean remote, List<EmploymentType> types) {
        try {
            return client.search(role, where, remote, types);
        } catch (RuntimeException e) {
            return List.of();
        }
    }
}
