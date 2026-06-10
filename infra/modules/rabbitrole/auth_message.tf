# Custom Message Lambda: brands Cognito's OTP / verification emails with the
# rabbitrole logo + styling instead of the plain default text. Wired onto the user
# pool via lambda_config.custom_message (auth.tf). Handler in lambdas/cognito-message/.
# Needs only CloudWatch Logs (no Cognito API calls). Always on — branding is
# independent of the SES sender and the domain flags; the logo URL just falls back
# to CloudFront when the app isn't on the custom domain yet.

locals {
  # Public app origin used for the email footer link (custom domain when serving
  # from it, else CloudFront).
  email_app_url = local.app_domain_enabled ? "https://${var.domain}" : "https://${aws_cloudfront_distribution.frontend.domain_name}"
}

data "archive_file" "cognito_message" {
  type        = "zip"
  source_dir  = "${path.module}/lambdas/cognito-message"
  output_path = "${path.module}/build/cognito-message.zip"
}

resource "aws_iam_role" "cognito_message" {
  name = "${local.name}-cognito-message"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
  tags = local.tags
}

resource "aws_iam_role_policy" "cognito_message" {
  name = "${local.name}-cognito-message"
  role = aws_iam_role.cognito_message.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["logs:CreateLogGroup", "logs:CreateLogStream", "logs:PutLogEvents"]
      Resource = "arn:aws:logs:*:*:*"
    }]
  })
}

resource "aws_lambda_function" "cognito_message" {
  function_name    = "${local.name}-cognito-message"
  role             = aws_iam_role.cognito_message.arn
  runtime          = "nodejs20.x"
  handler          = "index.handler"
  filename         = data.archive_file.cognito_message.output_path
  source_code_hash = data.archive_file.cognito_message.output_base64sha256
  timeout          = 5

  environment {
    variables = {
      APP_URL = local.email_app_url
    }
  }

  tags = local.tags
}

# Let the user pool invoke the trigger.
resource "aws_lambda_permission" "cognito_message" {
  statement_id  = "AllowCognitoInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.cognito_message.function_name
  principal     = "cognito-idp.amazonaws.com"
  source_arn    = aws_cognito_user_pool.main.arn
}
