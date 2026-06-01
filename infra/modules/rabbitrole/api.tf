# Backend: ECR image -> Lambda (container) -> API Gateway HTTP API.
# Lambda runs OUTSIDE the VPC and reaches Aurora via the RDS Data API.

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

# Runtime permissions: Data API to Aurora, read its Secrets Manager password,
# read SSM secrets, and presign/fetch resumes in S3.
data "aws_iam_policy_document" "lambda_runtime" {
  statement {
    sid       = "DataApi"
    effect    = "Allow"
    actions   = ["rds-data:*"]
    resources = [aws_rds_cluster.main.arn]
  }
  statement {
    sid       = "DbSecret"
    effect    = "Allow"
    actions   = ["secretsmanager:GetSecretValue"]
    resources = [aws_rds_cluster.main.master_user_secret[0].secret_arn]
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
    actions   = ["s3:PutObject", "s3:GetObject"]
    resources = ["${aws_s3_bucket.resumes.arn}/*"]
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

  timeout     = 30
  memory_size = 1024

  environment {
    variables = {
      SPRING_PROFILES_ACTIVE = var.env
      DB_CLUSTER_ARN         = aws_rds_cluster.main.arn
      DB_SECRET_ARN          = aws_rds_cluster.main.master_user_secret[0].secret_arn
      DB_NAME                = aws_rds_cluster.main.database_name
      RESUMES_BUCKET         = aws_s3_bucket.resumes.id
      SSM_PREFIX             = "/rabbitrole/${var.env}"
    }
  }

  lifecycle {
    ignore_changes = [image_uri]
  }

  tags = local.tags
}

# --- API Gateway (HTTP API) ------------------------------------------------

resource "aws_apigatewayv2_api" "http" {
  name          = "${local.name}-api"
  protocol_type = "HTTP"
  cors_configuration {
    allow_origins = ["https://${aws_cloudfront_distribution.frontend.domain_name}"]
    allow_methods = ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
    allow_headers = ["*"]
  }
  tags = local.tags
}

resource "aws_apigatewayv2_integration" "lambda" {
  api_id                 = aws_apigatewayv2_api.http.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.backend.invoke_arn
  payload_format_version = "2.0"
}

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
