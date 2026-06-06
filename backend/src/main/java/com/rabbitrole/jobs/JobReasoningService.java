package com.rabbitrole.jobs;

import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.json.JsonMapper;
import com.rabbitrole.ai.OpenAiClient;
import com.rabbitrole.common.ApiException;
import com.rabbitrole.jobs.dto.ReasonRequest;
import com.rabbitrole.profiles.Profile;
import com.rabbitrole.profiles.ProfileService;
import com.rabbitrole.resume.ResumeService;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

/**
 * Generates the on-demand explanation behind a job's match score. Lazy by design:
 * the UI only calls this when a user expands a card, so the (single) OpenAI call
 * isn't paid for every posting on every page load. AI access goes through the
 * centralized {@link OpenAiClient} (CLAUDE.md).
 */
@Service
public class JobReasoningService {

    private final ObjectMapper json = JsonMapper.builder()
            .disable(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES)
            .build();

    private final ProfileService profiles;
    private final ResumeService resumes;
    private final OpenAiClient openai;

    public JobReasoningService(ProfileService profiles, ResumeService resumes, OpenAiClient openai) {
        this.profiles = profiles;
        this.resumes = resumes;
        this.openai = openai;
    }

    /** Returns a one-sentence match explanation for the caller's resume. */
    public String reason(ReasonRequest job, String userId) {
        String resumeText = resolveResumeText(userId);
        if (resumeText == null || resumeText.isBlank()) {
            return "Upload a resume to see why this role matches your background.";
        }

        String raw = openai.completeJson(
                JobReasonPrompt.system(),
                JobReasonPrompt.user(resumeText, job));
        return parse(raw);
    }

    /** The caller's current resume text, or null when they have no profile/resume. */
    private String resolveResumeText(String userId) {
        Profile profile = profiles.find(userId).orElse(null);
        if (profile == null || profile.resumeId() == null) {
            return null;
        }
        // Reading under the caller's id enforces resume ownership.
        return resumes.extractedText(profile.resumeId(), userId);
    }

    private String parse(String raw) {
        try {
            ReasonEnvelope envelope = json.readValue(raw, ReasonEnvelope.class);
            if (envelope == null || envelope.reasoning() == null || envelope.reasoning().isBlank()) {
                throw new ApiException(HttpStatus.BAD_GATEWAY, "AI returned no reasoning.");
            }
            return envelope.reasoning();
        } catch (ApiException e) {
            throw e;
        } catch (Exception e) {
            throw new ApiException(HttpStatus.BAD_GATEWAY,
                    "Could not parse AI reasoning: " + e.getMessage());
        }
    }

    /** Matches the {"reasoning": ...} shape the model is told to return. */
    private record ReasonEnvelope(String reasoning) {
    }
}
