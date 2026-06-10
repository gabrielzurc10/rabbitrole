# Cognito user pool: native email sign-in + Google as a federated IdP, fronted
# by the Cognito Hosted UI (OAuth 2.0 Authorization Code + PKCE for the SPA).
# Essentials tier — free under 10K MAU.

resource "aws_cognito_user_pool" "main" {
  name = "${local.name}-users"

  username_attributes      = ["email"]
  auto_verified_attributes = ["email"]

  # Email one-time code is the first auth factor. Cognito *requires* PASSWORD to
  # be listed too, but the web client enables no password flows and provisioned
  # users only get a random, unknown password — so sign-in is effectively
  # passwordless (the SPA always requests EMAIL_OTP). Google is federated and
  # unaffected by this policy.
  sign_in_policy {
    allowed_first_auth_factors = ["EMAIL_OTP", "PASSWORD"]
  }

  account_recovery_setting {
    recovery_mechanism {
      name     = "verified_email"
      priority = 1
    }
  }

  # One account per email: link a Google sign-up to an existing native user instead of
  # creating a duplicate (handler in auth_linking.tf / lambdas/cognito-link).
  # custom_message brands the OTP email with the logo (auth_message.tf).
  lambda_config {
    pre_sign_up    = aws_lambda_function.cognito_link.arn
    custom_message = aws_lambda_function.cognito_message.arn
  }

  # Send email-OTP codes via SES from our verified domain (email.tf) so they
  # land in the inbox, not spam. Absent until `enable_ses_email` is flipped on
  # (only after the SES identity is verified + has production access); until
  # then Cognito uses its default sender. Two-phase to keep applies safe.
  dynamic "email_configuration" {
    for_each = var.enable_ses_email && local.ses_enabled ? [1] : []
    content {
      email_sending_account = "DEVELOPER"
      source_arn            = aws_ses_domain_identity.main[0].arn
      from_email_address    = "rabbitrole <no-reply@${var.domain}>"
    }
  }

  tags = local.tags
}

# Hosted UI domain. Default: a free Cognito prefix domain
# (https://<prefix>.auth.<region>.amazoncognito.com). When enable_custom_auth_domain
# is on, this is replaced by the branded custom domain below (auth_domain.tf), so
# the Google OAuth redirect lives on rabbitrole.com instead of amazoncognito.com.
# A pool has one domain, so the two are mutually exclusive (count toggles).
resource "aws_cognito_user_pool_domain" "main" {
  count        = local.use_custom_auth_domain ? 0 : 1
  domain       = local.name
  user_pool_id = aws_cognito_user_pool.main.id
}

# Google federated IdP — only wired when credentials are supplied, so the stack
# still applies (and native email sign-in works) before the Google OAuth client
# exists. Pass google_client_id/secret via TF_VAR_* (see Makefile).
resource "aws_cognito_identity_provider" "google" {
  count = var.google_client_id != "" ? 1 : 0

  user_pool_id  = aws_cognito_user_pool.main.id
  provider_name = "Google"
  provider_type = "Google"

  provider_details = {
    client_id        = var.google_client_id
    client_secret    = var.google_client_secret
    authorize_scopes = "openid email profile"
  }

  # Map Google's claims onto the pool's standard attributes.
  attribute_mapping = {
    email    = "email"
    username = "sub"
  }
}

resource "aws_cognito_user_pool_client" "web" {
  name         = "${local.name}-web"
  user_pool_id = aws_cognito_user_pool.main.id

  generate_secret = false # public SPA client (uses PKCE, no secret)

  # Choice-based auth (USER_AUTH) drives the in-app email-OTP flow; no password
  # flows since the app is passwordless. Refresh keeps sessions alive.
  explicit_auth_flows = [
    "ALLOW_USER_AUTH",
    "ALLOW_REFRESH_TOKEN_AUTH",
  ]

  # OAuth Authorization Code + PKCE via the Hosted UI.
  allowed_oauth_flows_user_pool_client = true
  allowed_oauth_flows                  = ["code"]
  allowed_oauth_scopes                 = ["openid", "email", "profile"]
  callback_urls                        = local.auth_redirect_urls
  logout_urls                          = local.auth_redirect_urls

  # "Google" only appears once the IdP above is created.
  supported_identity_providers = compact([
    "COGNITO",
    var.google_client_id != "" ? "Google" : "",
  ])

  # Don't let the client reference "Google" before the IdP exists.
  depends_on = [aws_cognito_identity_provider.google]
}

locals {
  # Where the Hosted UI returns users after login/logout. CloudFront for the
  # deployed site; localhost:3000 so `npm run dev` can run the real flow too;
  # rabbitrole.com + www once the app is served from the custom domain.
  auth_redirect_urls = concat(
    [
      "https://${aws_cloudfront_distribution.frontend.domain_name}/login",
      "http://localhost:3000/login",
    ],
    local.app_domain_enabled ? [
      "https://${var.domain}/login",
      "https://www.${var.domain}/login",
    ] : [],
  )

  # JWT issuer the backend resource server validates against (api.tf / outputs).
  cognito_issuer = "https://cognito-idp.${var.region}.amazonaws.com/${aws_cognito_user_pool.main.id}"

  # Full Hosted UI hostname the SPA redirects to — the custom domain when enabled,
  # else the Cognito prefix host.
  cognito_hosted_ui_domain = local.use_custom_auth_domain ? local.auth_domain_name : "${aws_cognito_user_pool_domain.main[0].domain}.auth.${var.region}.amazoncognito.com"
}
