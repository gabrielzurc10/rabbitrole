terraform {
  required_version = ">= 1.6"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
  # Bootstrap intentionally uses LOCAL state: it creates the very bucket/lock
  # table the other stacks use for remote state, so it can't depend on them.
}

provider "aws" {
  region = var.region
  default_tags {
    tags = {
      Project   = "rabbitrole"
      ManagedBy = "terraform"
      Stack     = "bootstrap"
    }
  }
}
