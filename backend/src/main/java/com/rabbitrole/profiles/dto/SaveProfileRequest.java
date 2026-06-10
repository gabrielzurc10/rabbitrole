package com.rabbitrole.profiles.dto;

import com.rabbitrole.profiles.CityPreference;
import com.rabbitrole.profiles.EmploymentType;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;

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
        @NotBlank @Size(max = 200) String fullName,
        // Roles feed the analysis prompt + JSearch query, so bound both the count and
        // each role's length rather than trusting client input.
        @NotEmpty @Size(max = 20) List<@NotBlank @Size(max = 200) String> targetRoles,
        boolean remote,
        List<EmploymentType> employmentTypes,
        @Valid @Size(max = 50) List<CityPreference> cities,
        @Size(max = 100) String resumeId,
        @Size(max = 100) String analysisId,
        Integer score) {
}
