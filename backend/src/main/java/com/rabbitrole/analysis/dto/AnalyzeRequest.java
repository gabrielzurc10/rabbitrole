package com.rabbitrole.analysis.dto;

import jakarta.validation.constraints.NotBlank;

/** Request to analyze an already-uploaded resume against a target role. */
public record AnalyzeRequest(
        @NotBlank String resumeId,
        @NotBlank String role) {
}
