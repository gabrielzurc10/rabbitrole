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

        when(resumes.extractedText(anyString(), anyString())).thenReturn("Backend engineer resume text.");
        when(jobs.forRole(anyString())).thenReturn(List.of(
                new Job("1", "Backend Engineer", "Acme", "Remote", "Java, AWS", "http://x", null)));
    }

    @Test
    void analyzeParsesTagsCountsAndPersists() {
        when(openai.completeJson(anyString(), anyString())).thenReturn("""
            {"tags":[
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
        when(jobs.forRole(anyString())).thenThrow(new RuntimeException("Adzuna down"));
        when(openai.completeJson(anyString(), anyString())).thenReturn(
                "{\"tags\":[{\"severity\":\"CRITICAL\",\"message\":\"x\",\"reason\":\"y\",\"suggestion\":\"z\",\"location\":\"a\"}]}");

        AnalysisResponse result = service.analyze("resume-1", "Backend Engineer", "user-1");
        assertThat(result.tags()).hasSize(1);
    }

    @Test
    void malformedAiResponseIsRejected() {
        when(openai.completeJson(anyString(), anyString())).thenReturn("not json at all");

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
