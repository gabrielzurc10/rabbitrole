module "rabbitrole" {
  source = "../../modules/rabbitrole"

  env    = "dev"
  region = var.region

  openai_api_key  = var.openai_api_key
  jsearch_api_key = var.jsearch_api_key

  google_client_id     = var.google_client_id
  google_client_secret = var.google_client_secret

  domain                    = var.domain
  route53_zone_id           = var.route53_zone_id
  enable_ses_email          = var.enable_ses_email
  enable_custom_auth_domain = var.enable_custom_auth_domain
  enable_app_domain         = var.enable_app_domain
}

output "api_url" {
  value = module.rabbitrole.api_url
}

output "cloudfront_domain" {
  value = module.rabbitrole.cloudfront_domain
}

output "app_url" {
  value = module.rabbitrole.app_url
}

output "cloudfront_distribution_id" {
  value = module.rabbitrole.cloudfront_distribution_id
}

output "frontend_bucket" {
  value = module.rabbitrole.frontend_bucket
}

output "artifacts_bucket" {
  value = module.rabbitrole.artifacts_bucket
}

output "lambda_function_name" {
  value = module.rabbitrole.lambda_function_name
}

output "lambda_alias" {
  value = module.rabbitrole.lambda_alias
}

output "cognito_user_pool_id" {
  value = module.rabbitrole.cognito_user_pool_id
}

output "cognito_client_id" {
  value = module.rabbitrole.cognito_client_id
}

output "cognito_hosted_ui_domain" {
  value = module.rabbitrole.cognito_hosted_ui_domain
}

output "google_oauth_redirect_uri" {
  value = module.rabbitrole.google_oauth_redirect_uri
}

output "cognito_issuer" {
  value = module.rabbitrole.cognito_issuer
}

output "resource_group" {
  value = module.rabbitrole.resource_group
}

# DNS records to add for the SES email sender (paste at your registrar unless
# route53_zone_id is set). Run: terraform output ses_dns_records
output "ses_dns_records" {
  value = module.rabbitrole.ses_dns_records
}

output "ses_identity_arn" {
  value = module.rabbitrole.ses_identity_arn
}
