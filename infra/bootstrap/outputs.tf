output "state_bucket" {
  description = "Remote-state S3 bucket name (use in each env's backend.tf)."
  value       = aws_s3_bucket.state.id
}

output "lock_table" {
  description = "State-lock DynamoDB table name."
  value       = aws_dynamodb_table.lock.id
}

output "ci_access_key_id" {
  description = "Add to GitHub Secrets as AWS_ACCESS_KEY_ID."
  value       = aws_iam_access_key.ci.id
}

output "ci_secret_access_key" {
  description = "Add to GitHub Secrets as AWS_SECRET_ACCESS_KEY."
  value       = aws_iam_access_key.ci.secret
  sensitive   = true
}
