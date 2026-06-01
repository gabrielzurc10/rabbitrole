# Secrets in SSM Parameter Store (free tier), read by the Lambda role at runtime.
# Never committed — values arrive via TF_VAR_* (locally and in CI).

resource "aws_ssm_parameter" "openai_api_key" {
  name  = "/rabbitrole/${var.env}/openai-api-key"
  type  = "SecureString"
  value = var.openai_api_key
  tags  = local.tags
}

resource "aws_ssm_parameter" "adzuna_app_id" {
  name  = "/rabbitrole/${var.env}/adzuna-app-id"
  type  = "SecureString"
  value = var.adzuna_app_id
  tags  = local.tags
}

resource "aws_ssm_parameter" "adzuna_app_key" {
  name  = "/rabbitrole/${var.env}/adzuna-app-key"
  type  = "SecureString"
  value = var.adzuna_app_key
  tags  = local.tags
}
