package com.rabbitrole.resume;

import java.util.List;
import java.util.Optional;

/**
 * Persistence boundary for resumes. In-memory by default
 * ({@link InMemoryResumeRepository}); DynamoDB on aws
 * ({@link DynamoResumeRepository}), no JPA — see CLAUDE.md.
 */
public interface ResumeRepository {

    Resume save(Resume resume);

    Optional<Resume> findById(String id);

    /** Ids of every resume owned by the user — used to prune superseded files. */
    List<String> idsByUserId(String userId);

    void deleteById(String id);

    void deleteByUserId(String userId);
}
