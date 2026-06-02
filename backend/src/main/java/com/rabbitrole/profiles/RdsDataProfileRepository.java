package com.rabbitrole.profiles;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.json.JsonMapper;
import com.rabbitrole.common.ApiException;
import com.rabbitrole.persistence.DataApi;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Repository;
import software.amazon.awssdk.services.rdsdata.model.ExecuteStatementResponse;
import software.amazon.awssdk.services.rdsdata.model.Field;

import java.util.List;
import java.util.Optional;

/**
 * RDS Data API {@link ProfileRepository} — plain SQL against Aurora (no JPA).
 * {@code targetRoles} and {@code cities} are stored as jsonb (Jackson round-trip,
 * exactly like analysis tags). Upserts on user_id. Replaces
 * {@link InMemoryProfileRepository} under the aws profile. The profile annotation
 * is fully qualified to avoid clashing with the domain {@link Profile} record.
 */
@Repository
@org.springframework.context.annotation.Profile("aws")
public class RdsDataProfileRepository implements ProfileRepository {

    private final ObjectMapper json = JsonMapper.builder().build();
    private final DataApi db;

    public RdsDataProfileRepository(DataApi db) {
        this.db = db;
    }

    @Override
    public Profile save(Profile profile) {
        db.execute("""
                        INSERT INTO profiles
                            (user_id, full_name, target_roles, work_mode, cities,
                             resume_id, analysis_id, score, updated_at)
                        VALUES
                            (:userId, :fullName, :targetRoles, :workMode, :cities,
                             :resumeId, :analysisId, :score, :updatedAt)
                        ON CONFLICT (user_id) DO UPDATE SET
                            full_name    = EXCLUDED.full_name,
                            target_roles = EXCLUDED.target_roles,
                            work_mode    = EXCLUDED.work_mode,
                            cities       = EXCLUDED.cities,
                            resume_id    = EXCLUDED.resume_id,
                            analysis_id  = EXCLUDED.analysis_id,
                            score        = EXCLUDED.score,
                            updated_at   = EXCLUDED.updated_at""",
                DataApi.str("userId", profile.userId()),
                DataApi.str("fullName", profile.fullName()),
                DataApi.json("targetRoles", write(profile.targetRoles())),
                DataApi.str("workMode", profile.workMode().name()),
                DataApi.json("cities", write(profile.cities())),
                DataApi.str("resumeId", profile.resumeId()),
                DataApi.str("analysisId", profile.analysisId()),
                DataApi.integer("score", profile.score()),
                DataApi.timestamp("updatedAt", profile.updatedAt()));
        return profile;
    }

    @Override
    public Optional<Profile> findByUserId(String userId) {
        ExecuteStatementResponse response = db.execute("""
                        SELECT user_id, full_name, target_roles, work_mode, cities,
                               resume_id, analysis_id, score, updated_at
                        FROM profiles WHERE user_id = :userId""",
                DataApi.str("userId", userId));

        List<List<Field>> rows = response.records();
        if (rows.isEmpty()) {
            return Optional.empty();
        }
        List<Field> row = rows.get(0);
        return Optional.of(new Profile(
                DataApi.string(row, 0),
                DataApi.string(row, 1),
                readRoles(DataApi.string(row, 2)),
                WorkMode.valueOf(DataApi.string(row, 3)),
                readCities(DataApi.string(row, 4)),
                DataApi.string(row, 5),
                DataApi.string(row, 6),
                DataApi.integerValue(row, 7),
                DataApi.instant(DataApi.string(row, 8))));
    }

    @Override
    public void deleteByUserId(String userId) {
        db.execute("DELETE FROM profiles WHERE user_id = :userId",
                DataApi.str("userId", userId));
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
}
