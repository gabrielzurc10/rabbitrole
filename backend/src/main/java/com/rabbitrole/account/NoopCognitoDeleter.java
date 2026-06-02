package com.rabbitrole.account;

import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

/**
 * Local/demo {@link CognitoDeleter}: there's no Cognito pool offline, so account
 * deletion just clears the in-memory data. Active under the non-aws profile.
 */
@Component
@Profile("!aws")
public class NoopCognitoDeleter implements CognitoDeleter {

    @Override
    public void deleteUser(String userId) {
        // No Cognito locally — data deletion happens in AccountService.
    }
}
