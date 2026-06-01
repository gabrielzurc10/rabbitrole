provider "aws" {
  region = var.region
  default_tags {
    tags = {
      Project   = "rabbitrole"
      ManagedBy = "terraform"
      Env       = "prod"
    }
  }
}
