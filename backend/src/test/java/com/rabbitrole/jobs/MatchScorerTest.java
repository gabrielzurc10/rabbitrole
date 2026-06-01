package com.rabbitrole.jobs;

import com.rabbitrole.ai.EmbeddingClient;
import com.rabbitrole.jobs.dto.Job;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/** Verifies cosine ranking with a stubbed embedding client (no API calls). */
class MatchScorerTest {

    @Test
    void ranksMoreSimilarJobHigher() {
        EmbeddingClient embeddings = mock(EmbeddingClient.class);
        // resume, then two jobs: job A aligns with the resume vector, job B is orthogonal.
        when(embeddings.embedAll(anyList())).thenReturn(List.of(
                new float[]{1f, 0f},    // resume
                new float[]{1f, 0f},    // job A — identical direction -> high match
                new float[]{0f, 1f}));  // job B — orthogonal -> low match

        MatchScorer scorer = new MatchScorer(embeddings);
        List<Job> jobs = List.of(
                new Job("A", "Match", "Acme", "Remote", "desc", "url", null),
                new Job("B", "NoMatch", "Beta", "Remote", "desc", "url", null));

        List<Job> ranked = scorer.score("resume", jobs);

        assertThat(ranked).hasSize(2);
        assertThat(ranked.get(0).id()).isEqualTo("A");
        assertThat(ranked.get(0).matchPercent()).isGreaterThan(ranked.get(1).matchPercent());
    }
}
