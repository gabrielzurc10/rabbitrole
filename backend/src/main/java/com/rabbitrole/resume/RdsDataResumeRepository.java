package com.rabbitrole.resume;

import com.rabbitrole.persistence.DataApi;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Repository;
import software.amazon.awssdk.services.rdsdata.model.ExecuteStatementResponse;
import software.amazon.awssdk.services.rdsdata.model.Field;

import java.util.List;
import java.util.Optional;

/**
 * RDS Data API {@link ResumeRepository} — plain SQL against Aurora (no JPA, per
 * CLAUDE.md). Replaces {@link InMemoryResumeRepository} under the aws profile.
 */
@Repository
@Profile("aws")
public class RdsDataResumeRepository implements ResumeRepository {

    private final DataApi db;

    public RdsDataResumeRepository(DataApi db) {
        this.db = db;
    }

    @Override
    public Resume save(Resume resume) {
        db.execute("""
                        INSERT INTO resumes (id, user_id, filename, filetype, extracted_text)
                        VALUES (:id, :userId, :filename, :filetype, :text)
                        ON CONFLICT (id) DO UPDATE SET
                            filename = EXCLUDED.filename,
                            filetype = EXCLUDED.filetype,
                            extracted_text = EXCLUDED.extracted_text""",
                DataApi.str("id", resume.id()),
                DataApi.str("userId", resume.userId()),
                DataApi.str("filename", resume.filename()),
                DataApi.str("filetype", resume.filetype()),
                DataApi.str("text", resume.extractedText()));
        return resume;
    }

    @Override
    public Optional<Resume> findById(String id) {
        ExecuteStatementResponse response = db.execute(
                "SELECT id, user_id, filename, filetype, extracted_text FROM resumes WHERE id = :id",
                DataApi.str("id", id));

        List<List<Field>> rows = response.records();
        if (rows.isEmpty()) {
            return Optional.empty();
        }
        List<Field> row = rows.get(0);
        return Optional.of(new Resume(
                DataApi.string(row, 0),
                DataApi.string(row, 1),
                DataApi.string(row, 2),
                DataApi.string(row, 3),
                DataApi.string(row, 4)));
    }

    @Override
    public void deleteByUserId(String userId) {
        db.execute("DELETE FROM resumes WHERE user_id = :userId",
                DataApi.str("userId", userId));
    }
}
