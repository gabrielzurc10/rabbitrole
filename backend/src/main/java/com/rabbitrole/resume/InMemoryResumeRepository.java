package com.rabbitrole.resume;

import org.springframework.stereotype.Repository;

import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

/** In-memory {@link ResumeRepository} so the service runs without a database. */
@Repository
public class InMemoryResumeRepository implements ResumeRepository {

    private final Map<String, Resume> store = new ConcurrentHashMap<>();

    @Override
    public Resume save(Resume resume) {
        store.put(resume.id(), resume);
        return resume;
    }

    @Override
    public Optional<Resume> findById(String id) {
        return Optional.ofNullable(store.get(id));
    }
}
