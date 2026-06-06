package com.rabbitrole.profiles;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.json.JsonMapper;
import com.rabbitrole.common.ApiException;
import com.rabbitrole.persistence.Dynamo;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Repository;
import software.amazon.awssdk.services.dynamodb.model.AttributeValue;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * DynamoDB {@link ProfileRepository} — one item per user, keyed by {@code user_id}.
 * {@code targetRoles}, {@code employmentTypes} and {@code cities} are stored as JSON
 * strings (Jackson round-trip, like the old jsonb); scalars are native attributes.
 * Replaces {@link InMemoryProfileRepository} under the aws profile. The profile
 * annotation is fully qualified to avoid clashing with the domain {@link Profile}.
 */
@Repository
@org.springframework.context.annotation.Profile("aws")
public class DynamoProfileRepository implements ProfileRepository {

    private static final String TABLE = "profiles";
    private static final String KEY = "user_id";

    // Ignore unknown fields so cities saved before proximity was removed (they still
    // carry a stray "distanceMiles") deserialize cleanly into the slimmed CityPreference.
    private final ObjectMapper json = JsonMapper.builder()
            .disable(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES)
            .build();
    private final Dynamo db;

    public DynamoProfileRepository(Dynamo db) {
        this.db = db;
    }

    @Override
    public Profile save(Profile profile) {
        Map<String, AttributeValue> item = Dynamo.item();
        Dynamo.putS(item, KEY, profile.userId());
        Dynamo.putS(item, "full_name", profile.fullName());
        Dynamo.putS(item, "target_roles", write(profile.targetRoles()));
        Dynamo.putBool(item, "remote", profile.remote());
        Dynamo.putS(item, "employment_types", write(profile.employmentTypes()));
        Dynamo.putS(item, "cities", write(profile.cities()));
        Dynamo.putS(item, "resume_id", profile.resumeId());
        Dynamo.putS(item, "analysis_id", profile.analysisId());
        Dynamo.putN(item, "score", profile.score());
        Dynamo.putS(item, "updated_at", profile.updatedAt().toString());
        db.put(TABLE, item);
        return profile;
    }

    @Override
    public Optional<Profile> findByUserId(String userId) {
        return db.get(TABLE, KEY, userId).map(item -> new Profile(
                Dynamo.getS(item, KEY),
                Dynamo.getS(item, "full_name"),
                readRoles(Dynamo.getS(item, "target_roles")),
                Dynamo.getBool(item, "remote"),
                readTypes(Dynamo.getS(item, "employment_types")),
                readCities(Dynamo.getS(item, "cities")),
                Dynamo.getS(item, "resume_id"),
                Dynamo.getS(item, "analysis_id"),
                Dynamo.getN(item, "score"),
                Instant.parse(Dynamo.getS(item, "updated_at"))));
    }

    @Override
    public void deleteByUserId(String userId) {
        db.delete(TABLE, KEY, userId);
    }

    private String write(Object value) {
        try {
            return json.writeValueAsString(value);
        } catch (Exception e) {
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR,
                    "Could not serialize profile: " + e.getMessage());
        }
    }

    private List<String> readRoles(String raw) {
        try {
            return json.readValue(raw, new TypeReference<List<String>>() {});
        } catch (Exception e) {
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR,
                    "Could not read target roles: " + e.getMessage());
        }
    }

    private List<CityPreference> readCities(String raw) {
        try {
            return json.readValue(raw, new TypeReference<List<CityPreference>>() {});
        } catch (Exception e) {
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR,
                    "Could not read cities: " + e.getMessage());
        }
    }

    /** Employment types from the JSON attribute; absent (legacy/empty) means "any type". */
    private List<EmploymentType> readTypes(String raw) {
        if (raw == null || raw.isBlank()) {
            return List.of();
        }
        try {
            return json.readValue(raw, new TypeReference<List<EmploymentType>>() {});
        } catch (Exception e) {
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR,
                    "Could not read employment types: " + e.getMessage());
        }
    }
}
