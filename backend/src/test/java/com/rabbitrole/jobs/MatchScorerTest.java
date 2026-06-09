package com.rabbitrole.jobs;

import com.rabbitrole.ai.EmbeddingClient;
import com.rabbitrole.jobs.dto.Job;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/** Verifies cosine scoring with a stubbed embedding client (no API calls). */
class MatchScorerTest {

    @Test
    void scoresByCosineButKeepsInputOrder() {
        EmbeddingClient embeddings = mock(EmbeddingClient.class);
        // resume, then two jobs in input order: B is orthogonal (low match), A is identical
        // (high match). A is listed SECOND on purpose — scoring must not re-rank it first.
        when(embeddings.embedAll(anyList())).thenReturn(List.of(
                new float[]{1f, 0f},    // resume
                new float[]{0f, 1f},    // job B — orthogonal -> low match
                new float[]{1f, 0f}));  // job A — identical direction -> high match

        MatchScorer scorer = new MatchScorer(embeddings);
        List<Job> jobs = List.of(
                new Job("B", "NoMatch", "Beta", null, "Remote", "", "", "remote", null, "desc", "url", null, null, null, null, null, null, null),
                new Job("A", "Match", "Acme", null, "Remote", "", "", "remote", null, "desc", "url", null, null, null, null, null, null, null));

        List<Job> scored = scorer.score("resume", jobs);

        // Input order preserved (not sorted by match %), but each carries its own score.
        assertThat(scored).extracting(Job::id).containsExactly("B", "A");
        assertThat(scored.get(1).matchPercent()).isGreaterThan(scored.get(0).matchPercent());
    }
}
