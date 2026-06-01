package com.rabbitrole.analysis.dto;

import com.rabbitrole.analysis.Severity;

/**
 * One piece of resume feedback: what's wrong ({@code message}), why it matters
 * ({@code reason}), a concrete fix ({@code suggestion}), and where it applies
 * ({@code location}, e.g. a section or quoted snippet).
 */
public record Tag(
        Severity severity,
        String message,
        String reason,
        String suggestion,
        String location) {
}
