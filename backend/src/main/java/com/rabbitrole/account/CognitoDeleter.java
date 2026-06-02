package com.rabbitrole.account;

/**
 * Deletes the user's Cognito identity. A swap point like {@code S3Storage}:
 * a real implementation on aws, a no-op locally (see {@link NoopCognitoDeleter}).
 */
public interface CognitoDeleter {

    /** Deletes the Cognito user with this id (Cognito sub). Idempotent. */
    void deleteUser(String userId);
}
