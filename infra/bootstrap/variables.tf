variable "region" {
  description = "AWS region for all rabbitrole resources."
  type        = string
  default     = "us-east-1"
}

variable "lock_table_name" {
  description = "DynamoDB table for Terraform state locking."
  type        = string
  default     = "rabbitrole-tflock"
}

variable "ci_user_name" {
  description = "IAM user GitHub Actions uses to deploy."
  type        = string
  default     = "rabbitrole-ci"
}
