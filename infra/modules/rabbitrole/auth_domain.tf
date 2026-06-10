# Branded Cognito Hosted-UI domain: auth.rabbitrole.com. With this on, the Google
# OAuth redirect (https://auth.rabbitrole.com/oauth2/idpresponse) lives on a domain
# you own, so rabbitrole.com can be the Google "Authorized domain" and the consent
# screen shows your name instead of a random amazoncognito.com host.
#
# Gated on enable_custom_auth_domain so it's fully optional. Requires var.domain set
# (the zone is resolved in email.tf as local.zone_id). The ACM cert MUST be in
# us-east-1 for a Cognito custom domain — fine here since the stack is us-east-1.
#
# One apply does it all (cert is DNS-validated against the records below, then the
# domain is created). Note: enabling this DESTROYS the prefix domain and CREATES the
# custom one, so the Hosted UI hostname changes — update the frontend's
# NEXT_PUBLIC_COGNITO_DOMAIN and the Google client's redirect URI to match (see the
# google_oauth_redirect_uri output).

locals {
  use_custom_auth_domain = var.domain != "" && var.enable_custom_auth_domain
  auth_domain_name       = var.domain != "" ? "auth.${var.domain}" : ""
}

# TLS cert for the auth subdomain (us-east-1, as Cognito requires).
resource "aws_acm_certificate" "auth" {
  count             = local.use_custom_auth_domain ? 1 : 0
  domain_name       = local.auth_domain_name
  validation_method = "DNS"

  lifecycle {
    create_before_destroy = true
  }

  tags = local.tags
}

# DNS records that prove domain control, so ACM issues the cert automatically.
resource "aws_route53_record" "auth_cert_validation" {
  for_each = local.use_custom_auth_domain ? {
    for o in aws_acm_certificate.auth[0].domain_validation_options : o.domain_name => {
      name   = o.resource_record_name
      type   = o.resource_record_type
      record = o.resource_record_value
    }
  } : {}

  zone_id         = local.zone_id
  name            = each.value.name
  type            = each.value.type
  ttl             = 300
  records         = [each.value.record]
  allow_overwrite = true
}

# Blocks until ACM reports the cert issued (usually a few minutes).
resource "aws_acm_certificate_validation" "auth" {
  count                   = local.use_custom_auth_domain ? 1 : 0
  certificate_arn         = aws_acm_certificate.auth[0].arn
  validation_record_fqdns = [for r in aws_route53_record.auth_cert_validation : r.fqdn]
}

# Cognito requires the PARENT domain (rabbitrole.com) to resolve before it will
# accept a custom auth subdomain. When the app isn't on the root domain yet, a
# placeholder A record satisfies that (198.51.100.1 is an RFC 5737 documentation
# IP — non-routable). Once enable_app_domain is on, the real apex alias in
# app_domain.tf takes over and this placeholder steps aside to avoid a conflict.
resource "aws_route53_record" "apex_placeholder" {
  count   = local.use_custom_auth_domain && !local.app_domain_enabled ? 1 : 0
  zone_id = local.zone_id
  name    = var.domain
  type    = "A"
  ttl     = 1800
  records = ["198.51.100.1"]
}

# The custom Hosted-UI domain itself.
resource "aws_cognito_user_pool_domain" "custom" {
  count           = local.use_custom_auth_domain ? 1 : 0
  domain          = local.auth_domain_name
  user_pool_id    = aws_cognito_user_pool.main.id
  certificate_arn = aws_acm_certificate_validation.auth[0].certificate_arn

  # Parent domain must resolve first (Cognito validates this) — whichever apex
  # record is active (placeholder, or the real app alias when enable_app_domain).
  depends_on = [aws_route53_record.apex_placeholder, aws_route53_record.app_apex]
}

# Point auth.rabbitrole.com at the CloudFront distribution Cognito provisions for
# the custom domain. Z2FDTNDATAQYW2 is CloudFront's fixed alias hosted-zone id.
resource "aws_route53_record" "auth_alias" {
  count   = local.use_custom_auth_domain ? 1 : 0
  zone_id = local.zone_id
  name    = local.auth_domain_name
  type    = "A"

  alias {
    name                   = aws_cognito_user_pool_domain.custom[0].cloudfront_distribution
    zone_id                = "Z2FDTNDATAQYW2"
    evaluate_target_health = false
  }
}
