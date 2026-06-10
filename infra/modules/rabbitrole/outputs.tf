output "api_url" {
  description = "Base URL of the backend HTTP API."
  value       = aws_apigatewayv2_api.http.api_endpoint
}

output "cloudfront_domain" {
  description = "Frontend CloudFront domain."
  value       = aws_cloudfront_distribution.frontend.domain_name
}

output "app_url" {
  description = "Public URL the site is served from — the custom domain when enabled, else CloudFront."
  value       = local.app_domain_enabled ? "https://${var.domain}" : "https://${aws_cloudfront_distribution.frontend.domain_name}"
}

output "cloudfront_distribution_id" {
  description = "CloudFront distribution id (for cache invalidation on deploy)."
  value       = aws_cloudfront_distribution.frontend.id
}

output "frontend_bucket" {
  description = "S3 bucket the built site syncs to."
  value       = aws_s3_bucket.frontend.id
}

output "resumes_bucket" {
  description = "Private bucket for uploaded resumes."
  value       = aws_s3_bucket.resumes.id
}

output "ecr_repository_url" {
  description = "ECR repo CI pushes the backend image to."
  value       = aws_ecr_repository.backend.repository_url
}

output "cognito_user_pool_id" {
  description = "Cognito user pool id."
  value       = aws_cognito_user_pool.main.id
}

output "cognito_client_id" {
  description = "Cognito web app client id."
  value       = aws_cognito_user_pool_client.web.id
}

output "cognito_hosted_ui_domain" {
  description = "Hosted UI hostname the SPA redirects to for sign-in."
  value       = local.cognito_hosted_ui_domain
}

output "google_oauth_redirect_uri" {
  description = "The Authorized redirect URI to register in the Google OAuth client (and whose domain is the Google Authorized domain)."
  value       = "https://${local.cognito_hosted_ui_domain}/oauth2/idpresponse"
}

output "cognito_issuer" {
  description = "JWT issuer URL the backend validates Cognito tokens against."
  value       = local.cognito_issuer
}

output "resource_group" {
  description = "Console Resource Group listing all of this env's resources."
  value       = aws_resourcegroups_group.env.name
}

# --- SES email sender ------------------------------------------------------
# When route53_zone_id is set these records are created for you; otherwise add
# them at your registrar by hand. `terraform output ses_dns_records` prints them.

output "ses_dns_records" {
  description = "DNS records to add for the SES sender (DKIM CNAMEs, verification + MAIL FROM/SPF/DMARC). Empty when no domain is configured."
  value = local.ses_enabled ? merge(
    {
      "_amazonses.${var.domain}"      = { type = "TXT", value = aws_ses_domain_identity.main[0].verification_token }
      "${local.mail_from_domain}"     = { type = "MX", value = "10 feedback-smtp.${var.region}.amazonses.com" }
      "${local.mail_from_domain} spf" = { type = "TXT", value = "v=spf1 include:amazonses.com -all" }
      "_dmarc.${var.domain}"          = { type = "TXT", value = "v=DMARC1; p=none; rua=mailto:dmarc@${var.domain}" }
    },
    {
      for token in aws_ses_domain_dkim.main[0].dkim_tokens :
      "${token}._domainkey.${var.domain}" => { type = "CNAME", value = "${token}.dkim.amazonses.com" }
    }
  ) : {}
}

output "ses_identity_arn" {
  description = "ARN of the SES sending domain identity (empty when no domain). Check its verification status in the SES console before flipping enable_ses_email."
  value       = local.ses_enabled ? aws_ses_domain_identity.main[0].arn : ""
}
