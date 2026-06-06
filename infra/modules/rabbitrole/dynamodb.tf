# App data in DynamoDB (profiles, resumes, analyses). On-demand billing — always
# warm (no auto-pause resume penalty), VPC-less, ~$0 at portfolio scale. Replaces
# the Aurora Serverless v2 + RDS Data API setup. Resume FILES still live in S3.

# Profiles: one item per user, keyed by Cognito sub.
resource "aws_dynamodb_table" "profiles" {
  name         = "${local.name}-profiles"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "user_id"

  attribute {
    name = "user_id"
    type = "S"
  }

  tags = local.tags
}

# Resumes: keyed by id, with a GSI on user_id to list/prune a user's resumes.
resource "aws_dynamodb_table" "resumes" {
  name         = "${local.name}-resumes"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "id"

  attribute {
    name = "id"
    type = "S"
  }
  attribute {
    name = "user_id"
    type = "S"
  }

  global_secondary_index {
    name            = "user_id-index"
    hash_key        = "user_id"
    projection_type = "KEYS_ONLY"
  }

  tags = local.tags
}

# Analyses: keyed by id, with a GSI on user_id for the prune-by-user deletes.
resource "aws_dynamodb_table" "analyses" {
  name         = "${local.name}-analyses"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "id"

  attribute {
    name = "id"
    type = "S"
  }
  attribute {
    name = "user_id"
    type = "S"
  }

  global_secondary_index {
    name            = "user_id-index"
    hash_key        = "user_id"
    projection_type = "KEYS_ONLY"
  }

  tags = local.tags
}
