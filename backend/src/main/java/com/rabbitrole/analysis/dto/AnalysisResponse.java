package com.rabbitrole.analysis.dto;

import java.time.Instant;
import java.util.List;

/** Full analysis result returned to the frontend. */
public record AnalysisResponse(
        String id,
        String resumeId,
        String role,
        TagCounts counts,
        List<Tag> tags,
        Instant createdAt) {
}
