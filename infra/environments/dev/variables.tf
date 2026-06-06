variable "region" {
  type    = string
  default = "us-east-1"
}

# Secrets are injected via TF_VAR_openai_api_key etc. (never committed).
variable "openai_api_key" {
  type      = string
  sensitive = true
}

variable "jsearch_api_key" {
  type      = string
  sensitive = true
}

# Google OAuth client for Cognito's Google IdP. Optional — empty disables it.
variable "google_client_id" {
  type    = string
  default = ""
}

variable "google_client_secret" {
  type      = string
  default   = ""
  sensitive = true
}
