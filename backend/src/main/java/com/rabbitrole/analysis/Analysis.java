package com.rabbitrole.analysis;

import com.rabbitrole.analysis.dto.Tag;

import java.time.Instant;
import java.util.List;

/** A stored analysis. Persisted via RDS Data API in Phase 5; in-memory for now. */
public record Analysis(
        String id,
        String userId,
        String resumeId,
        String role,
        List<Tag> tags,
        int score,
        Instant createdAt) {
}
