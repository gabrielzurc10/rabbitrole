terraform {
  required_version = ">= 1.6"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
  # Remote state in the bootstrap-created bucket; one state key per env.
  backend "s3" {
    bucket         = "rabbitrole-tfstate-275452507302"
    key            = "dev/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "rabbitrole-tflock"
    encrypt        = true
  }
}
