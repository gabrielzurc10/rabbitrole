package com.rabbitrole.account;

import com.rabbitrole.config.AwsProperties;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;
import software.amazon.awssdk.services.cognitoidentityprovider.CognitoIdentityProviderClient;
import software.amazon.awssdk.services.cognitoidentityprovider.model.ListUsersResponse;

/**
 * Deletes the user from the Cognito pool on aws. The pool uses email as the
 * username, so the JWT {@code sub} is NOT the username — we resolve the username
 * via a {@code sub = "..."} ListUsers filter, then AdminDeleteUser. Idempotent:
 * a user already gone is a no-op.
 */
@Component
@Profile("aws")
public class AwsCognitoDeleter implements CognitoDeleter {

    private final CognitoIdentityProviderClient cognito;
    private final AwsProperties props;

    public AwsCognitoDeleter(CognitoIdentityProviderClient cognito, AwsProperties props) {
        this.cognito = cognito;
        this.props = props;
    }

    @Override
    public void deleteUser(String userId) {
        String poolId = props.getCognito().getUserPoolId();
        ListUsersResponse found = cognito.listUsers(b -> b
                .userPoolId(poolId)
                .filter("sub = \"" + userId + "\"")
                .limit(1));
        if (found.users().isEmpty()) {
            return;
        }
        String username = found.users().get(0).username();
        cognito.adminDeleteUser(b -> b.userPoolId(poolId).username(username));
    }
}
