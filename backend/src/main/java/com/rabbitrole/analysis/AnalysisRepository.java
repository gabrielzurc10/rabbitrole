package com.rabbitrole.analysis;

import java.util.Optional;

/** Persistence boundary for analyses (in-memory locally; DynamoDB on aws). */
public interface AnalysisRepository {

    Analysis save(Analysis analysis);

    Optional<Analysis> findById(String id);

    /** Delete the user's analyses except {@code keepId} — prunes superseded ones. */
    void deleteByUserIdExcept(String userId, String keepId);

    void deleteByUserId(String userId);
}
