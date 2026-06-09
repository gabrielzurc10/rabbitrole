package com.rabbitrole.jobs;

import com.rabbitrole.ai.EmbeddingClient;
import com.rabbitrole.ai.Vectors;
import com.rabbitrole.jobs.dto.Job;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

/**
 * Scores how well a resume matches each posting via embedding cosine similarity and
 * maps it to a friendlier 0–100 percentage. Postings keep their input (JSearch/merge)
 * order — the % is shown as a badge, not used to re-rank — so paginated batches stay
 * in a stable, job-board-like order.
 */
@Component
public class MatchScorer {

    private final EmbeddingClient embeddings;

    public MatchScorer(EmbeddingClient embeddings) {
        this.embeddings = embeddings;
    }

    /** Returns the jobs with match percentages set, in their original order. */
    public List<Job> score(String resumeText, List<Job> jobs) {
        if (jobs.isEmpty()) {
            return jobs;
        }

        // One batched embeddings call: the resume first, then each job description.
        List<String> inputs = new ArrayList<>();
        inputs.add(resumeText);
        jobs.forEach(j -> inputs.add(j.title() + "\n" + j.description()));

        List<float[]> vectors = embeddings.embedAll(inputs);
        float[] resumeVec = vectors.get(0);

        List<Job> scored = new ArrayList<>(jobs.size());
        for (int i = 0; i < jobs.size(); i++) {
            double cosine = Vectors.cosine(resumeVec, vectors.get(i + 1));
            scored.add(jobs.get(i).withMatch(toPercent(cosine)));
        }

        return scored;
    }

    /**
     * Resume/job cosine scores realistically land in roughly 0.3–0.6 (a resume and a
     * job posting are different document types, so even a great fit isn't near-identical
     * text). Map that band to 0–100 — i.e. 0.3 → 0%, 0.6 → 100% — so the bar uses its full
     * range instead of compressing everything into the low end.
     */
    private int toPercent(double cosine) {
        double scaled = (cosine - 0.3) / 0.3;
        int pct = (int) Math.round(Math.max(0, Math.min(1, scaled)) * 100);
        return pct;
    }
}
