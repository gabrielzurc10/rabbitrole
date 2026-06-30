package com.rabbitrole.analysis;

import com.rabbitrole.ai.OpenAiClient;
import com.rabbitrole.analysis.dto.AnalysisResponse;
import com.rabbitrole.common.ApiException;
import com.rabbitrole.jobs.JobService;
import com.rabbitrole.jobs.dto.Job;
import com.rabbitrole.resume.ResumeService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * Exercises the analyze flow with a stubbed OpenAI client — no real API calls.
 * Verifies JSON parsing, case-insensitive severities, counts, and persistence.
 */
class AnalysisServiceTest {

    private ResumeService resumes;
    private JobService jobs;
    private OpenAiClient openai;
    private AnalysisService service;

    @BeforeEach
    void setUp() {
        resumes = mock(ResumeService.class);
        jobs = mock(JobService.class);
        openai = mock(OpenAiClient.class);
        service = new AnalysisService(resumes, jobs, openai, new InMemoryAnalysisRepository());

        when(openai.judgmentModel()).thenReturn("gpt-5.4-mini");
        when(resumes.extractedText(anyString(), anyString())).thenReturn("Backend engineer resume text.");
        when(jobs.forRole(anyString())).thenReturn(List.of(
                new Job("1", "Backend Engineer", "Acme", null, "Remote", "", "", "remote", null, "Java, AWS", "http://x", null, null, null, null, null, null, null)));
    }

    @Test
    void analyzeParsesTagsCountsAndPersists() {
        when(openai.completeJson(anyString(), anyString(), anyString())).thenReturn("""
            {"subScores":{"skills":82,"experience":74,"impact":65,"clarity":88},
             "missingSkills":["Kubernetes","GraphQL"],
             "tags":[
              {"severity":"critical","message":"No metrics","reason":"Postings want impact","suggestion":"Add numbers","location":"Experience"},
              {"severity":"warning","message":"Too long","reason":"2 pages","suggestion":"Trim","location":"Overall"},
              {"severity":"optional","message":"Add portfolio","reason":"Nice to have","suggestion":"Link GitHub","location":"Header"}
            ]}
            """);

        AnalysisResponse result = service.analyze("resume-1", "Backend Engineer", "user-1");

        assertThat(result.tags()).hasSize(3);
        assertThat(result.counts().critical()).isEqualTo(1);
        assertThat(result.counts().warning()).isEqualTo(1);
        assertThat(result.counts().optional()).isEqualTo(1);
        assertThat(result.role()).isEqualTo("Backend Engineer");
        // Overall = weighted blend: .35*82 + .30*74 + .20*65 + .15*88 = 77.1 → 77.
        assertThat(result.score()).isEqualTo(77);
        assertThat(result.subScores().skills()).isEqualTo(82);
        assertThat(result.subScores().clarity()).isEqualTo(88);
        assertThat(result.missingSkills()).containsExactly("Kubernetes", "GraphQL");

        // Persisted and retrievable by its owner.
        AnalysisResponse fetched = service.get(result.id(), "user-1");
        assertThat(fetched.id()).isEqualTo(result.id());

        // A different user must not be able to read it.
        assertThatThrownBy(() -> service.get(result.id(), "intruder"))
                .isInstanceOf(ApiException.class)
                .hasMessageContaining("No analysis found");
    }

    @Test
    void jobOutageStillProducesAnalysis() {
        when(jobs.forRole(anyString())).thenThrow(new RuntimeException("jobs source down"));
        when(openai.completeJson(anyString(), anyString(), anyString())).thenReturn(
                "{\"tags\":[{\"severity\":\"CRITICAL\",\"message\":\"x\",\"reason\":\"y\",\"suggestion\":\"z\",\"location\":\"a\"}]}");

        AnalysisResponse result = service.analyze("resume-1", "Backend Engineer", "user-1");
        assertThat(result.tags()).hasSize(1);
    }

    @Test
    void omittedSubScoresFallsBackToDerivedScore() {
        // No "subScores" → derive from tag mix: 100 - 18(crit) - 7(warn) = 75.
        when(openai.completeJson(anyString(), anyString(), anyString())).thenReturn("""
            {"tags":[
              {"severity":"critical","message":"x","reason":"y","suggestion":"z","location":"a"},
              {"severity":"warning","message":"x","reason":"y","suggestion":"z","location":"a"}
            ]}
            """);

        AnalysisResponse result = service.analyze("resume-1", "Backend Engineer", "user-1");
        assertThat(result.score()).isEqualTo(75);
    }

    @Test
    void malformedAiResponseIsRejected() {
        when(openai.completeJson(anyString(), anyString(), anyString())).thenReturn("not json at all");

        assertThatThrownBy(() -> service.analyze("resume-1", "Backend Engineer", "user-1"))
                .isInstanceOf(ApiException.class)
                .hasMessageContaining("Could not parse AI feedback");
    }

    @Test
    void unknownAnalysisIdIsNotFound() {
        assertThatThrownBy(() -> service.get("nope", "user-1"))
                .isInstanceOf(ApiException.class)
                .hasMessageContaining("No analysis found");
    }
}
