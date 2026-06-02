package com.rabbitrole.profiles;

import java.time.Instant;
import java.util.List;

/**
 * A user's onboarding profile — one row per user, keyed by their Cognito sub
 * (unlike resume/analysis which key on a random UUID). {@code resumeId},
 * {@code analysisId} and {@code score} are nullable, denormalized pointers to
 * the user's latest resume + analysis, so the profile page can show the current
 * score without an extra lookup.
 */
public record Profile(
        String userId,
        String fullName,
        List<String> targetRoles,
        WorkMode workMode,
        List<CityPreference> cities,
        String resumeId,
        String analysisId,
        Integer score,
        Instant updatedAt) {
}
