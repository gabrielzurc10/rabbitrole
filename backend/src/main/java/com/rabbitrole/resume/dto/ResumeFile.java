package com.rabbitrole.resume.dto;

/**
 * The original uploaded file: its name + content type for the response headers
 * and the raw bytes to stream back for inline viewing / download.
 */
public record ResumeFile(String filename, String filetype, byte[] bytes) {
}
