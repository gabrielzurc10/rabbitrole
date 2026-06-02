terraform {
  required_version = ">= 1.6"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
  # Remote state in the bootstrap-created bucket; one state key per env. The
  # bucket name is account-specific, so it's supplied at init time via
  # -backend-config (see the Makefile) rather than hardcoded here.
  backend "s3" {
    key            = "dev/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "rabbitrole-tflock"
    encrypt        = true
  }
}
