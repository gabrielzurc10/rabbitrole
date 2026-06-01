module "rabbitrole" {
  source = "../../modules/rabbitrole"

  env    = "dev"
  region = var.region

  openai_api_key = var.openai_api_key
  adzuna_app_id  = var.adzuna_app_id
  adzuna_app_key = var.adzuna_app_key

  # Dev stays cheap: auto-pause to $0, no budget email.
  db_min_capacity = 0
  db_max_capacity = 1
}

output "api_url" {
  value = module.rabbitrole.api_url
}

output "cloudfront_domain" {
  value = module.rabbitrole.cloudfront_domain
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
