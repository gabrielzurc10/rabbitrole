package com.rabbitrole.analysis;

import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.MapperFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.json.JsonMapper;
import com.rabbitrole.ai.OpenAiClient;
import com.rabbitrole.analysis.dto.AnalysisResponse;
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

    public AnalysisResponse analyze(String resumeId, String role) {
        String resumeText = resumes.extractedText(resumeId);

        // Flavor A grounding. Job fetching is best-effort — a postings outage
        // shouldn't block the critique, it just falls back to general advice.
        List<Job> grounding = safeFetchJobs(role);

        String raw = openai.completeJson(
                AnalysisPrompt.system(),
                AnalysisPrompt.user(role, resumeText, grounding));

        List<Tag> tags = parseTags(raw);
        Analysis saved = repository.save(new Analysis(
                UUID.randomUUID().toString(), resumeId, role, tags, Instant.now()));

        return toResponse(saved);
    }

    public AnalysisResponse get(String id) {
        Analysis analysis = repository.findById(id)
                .orElseThrow(() -> ApiException.notFound("No analysis found for id " + id));
        return toResponse(analysis);
    }

    private List<Job> safeFetchJobs(String role) {
        try {
            return jobs.forRole(role);
        } catch (RuntimeException e) {
            return List.of();
        }
    }

    private List<Tag> parseTags(String raw) {
        try {
            TagEnvelope envelope = json.readValue(raw, TagEnvelope.class);
            if (envelope == null || envelope.tags() == null || envelope.tags().isEmpty()) {
                throw new ApiException(HttpStatus.BAD_GATEWAY, "AI returned no feedback tags.");
            }
            return envelope.tags();
        } catch (ApiException e) {
            throw e;
        } catch (Exception e) {
            throw new ApiException(HttpStatus.BAD_GATEWAY,
                    "Could not parse AI feedback: " + e.getMessage());
        }
    }

    private AnalysisResponse toResponse(Analysis a) {
        return new AnalysisResponse(
                a.id(), a.resumeId(), a.role(),
                TagCounts.from(a.tags()), a.tags(), a.createdAt());
    }

    /** Matches the {"tags":[...]} shape the model is told to return. */
    private record TagEnvelope(List<Tag> tags) {
    }
}
