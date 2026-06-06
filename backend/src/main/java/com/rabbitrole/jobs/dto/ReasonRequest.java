package com.rabbitrole.jobs.dto;

import jakarta.validation.constraints.NotBlank;

/**
 * On-demand request for the reasoning behind a job's match score. The frontend
 * already holds the posting (jobs aren't persisted), so it sends the context
 * back; the resume side is resolved server-side from the caller's profile.
 */
public record ReasonRequest(
        @NotBlank String title,
        String company,
        String description,
        Integer matchPercent) {
}
