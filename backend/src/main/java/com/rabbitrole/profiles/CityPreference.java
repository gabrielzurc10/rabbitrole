package com.rabbitrole.profiles;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;

/**
 * A place the user will commute to: city + state and how far they'll travel.
 * Stored inside the profile's {@code cities} jsonb; {@code distanceMiles} feeds
 * Adzuna's distance filter when matching jobs.
 */
public record CityPreference(
        @NotBlank String city,
        @NotBlank String state,
        @Positive int distanceMiles) {
}
