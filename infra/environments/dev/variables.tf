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

# Branded SES email sender for Cognito's OTP codes (so they don't land in spam).
variable "domain" {
  type    = string
  default = "rabbitrole.com"
}

# Leave empty: the rabbitrole.com hosted zone (created at registration) is
# discovered automatically. Override only if the zone lives elsewhere.
variable "route53_zone_id" {
  type    = string
  default = ""
}

# Flip true only after the SES domain shows verified + has production access.
variable "enable_ses_email" {
  type    = bool
  default = false
}

# Serve the Cognito Hosted UI from auth.rabbitrole.com (branded Google OAuth).
variable "enable_custom_auth_domain" {
  type    = bool
  default = true
}

# Serve the frontend from rabbitrole.com + www.rabbitrole.com.
variable "enable_app_domain" {
  type    = bool
  default = true
}
