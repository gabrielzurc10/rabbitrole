package com.rabbitrole.analysis;

import com.rabbitrole.analysis.dto.SubScores;
import com.rabbitrole.analysis.dto.Tag;

import java.time.Instant;
import java.util.List;

/**
 * A stored analysis. {@code score} is the overall 0–100 (a weighted blend of
 * {@code subScores}); {@code subScores} and {@code missingSkills} may be null/empty
 * for analyses saved before the rubric was introduced.
 */
public record Analysis(
        String id,
        String userId,
        String resumeId,
        String role,
        List<Tag> tags,
        int score,
        SubScores subScores,
        List<String> missingSkills,
        Instant createdAt) {
}
