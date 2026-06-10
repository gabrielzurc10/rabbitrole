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

variable "domain" {
  description = "Custom domain for the branded SES email sender (e.g. rabbitrole.com). Empty disables SES, leaving Cognito on its default sender."
  type        = string
  default     = ""
}

variable "route53_zone_id" {
  description = "Optional override for the Route 53 hosted zone holding `domain`'s SES DNS records. Empty (default) auto-discovers the zone Route 53 created at registration; set this only if the zone lives elsewhere."
  type        = string
  default     = ""
}

variable "enable_ses_email" {
  description = "Switch Cognito to send email-OTP codes via SES from `domain`. Flip to true ONLY after the SES domain identity shows verified and SES has production access — otherwise the Cognito update fails."
  type        = bool
  default     = false
}

variable "enable_custom_auth_domain" {
  description = "Serve Cognito's Hosted UI from auth.<domain> (with an ACM cert) instead of the amazoncognito.com prefix. Enabling DESTROYS the prefix domain and changes the Hosted UI hostname — update NEXT_PUBLIC_COGNITO_DOMAIN and the Google redirect URI to match."
  type        = bool
  default     = false
}

variable "enable_app_domain" {
  description = "Serve the frontend from <domain> + www.<domain> (CloudFront aliases + ACM cert + Route 53). Update the frontend's NEXT_PUBLIC_API_URL/app origin and rebuild after enabling."
  type        = bool
  default     = false
}

locals {
  name = "rabbitrole-${var.env}"
  tags = {
    Project   = "rabbitrole"
    ManagedBy = "terraform"
    Env       = var.env
  }
}
