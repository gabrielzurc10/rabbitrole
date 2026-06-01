package com.rabbitrole.resume;

/**
 * A stored resume: its file metadata plus the full extracted text.
 * Persisted to Aurora via the RDS Data API in Phase 5; an in-memory stub
 * backs it for now (see {@link ResumeRepository}).
 */
public record Resume(
        String id,
        String userId,
        String filename,
        String filetype,
        String extractedText) {
}
