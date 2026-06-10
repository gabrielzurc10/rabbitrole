# Branded email sender (Amazon SES) so Cognito's email-OTP codes come FROM
# rabbitrole.com with DKIM + SPF alignment. Cognito's default sender has no
# domain authentication, which is why codes land in spam — SES with a verified
# domain is the fix.
#
# Everything here is gated on `var.domain` being set, so the stack still applies
# cleanly before a domain is wired up (same optional-resource pattern as the
# Google IdP). Roll-out is two phases so an apply never fails on an unverified
# identity:
#   1. Set `domain` and apply. This creates the SES identity/DKIM/MAIL-FROM and
#      writes all the DNS records into the domain's Route 53 hosted zone (looked
#      up automatically). SES auto-verifies within minutes of DNS propagating;
#      then request SES production access in the console.
#   2. Flip `enable_ses_email = true` and apply. Cognito switches to the SES
#      sender (see the email_configuration block in auth.tf).

locals {
  ses_enabled      = var.domain != ""
  mail_from_domain = local.ses_enabled ? "mail.${var.domain}" : ""
  # rabbitrole.com is registered in Route 53, so its public hosted zone already
  # exists — look it up and manage every SES DNS record in-stack (no manual
  # paste). route53_zone_id is just an override for when the zone lives elsewhere.
  zone_id    = local.ses_enabled ? (var.route53_zone_id != "" ? var.route53_zone_id : data.aws_route53_zone.main[0].zone_id) : ""
  manage_dns = local.ses_enabled
}

data "aws_caller_identity" "current" {}

# The hosted zone Route 53 created when the domain was registered.
data "aws_route53_zone" "main" {
  count        = local.ses_enabled && var.route53_zone_id == "" ? 1 : 0
  name         = var.domain
  private_zone = false
}

# The verified sending domain. SES generates a verification token + DKIM tokens
# that become the DNS records below.
resource "aws_ses_domain_identity" "main" {
  count  = local.ses_enabled ? 1 : 0
  domain = var.domain
}

# Easy DKIM: three CNAMEs that let receivers cryptographically verify the mail —
# the single biggest deliverability lever.
resource "aws_ses_domain_dkim" "main" {
  count  = local.ses_enabled ? 1 : 0
  domain = aws_ses_domain_identity.main[0].domain
}

# Custom MAIL FROM (mail.rabbitrole.com) so SPF aligns to our own domain instead
# of amazonses.com — further improves inbox placement.
resource "aws_ses_domain_mail_from" "main" {
  count            = local.ses_enabled ? 1 : 0
  domain           = aws_ses_domain_identity.main[0].domain
  mail_from_domain = local.mail_from_domain
}

# Authorize the Cognito service to send using this identity, scoped to THIS user
# pool (the documented Cognito-over-SES pattern). Required once email_configuration
# points at the identity.
resource "aws_ses_identity_policy" "cognito" {
  count    = local.ses_enabled ? 1 : 0
  identity = aws_ses_domain_identity.main[0].arn
  name     = "${local.name}-cognito-send"
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid       = "AllowCognitoSend"
      Effect    = "Allow"
      Principal = { Service = "cognito-idp.amazonaws.com" }
      Action    = ["ses:SendEmail", "ses:SendRawEmail"]
      Resource  = aws_ses_domain_identity.main[0].arn
      Condition = {
        StringEquals = { "aws:SourceAccount" = data.aws_caller_identity.current.account_id }
        ArnEquals    = { "aws:SourceArn" = aws_cognito_user_pool.main.arn }
      }
    }]
  })
}

# ---------------------------------------------------------------------------
# DNS records, written into the domain's Route 53 hosted zone (resolved above).
# ---------------------------------------------------------------------------

# Domain ownership (TXT). Modern SES can verify via DKIM alone, but this is the
# explicit verification record and harmless to keep.
resource "aws_route53_record" "ses_verification" {
  count   = local.manage_dns ? 1 : 0
  zone_id = local.zone_id
  name    = "_amazonses.${var.domain}"
  type    = "TXT"
  ttl     = 600
  records = [aws_ses_domain_identity.main[0].verification_token]
}

resource "aws_route53_record" "dkim" {
  count   = local.manage_dns ? 3 : 0
  zone_id = local.zone_id
  name    = "${aws_ses_domain_dkim.main[0].dkim_tokens[count.index]}._domainkey.${var.domain}"
  type    = "CNAME"
  ttl     = 600
  records = ["${aws_ses_domain_dkim.main[0].dkim_tokens[count.index]}.dkim.amazonses.com"]
}

resource "aws_route53_record" "mail_from_mx" {
  count   = local.manage_dns ? 1 : 0
  zone_id = local.zone_id
  name    = local.mail_from_domain
  type    = "MX"
  ttl     = 600
  records = ["10 feedback-smtp.${var.region}.amazonses.com"]
}

resource "aws_route53_record" "mail_from_spf" {
  count   = local.manage_dns ? 1 : 0
  zone_id = local.zone_id
  name    = local.mail_from_domain
  type    = "TXT"
  ttl     = 600
  records = ["v=spf1 include:amazonses.com -all"]
}

# DMARC — start in monitor mode (p=none); tighten to quarantine/reject later.
resource "aws_route53_record" "dmarc" {
  count   = local.manage_dns ? 1 : 0
  zone_id = local.zone_id
  name    = "_dmarc.${var.domain}"
  type    = "TXT"
  ttl     = 600
  records = ["v=DMARC1; p=none; rua=mailto:dmarc@${var.domain}"]
}
