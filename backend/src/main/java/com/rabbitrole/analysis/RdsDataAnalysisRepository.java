package com.rabbitrole.analysis;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.json.JsonMapper;
import com.rabbitrole.analysis.dto.Tag;
import com.rabbitrole.common.ApiException;
import com.rabbitrole.persistence.DataApi;
import org.springframework.context.annotation.Profile;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Repository;
import software.amazon.awssdk.services.rdsdata.model.ExecuteStatementResponse;
import software.amazon.awssdk.services.rdsdata.model.Field;

import java.util.List;
import java.util.Optional;

/**
 * RDS Data API {@link AnalysisRepository}. Tags are stored as a jsonb column
 * (serialized with Jackson) so the structured feedback round-trips intact.
 * Replaces {@link InMemoryAnalysisRepository} under the aws profile.
 */
@Repository
@Profile("aws")
public class RdsDataAnalysisRepository implements AnalysisRepository {

    private final ObjectMapper json = JsonMapper.builder().build();
    private final DataApi db;

    public RdsDataAnalysisRepository(DataApi db) {
        this.db = db;
    }

    @Override
    public Analysis save(Analysis analysis) {
        db.execute("""
                        INSERT INTO analyses (id, user_id, resume_id, role, tags, score, created_at)
                        VALUES (:id, :userId, :resumeId, :role, :tags, :score, :createdAt)
                        ON CONFLICT (id) DO UPDATE SET
                            role = EXCLUDED.role,
                            tags = EXCLUDED.tags,
                            score = EXCLUDED.score""",
                DataApi.str("id", analysis.id()),
                DataApi.str("userId", analysis.userId()),
                DataApi.str("resumeId", analysis.resumeId()),
                DataApi.str("role", analysis.role()),
                DataApi.json("tags", writeTags(analysis.tags())),
                DataApi.integer("score", analysis.score()),
                DataApi.timestamp("createdAt", analysis.createdAt()));
        return analysis;
    }

    @Override
    public Optional<Analysis> findById(String id) {
        ExecuteStatementResponse response = db.execute("""
                        SELECT id, user_id, resume_id, role, tags, score, created_at
                        FROM analyses WHERE id = :id""",
                DataApi.str("id", id));

        List<List<Field>> rows = response.records();
        if (rows.isEmpty()) {
            return Optional.empty();
        }
        List<Field> row = rows.get(0);
        Integer score = DataApi.integerValue(row, 5);
        return Optional.of(new Analysis(
                DataApi.string(row, 0),
                DataApi.string(row, 1),
                DataApi.string(row, 2),
                DataApi.string(row, 3),
                readTags(DataApi.string(row, 4)),
                score == null ? 0 : score,
                DataApi.instant(DataApi.string(row, 6))));
    }

    @Override
    public void deleteByUserId(String userId) {
        db.execute("DELETE FROM analyses WHERE user_id = :userId",
                DataApi.str("userId", userId));
    }

    private String writeTags(List<Tag> tags) {
        try {
            return json.writeValueAsString(tags);
        } catch (Exception e) {
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR,
                    "Could not serialize analysis tags: " + e.getMessage());
        }
    }

    private List<Tag> readTags(String raw) {
        try {
            return json.readValue(raw, new TypeReference<List<Tag>>() {});
        } catch (Exception e) {
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR,
                    "Could not read analysis tags: " + e.getMessage());
        }
    }
}
