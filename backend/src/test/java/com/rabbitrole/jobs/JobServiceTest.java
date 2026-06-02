package com.rabbitrole.jobs;

import com.rabbitrole.jobs.dto.Job;
import com.rabbitrole.profiles.CityPreference;
import com.rabbitrole.profiles.Profile;
import com.rabbitrole.profiles.WorkMode;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Preference-driven matching with a stubbed Adzuna + scorer — verifies role×city
 * fan-out, dedupe by id, and REMOTE vs HYBRID query shape.
 */
class JobServiceTest {

    private AdzunaClient adzuna;
    private MatchScorer scorer;
    private JobService service;

    @BeforeEach
    void setUp() {
        adzuna = mock(AdzunaClient.class);
        scorer = mock(MatchScorer.class);
        service = new JobService(adzuna, scorer);
        // Scorer is identity here — we only care about what gets merged in.
        when(scorer.score(anyString(), anyList())).thenAnswer(inv -> inv.getArgument(1));
    }

    private Job job(String id) {
        return new Job(id, "Engineer", "Acme", "Austin", "desc", "http://x", null);
    }

    private Profile profile(WorkMode mode, List<CityPreference> cities) {
        return new Profile("user-1", "Ada", List.of("Backend Engineer"),
                mode, cities, "resume-1", "analysis-1", 80, Instant.now());
    }

    @Test
    void hybridQueriesEachCityWithDistanceAndDedupes() {
        Profile p = profile(WorkMode.HYBRID, List.of(
                new CityPreference("Austin", "TX", 25),
                new CityPreference("Denver", "CO", 50)));

        when(adzuna.search(eq("Backend Engineer"), eq("Austin, TX"), eq(25), eq(false)))
                .thenReturn(List.of(job("a"), job("b")));
        when(adzuna.search(eq("Backend Engineer"), eq("Denver, CO"), eq(50), eq(false)))
                .thenReturn(List.of(job("b"), job("c"))); // "b" overlaps

        List<Job> result = service.forProfile(p, "resume text");

        assertThat(result).extracting(Job::id).containsExactly("a", "b", "c"); // deduped
        verify(adzuna).search("Backend Engineer", "Austin, TX", 25, false);
        verify(adzuna).search("Backend Engineer", "Denver, CO", 50, false);
    }

    @Test
    void remoteModeIssuesRemoteSearch() {
        Profile p = profile(WorkMode.REMOTE, List.of());
        when(adzuna.search(eq("Backend Engineer"), isNull(), isNull(), eq(true)))
                .thenReturn(List.of(job("a")));

        List<Job> result = service.forProfile(p, "resume text");

        assertThat(result).extracting(Job::id).containsExactly("a");
        verify(adzuna).search("Backend Engineer", null, null, true);
    }

    @Test
    void noResumeReturnsUnscored() {
        Profile p = profile(WorkMode.REMOTE, List.of());
        when(adzuna.search(eq("Backend Engineer"), isNull(), isNull(), eq(true)))
                .thenReturn(List.of(job("a")));

        List<Job> result = service.forProfile(p, null);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).matchPercent()).isNull(); // scorer not invoked
    }
}
