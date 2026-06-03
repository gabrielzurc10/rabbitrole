package com.rabbitrole.auth;

import com.rabbitrole.config.AwsProperties;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;
import software.amazon.awssdk.services.cognitoidentityprovider.CognitoIdentityProviderClient;
import software.amazon.awssdk.services.cognitoidentityprovider.model.AttributeType;
import software.amazon.awssdk.services.cognitoidentityprovider.model.ListUsersResponse;
import software.amazon.awssdk.services.cognitoidentityprovider.model.MessageActionType;
import software.amazon.awssdk.services.cognitoidentityprovider.model.UserStatusType;
import software.amazon.awssdk.services.cognitoidentityprovider.model.UserType;

import java.security.SecureRandom;
import java.util.Base64;

/**
 * Provisions email users in Cognito on aws. Sign-up is passwordless (email OTP),
 * so a brand-new address must be created + CONFIRMED before email-OTP sign-in
 * works — we create the user (no welcome email) and set a random, never-used
 * permanent password just to move them to CONFIRMED.
 *
 * <p>One account per email: if the address already belongs to a Google
 * (federated) account, we don't make a second native account — we return the
 * provider name so the caller can steer the user to Google. We look the address
 * up with ListUsers (which sees federated users), not AdminGetUser (which only
 * resolves native email aliases).
 */
@Component
@Profile("aws")
public class AwsEmailUserProvisioner implements EmailUserProvisioner {

    private final CognitoIdentityProviderClient cognito;
    private final AwsProperties props;
    private final SecureRandom random = new SecureRandom();

    public AwsEmailUserProvisioner(CognitoIdentityProviderClient cognito, AwsProperties props) {
        this.cognito = cognito;
        this.props = props;
    }

    @Override
    public String ensureUser(String email) {
        String poolId = props.getCognito().getUserPoolId();

        ListUsersResponse found = cognito.listUsers(b -> b
                .userPoolId(poolId)
                .filter("email = \"" + email + "\"")
                .limit(5));

        for (UserType user : found.users()) {
            if (user.userStatus() == UserStatusType.EXTERNAL_PROVIDER) {
                return "Google"; // email already owned by a federated (Google) account
            }
        }
        if (!found.users().isEmpty()) {
            return null; // native email user already exists — idempotent
        }

        cognito.adminCreateUser(b -> b
                .userPoolId(poolId)
                .username(email)
                .messageAction(MessageActionType.SUPPRESS)
                .userAttributes(
                        AttributeType.builder().name("email").value(email).build(),
                        AttributeType.builder().name("email_verified").value("true").build()));

        cognito.adminSetUserPassword(b -> b
                .userPoolId(poolId)
                .username(email)
                .password(randomPassword())
                .permanent(true));
        return null;
    }

    /** Random password that satisfies the default Cognito policy (never used). */
    private String randomPassword() {
        byte[] bytes = new byte[24];
        random.nextBytes(bytes);
        return "Aa1!" + Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }
}
