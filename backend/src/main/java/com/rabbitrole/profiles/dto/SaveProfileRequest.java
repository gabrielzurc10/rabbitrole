package com.rabbitrole.profiles.dto;

import com.rabbitrole.profiles.CityPreference;
import com.rabbitrole.profiles.WorkMode;
import jakarta.validation.Valid;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.util.List;

/**
 * Create/update the signed-in user's profile. The first role in
 * {@code targetRoles} is the primary one used to score the resume. Cities are
 * required when the user commutes (HYBRID/IN_PERSON) and ignored for REMOTE.
 */
public record SaveProfileRequest(
        @NotBlank String fullName,
        @NotEmpty List<@NotBlank String> targetRoles,
        @NotNull WorkMode workMode,
        @Valid List<CityPreference> cities,
        String resumeId,
        String analysisId,
        Integer score) {

    @AssertTrue(message = "at least one city is required for in-person or hybrid work")
    public boolean isCitiesValid() {
        if (workMode == WorkMode.REMOTE) {
            return true;
        }
        return cities != null && !cities.isEmpty();
    }
}
