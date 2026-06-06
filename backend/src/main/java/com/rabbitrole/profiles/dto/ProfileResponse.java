package com.rabbitrole.profiles.dto;

import com.rabbitrole.profiles.CityPreference;
import com.rabbitrole.profiles.EmploymentType;

import java.time.Instant;
import java.util.List;

/** The signed-in user's profile, returned to the frontend. */
public record ProfileResponse(
        String fullName,
        List<String> targetRoles,
        boolean remote,
        List<EmploymentType> employmentTypes,
        List<CityPreference> cities,
        String resumeId,
        String analysisId,
        Integer score,
        Instant updatedAt) {
}
