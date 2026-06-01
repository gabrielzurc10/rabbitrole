module "rabbitrole" {
  source = "../../modules/rabbitrole"

  env    = "prod"
  region = var.region

  openai_api_key = var.openai_api_key
  adzuna_app_id  = var.adzuna_app_id
  adzuna_app_key = var.adzuna_app_key

  google_client_id     = var.google_client_id
  google_client_secret = var.google_client_secret

  # Prod still auto-pauses but adds a budget alarm.
  db_min_capacity     = 0
  db_max_capacity     = 2
  budget_limit_usd    = 15
  budget_notify_email = var.budget_notify_email
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
