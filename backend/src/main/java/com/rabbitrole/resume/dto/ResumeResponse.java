package com.rabbitrole.resume.dto;

/**
 * What the API returns after an upload. The extracted text is what later
 * phases feed to the AI; we surface a short preview + length for now.
 */
public record ResumeResponse(
        String id,
        String filename,
        String filetype,
        int textLength,
        String textPreview) {
}
