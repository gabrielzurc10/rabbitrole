output "api_url" {
  description = "Base URL of the backend HTTP API."
  value       = aws_apigatewayv2_api.http.api_endpoint
}

output "cloudfront_domain" {
  description = "Frontend CloudFront domain."
  value       = aws_cloudfront_distribution.frontend.domain_name
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

output "db_cluster_arn" {
  description = "Aurora cluster ARN (RDS Data API target)."
  value       = aws_rds_cluster.main.arn
}

output "db_secret_arn" {
  description = "Secrets Manager ARN for the DB master password."
  value       = aws_rds_cluster.main.master_user_secret[0].secret_arn
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

output "cognito_issuer" {
  description = "JWT issuer URL the backend validates Cognito tokens against."
  value       = local.cognito_issuer
}
