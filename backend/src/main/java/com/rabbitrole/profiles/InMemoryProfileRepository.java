package com.rabbitrole.profiles;

import org.springframework.stereotype.Repository;

import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

/**
 * In-memory {@link ProfileRepository} so the app runs without a database.
 * Default for local + tests; {@link DynamoProfileRepository} takes over on aws.
 * The profile annotation is fully qualified to avoid clashing with the domain
 * {@link Profile} record in this package.
 */
@Repository
@org.springframework.context.annotation.Profile("!aws")
public class InMemoryProfileRepository implements ProfileRepository {

    private final Map<String, Profile> store = new ConcurrentHashMap<>();

    @Override
    public Profile save(Profile profile) {
        store.put(profile.userId(), profile);
        return profile;
    }

    @Override
    public Optional<Profile> findByUserId(String userId) {
        return Optional.ofNullable(store.get(userId));
    }

    @Override
    public void deleteByUserId(String userId) {
        store.remove(userId);
    }
}
