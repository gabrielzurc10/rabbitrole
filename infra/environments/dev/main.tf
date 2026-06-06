module "rabbitrole" {
  source = "../../modules/rabbitrole"

  env    = "dev"
  region = var.region

  openai_api_key  = var.openai_api_key
  jsearch_api_key = var.jsearch_api_key

  google_client_id     = var.google_client_id
  google_client_secret = var.google_client_secret
}

output "api_url" {
  value = module.rabbitrole.api_url
}

output "cloudfront_domain" {
  value = module.rabbitrole.cloudfront_domain
}

output "cloudfront_distribution_id" {
  value = module.rabbitrole.cloudfront_distribution_id
}

output "frontend_bucket" {
  value = module.rabbitrole.frontend_bucket
}

output "ecr_repository_url" {
  value = module.rabbitrole.ecr_repository_url
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

output "cognito_issuer" {
  value = module.rabbitrole.cognito_issuer
}

output "resource_group" {
  value = module.rabbitrole.resource_group
}
