# Aurora Serverless v2 (PostgreSQL) with the RDS Data API enabled and
# min capacity 0 so it auto-pauses to $0 when idle.

resource "aws_rds_cluster" "main" {
  cluster_identifier          = "${local.name}-db"
  engine                      = "aurora-postgresql"
  engine_mode                 = "provisioned"
  engine_version              = "16.6"
  database_name               = "rabbitrole"
  master_username             = "rabbitrole"
  manage_master_user_password = true # password stored in Secrets Manager

  db_subnet_group_name   = aws_db_subnet_group.aurora.name
  vpc_security_group_ids = [aws_security_group.db.id]

  # Lambda-out-of-VPC architecture hinges on this.
  enable_http_endpoint = true

  serverlessv2_scaling_configuration {
    min_capacity = var.db_min_capacity
    max_capacity = var.db_max_capacity
  }

  skip_final_snapshot = true
  apply_immediately   = true
  tags                = local.tags
}

resource "aws_rds_cluster_instance" "main" {
  cluster_identifier = aws_rds_cluster.main.id
  instance_class     = "db.serverless"
  engine             = aws_rds_cluster.main.engine
  engine_version     = aws_rds_cluster.main.engine_version
  tags               = local.tags
}
