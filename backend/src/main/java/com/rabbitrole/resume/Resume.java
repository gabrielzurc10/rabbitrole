package com.rabbitrole.resume;

/**
 * A stored resume: its file metadata plus the full extracted text. Persisted to
 * DynamoDB on aws, in-memory locally (see {@link ResumeRepository}). The file
 * bytes live in S3; this is just the metadata + text.
 */
public record Resume(
        String id,
        String userId,
        String filename,
        String filetype,
        String extractedText) {
}
