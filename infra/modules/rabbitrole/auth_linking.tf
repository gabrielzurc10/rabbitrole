# One-account-per-email: a Cognito Pre-Sign-Up Lambda that links a Google (federated)
# sign-up to an existing native email-OTP user, so the same address never ends up with
# two separate accounts. Wired onto the user pool via `lambda_config.pre_sign_up`
# (see auth.tf). The handler lives in lambdas/cognito-link/.

data "archive_file" "cognito_link" {
  type        = "zip"
  source_dir  = "${path.module}/lambdas/cognito-link"
  output_path = "${path.module}/build/cognito-link.zip"
}

resource "aws_iam_role" "cognito_link" {
  name = "${local.name}-cognito-link"
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

resource "aws_iam_role_policy" "cognito_link" {
  name = "${local.name}-cognito-link"
  role = aws_iam_role.cognito_link.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["logs:CreateLogGroup", "logs:CreateLogStream", "logs:PutLogEvents"]
        Resource = "arn:aws:logs:*:*:*"
      },
      {
        Effect   = "Allow"
        Action   = ["cognito-idp:ListUsers", "cognito-idp:AdminLinkProviderForUser"]
        Resource = aws_cognito_user_pool.main.arn
      }
    ]
  })
}

resource "aws_lambda_function" "cognito_link" {
  function_name    = "${local.name}-cognito-link"
  role             = aws_iam_role.cognito_link.arn
  runtime          = "nodejs20.x"
  handler          = "index.handler"
  filename         = data.archive_file.cognito_link.output_path
  source_code_hash = data.archive_file.cognito_link.output_base64sha256
  timeout          = 10
  tags             = local.tags
}

# Let the user pool invoke the trigger.
resource "aws_lambda_permission" "cognito_link" {
  statement_id  = "AllowCognitoInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.cognito_link.function_name
  principal     = "cognito-idp.amazonaws.com"
  source_arn    = aws_cognito_user_pool.main.arn
}
