package com.rabbitrole.resume.dto;

/**
 * Short-lived URLs the browser hits directly (presigned S3) to render the resume
 * inline ({@code viewUrl}) or save it ({@code downloadUrl}). Both are {@code null}
 * in local dev, where the client falls back to streaming the bytes.
 */
public record ResumeFileUrls(String viewUrl, String downloadUrl) {
}
