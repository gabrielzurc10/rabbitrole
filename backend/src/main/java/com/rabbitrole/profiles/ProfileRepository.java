package com.rabbitrole.profiles;

import java.util.Optional;

/**
 * Persistence boundary for profiles. In-memory by default
 * ({@link InMemoryProfileRepository}); DynamoDB on aws
 * ({@link DynamoProfileRepository}). Keyed by userId (one profile per user).
 */
public interface ProfileRepository {

    Profile save(Profile profile);

    Optional<Profile> findByUserId(String userId);

    void deleteByUserId(String userId);
}
