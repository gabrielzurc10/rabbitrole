package com.rabbitrole.auth;

/**
 * Ensures a Cognito user exists (CONFIRMED, email-verified) for an email so the
 * frontend's passwordless email-OTP sign-in works for brand-new addresses. A
 * swap point like {@code CognitoDeleter}: real on aws, a no-op locally.
 */
public interface EmailUserProvisioner {

    /**
     * Ensure a native email user exists for {@code email}, creating it if absent.
     *
     * @return the name of a federated provider (e.g. {@code "Google"}) that already
     *         owns this email — in which case no native user is created and the
     *         caller should steer the user to that provider — or {@code null} when
     *         a native email user is ready to receive a one-time code.
     */
    String ensureUser(String email);
}
