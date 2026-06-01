variable "region" {
  type    = string
  default = "us-east-1"
}

variable "openai_api_key" {
  type      = string
  sensitive = true
}

variable "adzuna_app_id" {
  type      = string
  sensitive = true
}

variable "adzuna_app_key" {
  type      = string
  sensitive = true
}

variable "budget_notify_email" {
  description = "Email for the monthly budget alarm."
  type        = string
  default     = ""
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
