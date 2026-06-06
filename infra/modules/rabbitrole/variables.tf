variable "env" {
  description = "Deployment name. Prefixes all resource names."
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

variable "jsearch_api_key" {
  description = "JSearch (RapidAPI) API key."
  type        = string
  sensitive   = true
}

variable "google_client_id" {
  description = "Google OAuth client id for Cognito's Google IdP. Empty disables Google sign-in."
  type        = string
  default     = ""
}

variable "google_client_secret" {
  description = "Google OAuth client secret. Pass via TF_VAR (never committed)."
  type        = string
  default     = ""
  sensitive   = true
}

locals {
  name = "rabbitrole-${var.env}"
  tags = {
    Project   = "rabbitrole"
    ManagedBy = "terraform"
    Env       = var.env
  }
}
