package com.rabbitrole.profiles.dto;

import com.rabbitrole.profiles.CityPreference;
import com.rabbitrole.profiles.EmploymentType;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;

import java.util.List;

/**
 * Create/update the signed-in user's profile. The first role in
 * {@code targetRoles} is the primary one used to score the resume. {@code remote}
 * is a single native toggle (true = remote-only search, no location needed);
 * {@code employmentTypes} is optional (empty = any type). Cities are optional: an
 * empty list for a local search means "all locations". Any city that IS supplied is
 * validated ({@code @Valid} → its city/state are not blank).
 */
public record SaveProfileRequest(
        @NotBlank String fullName,
        @NotEmpty List<@NotBlank String> targetRoles,
        boolean remote,
        List<EmploymentType> employmentTypes,
        @Valid List<CityPreference> cities,
        String resumeId,
        String analysisId,
        Integer score) {
}
