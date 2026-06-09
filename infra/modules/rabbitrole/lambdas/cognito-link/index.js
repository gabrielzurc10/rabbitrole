// Cognito Pre-Sign-Up trigger: one account per email.
//
// When someone signs up via a social provider (Google) using an email that already
// belongs to a native email-OTP user, link the social identity to that existing user so
// they share one account (`sub`) instead of creating a duplicate. Every other sign-up
// (native email, admin-created) passes through unchanged.
//
// The reverse direction — email-OTP for an address already on Google — is handled in the
// app (AwsEmailUserProvisioner), which steers the user to Google instead of making a
// second native account.
//
// Runtime: nodejs20.x bundles the AWS SDK v3, so no node_modules are shipped.

const {
  CognitoIdentityProviderClient,
  ListUsersCommand,
  AdminLinkProviderForUserCommand,
} = require("@aws-sdk/client-cognito-identity-provider");

const cognito = new CognitoIdentityProviderClient({});

exports.handler = async (event) => {
  const { userPoolId, userName, triggerSource } = event;
  const email = event.request && event.request.userAttributes
    ? event.request.userAttributes.email
    : undefined;

  // Only act on social (federated) sign-ups; native + admin-created flows are untouched.
  if (triggerSource !== "PreSignUp_ExternalProvider" || !email) {
    return event;
  }

  // Look up any pre-existing account with this email (sees federated + native users).
  const { Users = [] } = await cognito.send(
    new ListUsersCommand({
      UserPoolId: userPoolId,
      Filter: `email = "${email}"`,
      Limit: 5,
    }),
  );

  // The social user being created isn't in the pool yet, so any match is a prior account.
  const existing = Users.find((u) => u.Username !== userName);
  if (!existing) {
    return event; // first time this email is seen → let Cognito create the social user
  }

  // A social userName is "<Provider>_<sub>" (e.g. "Google_12345"); split it back out.
  const sep = userName.indexOf("_");
  const providerName = userName.slice(0, sep);
  const providerUserId = userName.slice(sep + 1);

  // Link the incoming social identity onto the existing (native) user, so this and all
  // future Google sign-ins resolve to that user's sub — no duplicate account.
  await cognito.send(
    new AdminLinkProviderForUserCommand({
      UserPoolId: userPoolId,
      DestinationUser: {
        ProviderName: "Cognito",
        ProviderAttributeValue: existing.Username,
      },
      SourceUser: {
        ProviderName: providerName,
        ProviderAttributeName: "Cognito_Subject",
        ProviderAttributeValue: providerUserId,
      },
    }),
  );

  return event;
};
