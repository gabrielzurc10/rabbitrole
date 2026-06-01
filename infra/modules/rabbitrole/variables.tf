variable "env" {
  description = "Environment name (dev|prod). Prefixes all resource names."
  type        = string
}

variable "region" {
  description = "AWS region."
  type        = string
}

variable "openai_api_key" {
  description = "OpenAI API key (stored in SSM, read by Lambda). Pass via TF_VAR."
  type        = string
  sensitive   = true
}

variable "adzuna_app_id" {
  description = "Adzuna app id."
  type        = string
  sensitive   = true
}

variable "adzuna_app_key" {
  description = "Adzuna app key."
  type        = string
  sensitive   = true
}

variable "db_min_capacity" {
  description = "Aurora Serverless v2 minimum ACUs. 0 enables auto-pause to $0."
  type        = number
  default     = 0
}

variable "db_max_capacity" {
  description = "Aurora Serverless v2 maximum ACUs."
  type        = number
  default     = 1
}

variable "budget_limit_usd" {
  description = "Monthly budget alarm threshold."
  type        = number
  default     = 10
}

variable "budget_notify_email" {
  description = "Email for the budget alarm. Empty disables the budget."
  type        = string
  default     = ""
}

locals {
  name = "rabbitrole-${var.env}"
  tags = {
    Project   = "rabbitrole"
    ManagedBy = "terraform"
    Env       = var.env
  }
}
