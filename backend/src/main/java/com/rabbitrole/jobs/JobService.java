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
     * {@code remote}, else each city), interleaved round-robin across the roles, then
     * deduped, filtered to the chosen employment types, and ranked against the resume.
     * We search the bare role so the candidate pool stays broad. Each query is best-effort.
     *
     * <p>Interleaving is what makes the frontend's "10 at a time" list a blend of the
     * roles: with roles [Software Engineer, Backend Engineer] the first page alternates
     * one from each rather than showing all of the first role before the second. A page
     * here is one JSearch page (10) per query; the frontend reveals them ten at a time and
     * asks for the next {@code page} as the user scrolls.
     */
    public List<Job> forProfile(Profile profile, String resumeText, int page) {
        // Gather each role's postings separately (its remote/per-city batches, flattened),
        // bounded overall by MAX_QUERIES, so we can interleave them below.
        List<List<Job>> perRole = new ArrayList<>();
        int queries = 0;
        outer:
        for (String role : profile.targetRoles()) {
            List<Job> roleJobs = new ArrayList<>();
            perRole.add(roleJobs);
            for (List<Job> batch : queriesFor(role, profile, page)) {
                if (queries++ >= MAX_QUERIES) {
                    break outer;
                }
                roleJobs.addAll(batch);
            }
        }

        List<Job> jobs = filterToProfile(new ArrayList<>(interleave(perRole).values()), profile);
        if (resumeText == null || resumeText.isBlank() || jobs.isEmpty()) {
            return jobs; // unscored when there's no resume to rank against
        }
        return scorer.score(resumeText, jobs);
    }

    /**
     * Round-robins the per-role lists into a single deduped order: the i-th posting of
     * every role before any role's (i+1)-th, so the merged stream blends the roles instead
     * of running one to exhaustion first. Dedupe is on content, not the source's id: the
     * same posting is often cross-listed (across cities, or reposted) under different ids,
     * and the first occurrence (highest-priority role, earliest query) wins.
     */
    private Map<String, Job> interleave(List<List<Job>> perRole) {
        Map<String, Job> merged = new LinkedHashMap<>();
        int depth = perRole.stream().mapToInt(List::size).max().orElse(0);
        for (int i = 0; i < depth; i++) {
            for (List<Job> roleJobs : perRole) {
                if (i < roleJobs.size()) {
                    merged.putIfAbsent(dedupKey(roleJobs.get(i)), roleJobs.get(i));
                }
            }
        }
        return merged;
    }

    /**
     * The JSearch result batches to fetch for one role given the profile. Remote
     * eligibility is location-agnostic: JSearch returns "Anywhere" postings with no
     * city/state, so a per-city search can't narrow them. A remote search is therefore a
     * single global query; only a non-remote search fans out per city (or all locations).
     */
    private List<List<Job>> queriesFor(String role, Profile profile, int page) {
        List<EmploymentType> types = profile.employmentTypes();
        List<List<Job>> batches = new ArrayList<>();
        if (profile.remote()) {
            batches.add(safeSearch(role, null, true, types, page)); // one global remote query
            return batches;
        }
        if (profile.cities() != null) {
            for (CityPreference c : profile.cities()) {
                batches.add(safeSearch(role, c.city() + ", " + c.state(), false, types, page));
            }
        }
        if (batches.isEmpty()) {
            // No cities = "all locations": a search with no location filter.
            batches.add(safeSearch(role, null, false, types, page));
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

    private List<Job> safeSearch(String role, String where, boolean remote,
                                 List<EmploymentType> types, int page) {
        try {
            // Callers page 0-based; JSearch is 1-based.
            return client.search(role, where, remote, types, page + 1);
        } catch (RuntimeException e) {
            return List.of();
        }
    }
}
