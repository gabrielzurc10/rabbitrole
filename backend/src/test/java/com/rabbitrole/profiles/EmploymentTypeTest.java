package com.rabbitrole.profiles;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class EmploymentTypeTest {

    @Test
    void fromApiAcceptsTheArrayFormat() {
        assertThat(EmploymentType.fromApi("FULLTIME")).isEqualTo(EmploymentType.FULL_TIME);
        assertThat(EmploymentType.fromApi("CONTRACTOR")).isEqualTo(EmploymentType.CONTRACT);
        assertThat(EmploymentType.fromApi("PARTTIME")).isEqualTo(EmploymentType.PART_TIME);
        assertThat(EmploymentType.fromApi("INTERN")).isEqualTo(EmploymentType.INTERNSHIP);
    }

    @Test
    void fromApiAcceptsTheSingularDisplayFormat() {
        // JSearch's singular `job_employment_type` is title-cased/hyphenated; the parser
        // must recognise it so untyped postings don't slip past the filter.
        assertThat(EmploymentType.fromApi("Full-time")).isEqualTo(EmploymentType.FULL_TIME);
        assertThat(EmploymentType.fromApi("Contractor")).isEqualTo(EmploymentType.CONTRACT);
        assertThat(EmploymentType.fromApi("Part-time")).isEqualTo(EmploymentType.PART_TIME);
        assertThat(EmploymentType.fromApi("Intern")).isEqualTo(EmploymentType.INTERNSHIP);
    }

    @Test
    void fromApiReturnsNullForUnknownOrMissing() {
        assertThat(EmploymentType.fromApi(null)).isNull();
        assertThat(EmploymentType.fromApi("")).isNull();
        assertThat(EmploymentType.fromApi("Temp")).isNull();
    }
}
