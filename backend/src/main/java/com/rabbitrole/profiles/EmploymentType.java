package com.rabbitrole.profiles;

/**
 * The kind of employment the user is after. Unlike the old experience level (which
 * had to be LLM-guessed), this maps to JSearch's native {@code job_employment_type}
 * field, so filtering is exact. Optional on a profile: an empty list means "any type".
 * {@link #apiValue()} is JSearch's enum form (from {@code job_employment_types}).
 */
public enum EmploymentType {
    FULL_TIME("FULLTIME"),
    CONTRACT("CONTRACTOR"),
    PART_TIME("PARTTIME"),
    INTERNSHIP("INTERN");

    private final String apiValue;

    EmploymentType(String apiValue) {
        this.apiValue = apiValue;
    }

    /** JSearch's enum value for this type (e.g. "FULLTIME"). */
    public String apiValue() {
        return apiValue;
    }

    /** Lowercase slug shared with the frontend + the {@code Job.employmentType} field. */
    public String slug() {
        return switch (this) {
            case FULL_TIME -> "full-time";
            case CONTRACT -> "contract";
            case PART_TIME -> "part-time";
            case INTERNSHIP -> "internship";
        };
    }

    /**
     * The {@link EmploymentType} for a JSearch employment-type value, or null. Tolerant of
     * both response shapes: the array {@code job_employment_types} (e.g. "FULLTIME") and the
     * singular {@code job_employment_type} (e.g. "Full-time") — non-letters are stripped and
     * case ignored, so "Full-time" → FULL_TIME, "Contractor" → CONTRACT, etc.
     */
    public static EmploymentType fromApi(String value) {
        if (value == null) {
            return null;
        }
        String normalized = value.replaceAll("[^A-Za-z]", "").toUpperCase(java.util.Locale.ROOT);
        for (EmploymentType t : values()) {
            if (t.apiValue.equals(normalized)) {
                return t;
            }
        }
        return null;
    }
}
