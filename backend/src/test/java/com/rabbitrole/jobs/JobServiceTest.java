package com.rabbitrole.jobs;

import com.rabbitrole.jobs.dto.Job;
import com.rabbitrole.profiles.CityPreference;
import com.rabbitrole.profiles.EmploymentType;
import com.rabbitrole.profiles.Profile;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Preference-driven matching with a stubbed JSearch client + scorer — verifies the
 * remote vs local (per-city) query shape, content dedupe, and the native
 * employment-type filter.
 */
class JobServiceTest {

    private JSearchClient client;
    private MatchScorer scorer;
    private JobService service;

    @BeforeEach
    void setUp() {
        client = mock(JSearchClient.class);
        scorer = mock(MatchScorer.class);
        service = new JobService(client, scorer);
        // Scorer is identity here — we only care about what gets merged in.
        when(scorer.score(anyString(), anyList())).thenAnswer(inv -> inv.getArgument(1));
    }

    // City varies by id so each is distinct content; same id across batches is a
    // true duplicate (identical content) and should collapse.
    private Job job(String id) {
        return job(id, null);
    }

    private Job job(String id, String employmentType) {
        return new Job(id, "Engineer", "Acme", null, "City-" + id, "City-" + id, "TX",
                null, employmentType, "desc", "http://x", null, null, null, null, null, null, null);
    }

    private Profile profile(boolean remote, List<EmploymentType> types, List<CityPreference> cities) {
        return new Profile("user-1", "Ada", List.of("Backend Engineer"),
                remote, types, cities, "resume-1", "analysis-1", 80, Instant.now());
    }

    @Test
    void localSearchFansOutEachCityAndDedupes() {
        Profile p = profile(false, List.of(), List.of(
                new CityPreference("Austin", "TX"),
                new CityPreference("Denver", "CO")));

        when(client.search(eq("Backend Engineer"), eq("Austin, TX"), eq(false), anyList(), anyInt()))
                .thenReturn(List.of(job("a"), job("b")));
        when(client.search(eq("Backend Engineer"), eq("Denver, CO"), eq(false), anyList(), anyInt()))
                .thenReturn(List.of(job("b"), job("c"))); // "b" overlaps

        List<Job> result = service.forProfile(p, "resume text", 0);

        assertThat(result).extracting(Job::id).containsExactly("a", "b", "c"); // deduped
        verify(client).search("Backend Engineer", "Austin, TX", false, List.of(), 1);
        verify(client).search("Backend Engineer", "Denver, CO", false, List.of(), 1);
    }

    @Test
    void dedupesCrossPostedDuplicatesByContent() {
        // Same posting cross-listed under different source ids (different city
        // queries) — id-only dedup would keep both; content dedup collapses them.
        Profile p = profile(false, List.of(), List.of(
                new CityPreference("Austin", "TX"),
                new CityPreference("Dallas", "TX")));

        Job austinA = new Job("id-1", "Engineer", "Acme", null, "Austin", "Austin", "TX", null, null, "desc", "http://x", null, null, null, null, null, null, null);
        Job austinDup = new Job("id-2", "Engineer", "Acme", null, "Austin", "Austin", "TX", null, null, "desc", "http://y", null, null, null, null, null, null, null);

        when(client.search(eq("Backend Engineer"), eq("Austin, TX"), eq(false), anyList(), anyInt()))
                .thenReturn(List.of(austinA));
        when(client.search(eq("Backend Engineer"), eq("Dallas, TX"), eq(false), anyList(), anyInt()))
                .thenReturn(List.of(austinDup)); // same title/company/city, different id

        List<Job> result = service.forProfile(p, "resume text", 0);

        assertThat(result).extracting(Job::id).containsExactly("id-1"); // first wins, dup dropped
    }

    @Test
    void remoteProfileIssuesRemoteSearch() {
        Profile p = profile(true, List.of(), List.of());
        when(client.search(eq("Backend Engineer"), isNull(), eq(true), anyList(), anyInt()))
                .thenReturn(List.of(job("a")));

        List<Job> result = service.forProfile(p, "resume text", 0);

        assertThat(result).extracting(Job::id).containsExactly("a");
        verify(client).search("Backend Engineer", null, true, List.of(), 1);
    }

    @Test
    void employmentTypeFilterKeepsSelectedAndUnknownDropsOthers() {
        Profile p = profile(false, List.of(EmploymentType.FULL_TIME),
                List.of(new CityPreference("Austin", "TX")));
        when(client.search(eq("Backend Engineer"), eq("Austin, TX"), eq(false), anyList(), anyInt()))
                .thenReturn(List.of(
                        job("a", "full-time"), // selected → kept
                        job("b", null),        // no native type → kept (don't hide a maybe)
                        job("c", "contract"))  // a type they didn't pick → dropped
                );

        List<Job> result = service.forProfile(p, "resume text", 0);

        assertThat(result).extracting(Job::id).containsExactly("a", "b");
    }

    @Test
    void noResumeReturnsUnscored() {
        Profile p = profile(true, List.of(), List.of());
        when(client.search(eq("Backend Engineer"), isNull(), eq(true), anyList(), anyInt()))
                .thenReturn(List.of(job("a")));

        List<Job> result = service.forProfile(p, null, 0);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).matchPercent()).isNull(); // scorer not invoked
    }
}
