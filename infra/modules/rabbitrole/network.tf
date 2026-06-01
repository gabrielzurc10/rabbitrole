# Minimal VPC that exists ONLY to host Aurora. Lambda stays OUTSIDE the VPC and
# talks to the DB via the RDS Data API, so there's no NAT Gateway (~$32/mo saved).

data "aws_availability_zones" "available" {
  state = "available"
}

resource "aws_vpc" "main" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_support   = true
  enable_dns_hostnames = true
  tags                 = merge(local.tags, { Name = "${local.name}-vpc" })
}

# Two private subnets (Aurora requires a subnet group spanning >=2 AZs).
resource "aws_subnet" "private" {
  count             = 2
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.${count.index + 1}.0/24"
  availability_zone = data.aws_availability_zones.available.names[count.index]
  tags              = merge(local.tags, { Name = "${local.name}-private-${count.index}" })
}

resource "aws_db_subnet_group" "aurora" {
  name       = "${local.name}-db"
  subnet_ids = aws_subnet.private[*].id
  tags       = local.tags
}

# Aurora's security group. No ingress rules: the Data API reaches the cluster
# over AWS's internal control plane, not through the VPC network path.
resource "aws_security_group" "db" {
  name        = "${local.name}-db"
  description = "Aurora cluster security group (Data API access only)"
  vpc_id      = aws_vpc.main.id
  tags        = merge(local.tags, { Name = "${local.name}-db" })
}
