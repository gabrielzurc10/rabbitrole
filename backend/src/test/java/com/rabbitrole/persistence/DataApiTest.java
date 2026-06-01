package com.rabbitrole.persistence;

import org.junit.jupiter.api.Test;
import software.amazon.awssdk.services.rdsdata.model.SqlParameter;

import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Guards the timestamptz round-trip: the value we send via the Data API must
 * parse back to the same Instant, including when Postgres trims fractional
 * zeros from the returned string.
 */
class DataApiTest {

    @Test
    void timestampParameterRoundTripsToTheSameInstant() {
        Instant original = Instant.parse("2026-05-31T12:34:56.123456Z");

        SqlParameter param = DataApi.timestamp("createdAt", original);
        String rendered = param.value().stringValue();

        assertThat(DataApi.instant(rendered)).isEqualTo(original);
    }

    @Test
    void instantParsesValuesWithTrimmedFractionalSeconds() {
        // Postgres returns whole seconds without a fractional part.
        assertThat(DataApi.instant("2026-05-31 12:34:56"))
                .isEqualTo(Instant.parse("2026-05-31T12:34:56Z"));
    }
}
