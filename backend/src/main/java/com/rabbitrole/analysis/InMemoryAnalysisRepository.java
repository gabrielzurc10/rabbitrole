package com.rabbitrole.analysis;

import org.springframework.stereotype.Repository;

import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

/** In-memory {@link AnalysisRepository} so the service runs without a database. */
@Repository
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
}
