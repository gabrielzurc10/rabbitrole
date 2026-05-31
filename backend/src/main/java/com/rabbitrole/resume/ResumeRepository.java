package com.rabbitrole.resume;

import java.util.Optional;

/**
 * Persistence boundary for resumes. Backed by an in-memory map now
 * ({@link InMemoryResumeRepository}); swapped for an RDS Data API
 * implementation with plain SQL in Phase 5 (no JPA — see CLAUDE.md).
 */
public interface ResumeRepository {

    Resume save(Resume resume);

    Optional<Resume> findById(String id);
}
