variable "region" {
  type    = string
  default = "us-east-1"
}

# Secrets are injected via TF_VAR_openai_api_key etc. (never committed).
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
