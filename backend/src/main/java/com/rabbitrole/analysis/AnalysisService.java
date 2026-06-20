package com.rabbitrole.analysis;

import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.MapperFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.json.JsonMapper;
import com.rabbitrole.ai.OpenAiClient;
import com.rabbitrole.analysis.dto.AnalysisResponse;
import com.rabbitrole.analysis.dto.SubScores;
import com.rabbitrole.analysis.dto.Tag;
import com.rabbitrole.analysis.dto.TagCounts;
import com.rabbitrole.common.ApiException;
import com.rabbitrole.jobs.JobService;
import com.rabbitrole.jobs.dto.Job;
import com.rabbitrole.resume.ResumeService;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static java.util.Collections.emptyList;

/**
 * Analyzes a resume against a role using Flavor A RAG: pull the role's live
 * postings, ground the critique prompt in them, ask OpenAI for severity-tagged
 * feedback, then persist. The OpenAI call is the only AI dependency — fetching
 * + prompting + parsing all live here so it's unit-testable with a stub client.
 */
@Service
public class AnalysisService {

    // Case-insensitive so the model can emit "critical" or "CRITICAL".
    private final ObjectMapper json = JsonMapper.builder()
            .enable(MapperFeature.ACCEPT_CASE_INSENSITIVE_ENUMS)
            .disable(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES)
            .build();

    private final ResumeService resumes;
    private final JobService jobs;
    private final OpenAiClient openai;
    private final AnalysisRepository repository;

    public AnalysisService(ResumeService resumes,
                           JobService jobs,
                           OpenAiClient openai,
                           AnalysisRepository repository) {
        this.resumes = resumes;
        this.jobs = jobs;
        this.openai = openai;
        this.repository = repository;
    }

    public AnalysisResponse analyze(String resumeId, String role, String userId) {
        // Fetching the text also enforces the caller owns the resume.
        String resumeText = resumes.extractedText(resumeId, userId);

        // Flavor A grounding. Job fetching is best-effort — a postings outage
        // shouldn't block the critique, it just falls back to general advice.
        List<Job> grounding = safeFetchJobs(role);

        // Scoring is a quality-critical judgment call → use the stronger model.
        String raw = openai.completeJson(
                AnalysisPrompt.system(),
                AnalysisPrompt.user(role, resumeText, grounding),
                openai.judgmentModel());

        AnalysisEnvelope envelope = parseEnvelope(raw);
        List<Tag> tags = envelope.tags();
        int score = resolveScore(envelope.subScores(), tags);
        List<String> missingSkills = envelope.missingSkills() == null ? emptyList() : envelope.missingSkills();
        Analysis saved = repository.save(new Analysis(
                UUID.randomUUID().toString(), userId, resumeId, role, tags, score,
                envelope.subScores(), missingSkills, Instant.now()));

        return toResponse(saved);
    }

    public AnalysisResponse get(String id, String userId) {
        Analysis analysis = repository.findById(id)
                .orElseThrow(() -> ApiException.notFound("No analysis found for id " + id));
        // Mismatched owner is reported as not-found so ids never leak.
        if (!analysis.userId().equals(userId)) {
            throw ApiException.notFound("No analysis found for id " + id);
        }
        return toResponse(analysis);
    }

    /** Drop the user's superseded analyses, keeping only the current one. */
    public void deleteOthers(String userId, String keepAnalysisId) {
        repository.deleteByUserIdExcept(userId, keepAnalysisId);
    }

    private List<Job> safeFetchJobs(String role) {
        try {
            return jobs.forRole(role);
        } catch (RuntimeException e) {
            return List.of();
        }
    }

    private AnalysisEnvelope parseEnvelope(String raw) {
        try {
            AnalysisEnvelope envelope = json.readValue(raw, AnalysisEnvelope.class);
            if (envelope == null || envelope.tags() == null || envelope.tags().isEmpty()) {
                throw new ApiException(HttpStatus.BAD_GATEWAY, "AI returned no feedback tags.");
            }
            return envelope;
        } catch (ApiException e) {
            throw e;
        } catch (Exception e) {
            throw new ApiException(HttpStatus.BAD_GATEWAY,
                    "Could not parse AI feedback: " + e.getMessage());
        }
    }

    // Rubric weights — sum to 1.0. Skills + experience dominate fit; impact and
    // clarity refine it. Tune these (or the prompt) to recalibrate scoring.
    private static final double W_SKILLS = 0.35;
    private static final double W_EXPERIENCE = 0.30;
    private static final double W_IMPACT = 0.20;
    private static final double W_CLARITY = 0.15;

    /**
     * Overall score = a deterministic weighted blend of the rubric sub-scores (stable
     * and explainable). Falls back to a tag-mix estimate when sub-scores are missing
     * or out of range, so a response always carries a sensible number.
     */
    private int resolveScore(SubScores s, List<Tag> tags) {
        if (s != null && s.valid()) {
            double weighted = W_SKILLS * s.skills()
                    + W_EXPERIENCE * s.experience()
                    + W_IMPACT * s.impact()
                    + W_CLARITY * s.clarity();
            return (int) Math.round(Math.max(0, Math.min(100, weighted)));
        }
        TagCounts counts = TagCounts.from(tags);
        int derived = 100 - (18 * counts.critical()) - (7 * counts.warning()) - (2 * counts.optional());
        return Math.max(0, Math.min(100, derived));
    }

    private AnalysisResponse toResponse(Analysis a) {
        return new AnalysisResponse(
                a.id(), a.resumeId(), a.role(), a.score(),
                a.subScores(), a.missingSkills() == null ? emptyList() : a.missingSkills(),
                TagCounts.from(a.tags()), a.tags(), a.createdAt());
    }

    /** Matches the {"subScores":{..},"missingSkills":[..],"tags":[..]} shape the model returns. */
    private record AnalysisEnvelope(SubScores subScores, List<String> missingSkills, List<Tag> tags) {
    }
}
