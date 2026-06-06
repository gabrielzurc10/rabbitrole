# Backend: ECR image -> Lambda (container) -> API Gateway HTTP API.
# Lambda runs OUTSIDE any VPC and reaches DynamoDB/S3/SSM over AWS's public APIs.

resource "aws_ecr_repository" "backend" {
  name         = "${local.name}-backend"
  force_delete = true # clean `terraform destroy`

  image_scanning_configuration {
    scan_on_push = true
  }
  tags = local.tags
}

# --- Lambda execution role -------------------------------------------------

data "aws_iam_policy_document" "lambda_assume" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "lambda" {
  name               = "${local.name}-lambda"
  assume_role_policy = data.aws_iam_policy_document.lambda_assume.json
  tags               = local.tags
}

resource "aws_iam_role_policy_attachment" "lambda_basic" {
  role       = aws_iam_role.lambda.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# Runtime permissions: DynamoDB app data (tables + their GSIs), read SSM secrets,
# and put/get/delete resumes in S3.
data "aws_iam_policy_document" "lambda_runtime" {
  statement {
    sid    = "DynamoDb"
    effect = "Allow"
    actions = [
      "dynamodb:GetItem",
      "dynamodb:PutItem",
      "dynamodb:Query",
      "dynamodb:DeleteItem",
      "dynamodb:BatchWriteItem",
    ]
    resources = [
      aws_dynamodb_table.profiles.arn,
      aws_dynamodb_table.resumes.arn,
      aws_dynamodb_table.analyses.arn,
      "${aws_dynamodb_table.resumes.arn}/index/*",
      "${aws_dynamodb_table.analyses.arn}/index/*",
    ]
  }
  statement {
    sid     = "SsmSecrets"
    effect  = "Allow"
    actions = ["ssm:GetParameter", "ssm:GetParameters", "ssm:GetParametersByPath"]
    resources = [
      "arn:aws:ssm:${var.region}:*:parameter/rabbitrole/${var.env}/*"
    ]
  }
  statement {
    sid       = "Resumes"
    effect    = "Allow"
    # Put = upload, Get = view/download, Delete = prune superseded files on
    # re-upload and erase files on account deletion.
    actions   = ["s3:PutObject", "s3:GetObject", "s3:DeleteObject"]
    resources = ["${aws_s3_bucket.resumes.arn}/*"]
  }
  # Account deletion (find user by sub, remove) + passwordless sign-up
  # provisioning (create/confirm an email user so email-OTP sign-in works).
  statement {
    sid    = "CognitoAdmin"
    effect = "Allow"
    actions = [
      "cognito-idp:ListUsers",
      "cognito-idp:AdminDeleteUser",
      "cognito-idp:AdminGetUser",
      "cognito-idp:AdminCreateUser",
      "cognito-idp:AdminSetUserPassword",
    ]
    resources = [aws_cognito_user_pool.main.arn]
  }
}

resource "aws_iam_role_policy" "lambda_runtime" {
  name   = "${local.name}-lambda-runtime"
  role   = aws_iam_role.lambda.id
  policy = data.aws_iam_policy_document.lambda_runtime.json
}

# --- Lambda function -------------------------------------------------------
# Placeholder image until CI pushes the real one (Phase 6). The image tag is
# updated out-of-band by `lambda update-function-code`, so changes to it here
# are ignored to avoid TF fighting the deploy pipeline.

resource "aws_lambda_function" "backend" {
  function_name = "${local.name}-backend"
  role          = aws_iam_role.lambda.arn
  package_type  = "Image"
  image_uri     = "${aws_ecr_repository.backend.repository_url}:latest"

  timeout = 30
  # Lambda CPU scales with memory; Spring Boot cold-starts much faster at 2 GB
  # (actual heap use is ~210 MB). The extra cost is negligible at portfolio idle.
  memory_size = 2048

  environment {
    variables = {
      SPRING_PROFILES_ACTIVE = var.env
      DYNAMO_TABLE_PREFIX    = local.name
      RESUMES_BUCKET         = aws_s3_bucket.resumes.id
      SSM_PREFIX             = "/rabbitrole/${var.env}"
      COGNITO_ISSUER_URI     = local.cognito_issuer
      COGNITO_USER_POOL_ID   = aws_cognito_user_pool.main.id
    }
  }

  lifecycle {
    ignore_changes = [image_uri]
  }

  tags = local.tags
}

# --- API Gateway (HTTP API) ------------------------------------------------

# CORS is handled by the Spring app (CorsConfig), not here — so we don't set
# cors_configuration (which would add duplicate Access-Control-* headers).
resource "aws_apigatewayv2_api" "http" {
  name          = "${local.name}-api"
  protocol_type = "HTTP"
  tags          = local.tags
}

resource "aws_apigatewayv2_integration" "lambda" {
  api_id                 = aws_apigatewayv2_api.http.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.backend.invoke_arn
  payload_format_version = "2.0"
}

# ANY so OPTIONS preflight also reaches the app — Spring Security's CorsFilter
# answers it (the app owns CORS now).
resource "aws_apigatewayv2_route" "proxy" {
  api_id    = aws_apigatewayv2_api.http.id
  route_key = "ANY /{proxy+}"
  target    = "integrations/${aws_apigatewayv2_integration.lambda.id}"
}

resource "aws_apigatewayv2_stage" "default" {
  api_id      = aws_apigatewayv2_api.http.id
  name        = "$default"
  auto_deploy = true
  tags        = local.tags
}

resource "aws_lambda_permission" "apigw" {
  statement_id  = "AllowApiGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.backend.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.http.execution_arn}/*/*"
}
