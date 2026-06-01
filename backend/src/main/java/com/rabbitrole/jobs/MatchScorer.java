package com.rabbitrole.jobs;

import com.rabbitrole.ai.EmbeddingClient;
import com.rabbitrole.ai.Vectors;
import com.rabbitrole.jobs.dto.Job;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

/**
 * Scores how well a resume matches each posting via embedding cosine similarity,
 * then maps the raw score to a friendlier 0–100 percentage and ranks by it.
 */
@Component
public class MatchScorer {

    private final EmbeddingClient embeddings;

    public MatchScorer(EmbeddingClient embeddings) {
        this.embeddings = embeddings;
    }

    /** Returns the jobs with match percentages set, highest match first. */
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

        scored.sort(Comparator.comparing(Job::matchPercent).reversed());
        return scored;
    }

    /**
     * Resume/job cosine scores realistically land in roughly 0.3–0.6, so we
     * rescale that band to 0–100 to give the UI a meaningful spread.
     */
    private int toPercent(double cosine) {
        double scaled = (cosine - 0.3) / 0.5;
        int pct = (int) Math.round(Math.max(0, Math.min(1, scaled)) * 100);
        return pct;
    }
}
