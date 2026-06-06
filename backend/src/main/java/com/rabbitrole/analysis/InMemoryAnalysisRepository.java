package com.rabbitrole.analysis;

import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Repository;

import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

/**
 * In-memory {@link AnalysisRepository} so the service runs without a database.
 * Default for local + tests; {@link DynamoAnalysisRepository} takes over on aws.
 */
@Repository
@Profile("!aws")
public class InMemoryAnalysisRepository implements AnalysisRepository {

    private final Map<String, Analysis> store = new ConcurrentHashMap<>();

    @Override
    public Analysis save(Analysis analysis) {
        store.put(analysis.id(), analysis);
        return analysis;
    }

    @Override
    public Optional<Analysis> findById(String id) {
        return Optional.ofNullable(store.get(id));
    }

    @Override
    public void deleteByUserIdExcept(String userId, String keepId) {
        store.values().removeIf(a -> userId.equals(a.userId()) && !a.id().equals(keepId));
    }

    @Override
    public void deleteByUserId(String userId) {
        store.values().removeIf(a -> userId.equals(a.userId()));
    }
}
