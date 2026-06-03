package com.rabbitrole.auth;

import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

/**
 * Local/demo {@link EmailUserProvisioner}: there's no Cognito pool offline and
 * the frontend runs in demo mode (no real sign-in), so this does nothing.
 */
@Component
@Profile("!aws")
public class NoopEmailUserProvisioner implements EmailUserProvisioner {

    @Override
    public String ensureUser(String email) {
        return null; // No Cognito locally.
    }
}
