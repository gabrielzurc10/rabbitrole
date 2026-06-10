# Serve the frontend from rabbitrole.com (+ www) instead of the default
# *.cloudfront.net host. Gated on enable_app_domain so it's fully optional and
# the stack still applies without it. Requires var.domain set (zone resolved in
# email.tf as local.zone_id). The ACM cert MUST be in us-east-1 for CloudFront —
# fine here since the stack is us-east-1.
#
# One apply does it all: the cert is DNS-validated against the records below, the
# CloudFront distribution picks it up (cdn.tf) and serves the aliases, and the
# apex/www A-aliases point DNS at the distribution. A distribution update takes a
# few minutes to deploy to the edge.

locals {
  app_domain_enabled = var.domain != "" && var.enable_app_domain
  app_aliases        = var.domain != "" ? [var.domain, "www.${var.domain}"] : []

  # www.<domain> -> bare <domain> canonical 301, preserving path + query. Injected
  # into the CloudFront viewer-request function (cdn.tf); empty when the app domain
  # is off. A behavior allows only one viewer-request function, so the redirect and
  # the index.html rewrite share this one.
  www_redirect_body = <<-JS
    if (request.headers.host && request.headers.host.value === 'www.${var.domain}') {
      var q = '';
      for (var k in request.querystring) { q += (q ? '&' : '?') + k + (request.querystring[k].value ? '=' + request.querystring[k].value : ''); }
      return { statusCode: 301, statusDescription: 'Moved Permanently', headers: { location: { value: 'https://${var.domain}' + request.uri + q } } };
    }
  JS
  www_redirect_js   = local.app_domain_enabled ? local.www_redirect_body : ""
}

# TLS cert covering the apex and www (us-east-1, as CloudFront requires).
resource "aws_acm_certificate" "app" {
  count                     = local.app_domain_enabled ? 1 : 0
  domain_name               = var.domain
  subject_alternative_names = ["www.${var.domain}"]
  validation_method         = "DNS"

  lifecycle {
    create_before_destroy = true
  }

  tags = local.tags
}

resource "aws_route53_record" "app_cert_validation" {
  for_each = local.app_domain_enabled ? {
    for o in aws_acm_certificate.app[0].domain_validation_options : o.domain_name => {
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

resource "aws_acm_certificate_validation" "app" {
  count                   = local.app_domain_enabled ? 1 : 0
  certificate_arn         = aws_acm_certificate.app[0].arn
  validation_record_fqdns = [for r in aws_route53_record.app_cert_validation : r.fqdn]
}

# Point the apex and www at the CloudFront distribution (alias A records — no IP).
resource "aws_route53_record" "app_apex" {
  count   = local.app_domain_enabled ? 1 : 0
  zone_id = local.zone_id
  name    = var.domain
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.frontend.domain_name
    zone_id                = aws_cloudfront_distribution.frontend.hosted_zone_id
    evaluate_target_health = false
  }
}

resource "aws_route53_record" "app_www" {
  count   = local.app_domain_enabled ? 1 : 0
  zone_id = local.zone_id
  name    = "www.${var.domain}"
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.frontend.domain_name
    zone_id                = aws_cloudfront_distribution.frontend.hosted_zone_id
    evaluate_target_health = false
  }
}
