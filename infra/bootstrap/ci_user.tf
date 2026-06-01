# CI/CD deploy identity for GitHub Actions. Uses long-lived access keys stored
# as GitHub Secrets (per plan — not OIDC). Scoped to what the deploy needs.

resource "aws_iam_user" "ci" {
  name = var.ci_user_name
}

resource "aws_iam_access_key" "ci" {
  user = aws_iam_user.ci.name
}

# Portfolio-scale scope: broad enough to run `terraform apply` for the app
# stack + push images + sync the site, but bounded to this project's services.
data "aws_iam_policy_document" "ci" {
  statement {
    sid    = "TerraformState"
    effect = "Allow"
    actions = [
      "s3:ListBucket",
      "s3:GetObject",
      "s3:PutObject",
      "s3:DeleteObject",
    ]
    resources = [
      aws_s3_bucket.state.arn,
      "${aws_s3_bucket.state.arn}/*",
    ]
  }

  statement {
    sid    = "TerraformLock"
    effect = "Allow"
    actions = [
      "dynamodb:GetItem",
      "dynamodb:PutItem",
      "dynamodb:DeleteItem",
    ]
    resources = [aws_dynamodb_table.lock.arn]
  }

  statement {
    sid    = "AppDeploy"
    effect = "Allow"
    actions = [
      "s3:*",
      "cloudfront:*",
      "lambda:*",
      "ecr:*",
      "apigateway:*",
      "rds:*",
      "rds-data:*",
      "cognito-idp:*",
      "ssm:*",
      "iam:*",
      "ec2:*",
      "logs:*",
      "budgets:*",
      "acm:*",
      "secretsmanager:*",
    ]
    # Portfolio single-account scope. Tighten per-resource for a real org.
    resources = ["*"]
  }
}

resource "aws_iam_user_policy" "ci" {
  name   = "rabbitrole-ci-deploy"
  user   = aws_iam_user.ci.name
  policy = data.aws_iam_policy_document.ci.json
}
