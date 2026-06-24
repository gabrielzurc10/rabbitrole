package com.rabbitrole.jobs;

import com.rabbitrole.profiles.EmploymentType;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * The client-side employment-type gate over JSearch's loose native filter (a PARTTIME/INTERN
 * search still returns pure FULLTIME postings). Multi-type aware: a posting matches if ANY of
 * its types was requested; untyped postings are kept.
 */
class JSearchClientTest {

    private static Map<String, Object> posting(List<String> types) {
        return Map.of("job_employment_types", types);
    }

    @Test
    void emptySelectionKeepsEverything() {
        assertThat(JSearchClient.matchesEmploymentTypes(posting(List.of("FULLTIME")), List.of())).isTrue();
    }

    @Test
    void dropsAPureFulltimePostingWhenContractRequested() {
        assertThat(JSearchClient.matchesEmploymentTypes(
                posting(List.of("FULLTIME")), List.of(EmploymentType.CONTRACT))).isFalse();
    }

    @Test
    void keepsAMultiTypePostingWhenAnyTypeMatches() {
        // A "FULLTIME,PARTTIME" job is a real part-time option — keep it for a part-time seeker.
        assertThat(JSearchClient.matchesEmploymentTypes(
                posting(List.of("FULLTIME", "PARTTIME")), List.of(EmploymentType.PART_TIME))).isTrue();
    }

    @Test
    void keepsAnUntypedPosting() {
        assertThat(JSearchClient.matchesEmploymentTypes(Map.of(), List.of(EmploymentType.CONTRACT))).isTrue();
    }

    @Test
    void fallsBackToTheSingularField() {
        Map<String, Object> raw = Map.of("job_employment_type", "Contractor");
        assertThat(JSearchClient.matchesEmploymentTypes(raw, List.of(EmploymentType.CONTRACT))).isTrue();
        assertThat(JSearchClient.matchesEmploymentTypes(raw, List.of(EmploymentType.FULL_TIME))).isFalse();
    }
}
