package com.rabbitrole.jobs;

import com.rabbitrole.ai.OpenAiClient;
import com.rabbitrole.jobs.dto.ReasonRequest;
import com.rabbitrole.profiles.Profile;
import com.rabbitrole.profiles.ProfileService;
import com.rabbitrole.resume.ResumeService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** Reasoning generation with stubbed profile/resume/OpenAI (no API calls). */
class JobReasoningServiceTest {

    private ProfileService profiles;
    private ResumeService resumes;
    private OpenAiClient openai;
    private JobReasoningService service;

    private final ReasonRequest request =
            new ReasonRequest("Backend Engineer", "Acme", "Java + AWS shop", 80);

    @BeforeEach
    void setUp() {
        profiles = mock(ProfileService.class);
        resumes = mock(ResumeService.class);
        openai = mock(OpenAiClient.class);
        service = new JobReasoningService(profiles, resumes, openai);
    }

    private Profile profileWithResume(String resumeId) {
        return new Profile("user-1", "Ada", List.of("Backend Engineer"),
                true, List.of(), List.of(), resumeId, "analysis-1", 80, Instant.now());
    }

    @Test
    void returnsParsedReasoningWhenResumeExists() {
        when(profiles.find("user-1")).thenReturn(Optional.of(profileWithResume("resume-1")));
        when(resumes.extractedText("resume-1", "user-1")).thenReturn("Strong Java + AWS background.");
        when(openai.completeJson(anyString(), anyString()))
                .thenReturn("{\"reasoning\":\"Strong Java/AWS overlap with the role.\"}");

        String reasoning = service.reason(request, "user-1");

        assertThat(reasoning).isEqualTo("Strong Java/AWS overlap with the role.");
    }

    @Test
    void promptsWithoutCallingOpenAiWhenNoResume() {
        when(profiles.find("user-1")).thenReturn(Optional.of(profileWithResume(null)));

        String reasoning = service.reason(request, "user-1");

        assertThat(reasoning).contains("Upload a resume");
        verify(openai, never()).completeJson(anyString(), anyString());
    }

    @Test
    void fallsBackWhenNoProfile() {
        when(profiles.find("user-1")).thenReturn(Optional.empty());

        String reasoning = service.reason(request, "user-1");

        assertThat(reasoning).contains("Upload a resume");
        verify(openai, never()).completeJson(anyString(), anyString());
    }
}
