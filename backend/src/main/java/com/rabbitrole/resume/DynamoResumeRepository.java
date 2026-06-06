package com.rabbitrole.resume;

import com.rabbitrole.persistence.Dynamo;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Repository;
import software.amazon.awssdk.services.dynamodb.model.AttributeValue;

import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * DynamoDB {@link ResumeRepository} — items keyed by {@code id}, with a
 * {@code user_id-index} GSI so a user's resumes can be listed/pruned. Replaces
 * {@link InMemoryResumeRepository} under the aws profile.
 */
@Repository
@Profile("aws")
public class DynamoResumeRepository implements ResumeRepository {

    private static final String TABLE = "resumes";
    private static final String KEY = "id";
    private static final String USER_INDEX = "user_id-index";
    private static final String USER_KEY = "user_id";

    private final Dynamo db;

    public DynamoResumeRepository(Dynamo db) {
        this.db = db;
    }

    @Override
    public Resume save(Resume resume) {
        Map<String, AttributeValue> item = Dynamo.item();
        Dynamo.putS(item, KEY, resume.id());
        Dynamo.putS(item, USER_KEY, resume.userId());
        Dynamo.putS(item, "filename", resume.filename());
        Dynamo.putS(item, "filetype", resume.filetype());
        Dynamo.putS(item, "extracted_text", resume.extractedText());
        db.put(TABLE, item);
        return resume;
    }

    @Override
    public Optional<Resume> findById(String id) {
        return db.get(TABLE, KEY, id).map(item -> new Resume(
                Dynamo.getS(item, KEY),
                Dynamo.getS(item, USER_KEY),
                Dynamo.getS(item, "filename"),
                Dynamo.getS(item, "filetype"),
                Dynamo.getS(item, "extracted_text")));
    }

    @Override
    public List<String> idsByUserId(String userId) {
        return db.queryByIndex(TABLE, USER_INDEX, USER_KEY, userId).stream()
                .map(item -> Dynamo.getS(item, KEY))
                .toList();
    }

    @Override
    public void deleteById(String id) {
        db.delete(TABLE, KEY, id);
    }

    @Override
    public void deleteByUserId(String userId) {
        db.batchDelete(TABLE, KEY, idsByUserId(userId));
    }
}
