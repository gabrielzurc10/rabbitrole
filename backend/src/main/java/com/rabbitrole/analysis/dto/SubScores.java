package com.rabbitrole.analysis.dto;

/**
 * Per-dimension rubric scores (each 0–100). The overall analysis score is a
 * deterministic weighted blend of these (see {@code AnalysisService}), so it's
 * stable and explainable rather than a single opaque number from the model.
 */
public record SubScores(int skills, int experience, int impact, int clarity) {

    /** True when every dimension is a sane 0–100 value. */
    public boolean valid() {
        return inRange(skills) && inRange(experience) && inRange(impact) && inRange(clarity);
    }

    private static boolean inRange(int v) {
        return v >= 0 && v <= 100;
    }
}
