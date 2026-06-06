package com.rabbitrole.resume;

import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

/**
 * In-memory {@link ResumeRepository} so the service runs without a database.
 * Default for local + tests; {@link DynamoResumeRepository} takes over on aws.
 */
@Repository
@Profile("!aws")
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

    @Override
    public List<String> idsByUserId(String userId) {
        return store.values().stream()
                .filter(r -> userId.equals(r.userId()))
                .map(Resume::id)
                .collect(Collectors.toList());
    }

    @Override
    public void deleteById(String id) {
        store.remove(id);
    }

    @Override
    public void deleteByUserId(String userId) {
        store.values().removeIf(r -> userId.equals(r.userId()));
    }
}
