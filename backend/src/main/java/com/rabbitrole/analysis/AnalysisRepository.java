package com.rabbitrole.analysis;

import java.util.Optional;

/** Persistence boundary for analyses (in-memory now; RDS Data API in Phase 5). */
public interface AnalysisRepository {

    Analysis save(Analysis analysis);

    Optional<Analysis> findById(String id);

    void deleteByUserId(String userId);
}
