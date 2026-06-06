package com.rabbitrole.profiles;

import jakarta.validation.constraints.NotBlank;

/**
 * A place the user will work: city + state. Stored inside the profile's
 * {@code cities} jsonb; scopes the job search at city/metro level (JSearch has no
 * radius, so there's no commute-distance preference).
 */
public record CityPreference(
        @NotBlank String city,
        @NotBlank String state) {
}
