package com.rabbitrole.jobs;

import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.json.JsonMapper;
import com.rabbitrole.ai.OpenAiClient;
import com.rabbitrole.jobs.dto.Job;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

/**
 * Two-stage matching: the coarse embedding score (MatchScorer) is a blunt filter, so
 * this takes its shortlist and runs one judgment-model pass that picks the best few,
 * refining each score and emitting a "why this match" reason in the SAME call (keeping
 * the score and reason consistent). Powers the "Top matches" block; the lazy feed is
 * unchanged. Best-effort: on any AI/parse failure it falls back to the cosine top-N
 * (no reason) so the block still renders.
 */
@Service
public class JobRerankService {

    /** How many cosine-ranked candidates to hand the model. */
    private static final int CANDIDATES = 12;

    private final ObjectMapper json = JsonMapper.builder()
            .disable(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES)
            .build();

    private final OpenAiClient openai;

    public JobRerankService(OpenAiClient openai) {
        this.openai = openai;
    }

    /**
     * Returns the best {@code n} of the already-cosine-scored jobs, re-ranked by the
     * judgment model with refined scores + reasons (best-first).
     */
    public List<Job> topMatches(String resumeText, List<Job> scored, int n) {
        if (resumeText == null || resumeText.isBlank() || scored.isEmpty() || n <= 0) {
            return List.of();
        }

        List<Job> pool = scored.stream()
                .sorted(Comparator.comparingInt(JobRerankService::pct).reversed())
                .limit(CANDIDATES)
                .toList();

        try {
            String raw = openai.completeJson(
                    JobRerankPrompt.system(n),
                    JobRerankPrompt.user(resumeText, pool),
                    openai.judgmentModel());
            // Tree-then-bind so a duplicate key in the model output (last wins)
            // can't trip Jackson's record creator binding. See AnalysisService.
            RerankEnvelope env = json.treeToValue(json.readTree(raw), RerankEnvelope.class);
            if (env == null || env.matches() == null || env.matches().isEmpty()) {
                return cosineFallback(pool, n);
            }
            List<Job> out = new ArrayList<>();
            for (RankedMatch m : env.matches()) {
                int idx = (m.index() == null ? 0 : m.index()) - 1; // model is 1-based
                if (idx >= 0 && idx < pool.size() && m.reason() != null && !m.reason().isBlank()) {
                    out.add(pool.get(idx).withRerank(clamp(m.score()), m.reason()));
                }
                if (out.size() >= n) {
                    break;
                }
            }
            return out.isEmpty() ? cosineFallback(pool, n) : out;
        } catch (Exception e) {
            return cosineFallback(pool, n);
        }
    }

    /** Cosine-ordered top-N without reasons, when the re-rank call/parse fails. */
    private List<Job> cosineFallback(List<Job> pool, int n) {
        return pool.stream().limit(n).toList();
    }

    private static int pct(Job j) {
        return j.matchPercent() == null ? 0 : j.matchPercent();
    }

    private static int clamp(Integer score) {
        int s = score == null ? 0 : score;
        return Math.max(0, Math.min(100, s));
    }

    /** Matches {"matches":[{"index","score","reason"}]} from the model. */
    private record RerankEnvelope(List<RankedMatch> matches) {
    }

    private record RankedMatch(Integer index, Integer score, String reason) {
    }
}
