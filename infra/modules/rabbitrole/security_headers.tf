# Security response headers for the frontend (attached to the CloudFront behavior in
# cdn.tf). Adds HSTS, nosniff, clickjacking protection, a referrer policy, and a CSP.
#
# CSP notes — tuned to what the static-export SPA actually does, so it hardens without
# breaking the app:
#   - script/style 'unsafe-inline': Next's static export emits inline hydration scripts
#     and the app uses inline style attributes (e.g. the icon mask), so these are
#     required. (It means CSP is not a complete XSS shield here — the stronger lever is
#     not persisting the refresh token; tracked separately.)
#   - img-src https:  — employer logos come from arbitrary JSearch domains.
#   - frame-src blob: — the resume PDF preview renders a blob: URL in an <iframe>.
#   - connect-src     — the API (fetch + warm-up) and Cognito (token exchange / OTP).
locals {
  # The Cognito host for connect-src, derived as a plain string (not from the domain
  # resource) so the CSP -> CloudFront -> domain -> CloudFront dependency cycle is avoided.
  csp_cognito_host = local.use_custom_auth_domain ? local.auth_domain_name : "${local.name}.auth.${var.region}.amazoncognito.com"

  csp = join(" ", [
    "default-src 'self';",
    "base-uri 'self';",
    "object-src 'none';",
    "frame-ancestors 'none';",
    "frame-src 'self' blob:;",
    "form-action 'self';",
    "img-src 'self' data: https:;",
    "font-src 'self' data:;",
    "style-src 'self' 'unsafe-inline';",
    "script-src 'self' 'unsafe-inline';",
    "connect-src 'self' ${aws_apigatewayv2_api.http.api_endpoint} https://cognito-idp.${var.region}.amazonaws.com https://${local.csp_cognito_host};",
  ])
}

resource "aws_cloudfront_response_headers_policy" "security" {
  name = "${local.name}-security-headers"

  security_headers_config {
    content_type_options {
      override = true
    }
    frame_options {
      frame_option = "DENY"
      override     = true
    }
    referrer_policy {
      referrer_policy = "strict-origin-when-cross-origin"
      override        = true
    }
    strict_transport_security {
      # 2 years; applies to subdomains (auth/www are HTTPS). preload left off — it's an
      # irreversible browser-list commitment.
      access_control_max_age_sec = 63072000
      include_subdomains         = true
      preload                    = false
      override                   = true
    }
    content_security_policy {
      content_security_policy = local.csp
      override                = true
    }
  }
}
