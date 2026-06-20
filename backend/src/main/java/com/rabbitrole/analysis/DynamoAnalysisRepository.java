package com.rabbitrole.analysis;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.json.JsonMapper;
import com.rabbitrole.analysis.dto.SubScores;
import com.rabbitrole.analysis.dto.Tag;
import com.rabbitrole.common.ApiException;
import com.rabbitrole.persistence.Dynamo;
import org.springframework.context.annotation.Profile;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Repository;
import software.amazon.awssdk.services.dynamodb.model.AttributeValue;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * DynamoDB {@link AnalysisRepository} — items keyed by {@code id}, with a
 * {@code user_id-index} GSI for the prune-by-user deletes. Tags are stored as a
 * JSON string (Jackson) so the structured feedback round-trips intact. Replaces
 * {@link InMemoryAnalysisRepository} under the aws profile.
 */
@Repository
@Profile("aws")
public class DynamoAnalysisRepository implements AnalysisRepository {

    private static final String TABLE = "analyses";
    private static final String KEY = "id";
    private static final String USER_INDEX = "user_id-index";
    private static final String USER_KEY = "user_id";

    private final ObjectMapper json = JsonMapper.builder().build();
    private final Dynamo db;

    public DynamoAnalysisRepository(Dynamo db) {
        this.db = db;
    }

    @Override
    public Analysis save(Analysis analysis) {
        Map<String, AttributeValue> item = Dynamo.item();
        Dynamo.putS(item, KEY, analysis.id());
        Dynamo.putS(item, USER_KEY, analysis.userId());
        Dynamo.putS(item, "resume_id", analysis.resumeId());
        Dynamo.putS(item, "role", analysis.role());
        Dynamo.putS(item, "tags", writeTags(analysis.tags()));
        Dynamo.putN(item, "score", analysis.score());
        if (analysis.subScores() != null) {
            Dynamo.putS(item, "sub_scores", writeJson(analysis.subScores()));
        }
        if (analysis.missingSkills() != null && !analysis.missingSkills().isEmpty()) {
            Dynamo.putS(item, "missing_skills", writeJson(analysis.missingSkills()));
        }
        Dynamo.putS(item, "created_at", analysis.createdAt().toString());
        db.put(TABLE, item);
        return analysis;
    }

    @Override
    public Optional<Analysis> findById(String id) {
        return db.get(TABLE, KEY, id).map(item -> {
            Integer score = Dynamo.getN(item, "score");
            return new Analysis(
                    Dynamo.getS(item, KEY),
                    Dynamo.getS(item, USER_KEY),
                    Dynamo.getS(item, "resume_id"),
                    Dynamo.getS(item, "role"),
                    readTags(Dynamo.getS(item, "tags")),
                    score == null ? 0 : score,
                    // Null/empty for analyses saved before the rubric was added.
                    readSubScores(Dynamo.getS(item, "sub_scores")),
                    readStrings(Dynamo.getS(item, "missing_skills")),
                    Instant.parse(Dynamo.getS(item, "created_at")));
        });
    }

    @Override
    public void deleteByUserIdExcept(String userId, String keepId) {
        List<String> ids = db.queryByIndex(TABLE, USER_INDEX, USER_KEY, userId).stream()
                .map(item -> Dynamo.getS(item, KEY))
                .filter(id -> !id.equals(keepId))
                .toList();
        db.batchDelete(TABLE, KEY, ids);
    }

    @Override
    public void deleteByUserId(String userId) {
        List<String> ids = db.queryByIndex(TABLE, USER_INDEX, USER_KEY, userId).stream()
                .map(item -> Dynamo.getS(item, KEY))
                .toList();
        db.batchDelete(TABLE, KEY, ids);
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

    private String writeJson(Object value) {
        try {
            return json.writeValueAsString(value);
        } catch (Exception e) {
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR,
                    "Could not serialize analysis field: " + e.getMessage());
        }
    }

    /** Null for pre-rubric records (the attribute is absent). */
    private SubScores readSubScores(String raw) {
        if (raw == null || raw.isBlank()) {
            return null;
        }
        try {
            return json.readValue(raw, SubScores.class);
        } catch (Exception e) {
            return null;
        }
    }

    /** Empty for pre-rubric records (the attribute is absent). */
    private List<String> readStrings(String raw) {
        if (raw == null || raw.isBlank()) {
            return List.of();
        }
        try {
            return json.readValue(raw, new TypeReference<List<String>>() {});
        } catch (Exception e) {
            return List.of();
        }
    }
}
