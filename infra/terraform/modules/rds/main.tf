# RDS PostgreSQL Module for Maysar Services

# RDS Subnet Group
resource "aws_db_subnet_group" "main" {
  name       = "maysar-${var.environment}-db-subnet-group"
  subnet_ids = var.database_subnets

  tags = {
    Name = "maysar-${var.environment}-db-subnet-group"
  }
}

# RDS Parameter Group
resource "aws_db_parameter_group" "main" {
  family = "postgres15"
  name   = "maysar-${var.environment}-db-params"

  parameter {
    name  = "log_statement"
    value = "all"
  }

  parameter {
    name  = "log_min_duration_statement"
    value = "1000"
  }

  parameter {
    name  = "shared_preload_libraries"
    value = "pg_stat_statements"
  }

  parameter {
    name  = "pg_stat_statements.track"
    value = "all"
  }

  parameter {
    name  = "pg_stat_statements.max"
    value = "10000"
  }

  parameter {
    name  = "log_connections"
    value = "1"
  }

  parameter {
    name  = "log_disconnections"
    value = "1"
  }

  tags = {
    Name = "maysar-${var.environment}-db-params"
  }
}

# RDS Cluster Parameter Group for Aurora
resource "aws_rds_cluster_parameter_group" "main" {
  family = "aurora-postgresql15"
  name   = "maysar-${var.environment}-cluster-params"

  parameter {
    name  = "log_statement"
    value = "all"
  }

  parameter {
    name  = "log_min_duration_statement"
    value = "1000"
  }

  parameter {
    name  = "shared_preload_libraries"
    value = "pg_stat_statements"
  }

  parameter {
    name  = "pg_stat_statements.track"
    value = "all"
  }

  parameter {
    name  = "pg_stat_statements.max"
    value = "10000"
  }

  parameter {
    name  = "log_connections"
    value = "1"
  }

  parameter {
    name  = "log_disconnections"
    value = "1"
  }

  tags = {
    Name = "maysar-${var.environment}-cluster-params"
  }
}

# KMS Key for RDS encryption
resource "aws_kms_key" "rds" {
  description             = "KMS key for RDS cluster encryption"
  deletion_window_in_days = 30
  enable_key_rotation     = true

  tags = {
    Name = "maysar-${var.environment}-rds-kms"
  }
}

resource "aws_kms_alias" "rds" {
  name          = "alias/maysar-${var.environment}-rds"
  target_key_id = aws_kms_key.rds.key_id
}

# RDS Aurora PostgreSQL Cluster
resource "aws_rds_cluster" "main" {
  cluster_identifier              = "maysar-${var.environment}-cluster"
  engine                         = "aurora-postgresql"
  engine_version                 = "15.4"
  database_name                  = var.database_name
  master_username                = var.master_username
  master_password                = var.master_password
  backup_retention_period        = var.backup_retention_period
  preferred_backup_window        = "03:00-04:00"
  preferred_maintenance_window   = "sun:04:00-sun:05:00"
  db_subnet_group_name           = aws_db_subnet_group.main.name
  db_cluster_parameter_group_name = aws_rds_cluster_parameter_group.main.name
  vpc_security_group_ids         = [aws_security_group.rds.id]
  storage_encrypted              = true
  kms_key_id                     = aws_kms_key.rds.arn
  deletion_protection            = var.deletion_protection
  skip_final_snapshot            = var.skip_final_snapshot
  final_snapshot_identifier      = var.final_snapshot_identifier
  snapshot_identifier            = var.snapshot_identifier

  # Enable performance insights
  performance_insights_enabled    = true
  performance_insights_kms_key_id = aws_kms_key.rds.arn
  performance_insights_retention_period = 7

  # Enable enhanced monitoring
  enabled_cloudwatch_logs_exports = [
    "postgresql"
  ]

  tags = {
    Name = "maysar-${var.environment}-rds-cluster"
  }
}

# RDS Cluster Instances
resource "aws_rds_cluster_instance" "main" {
  count = var.instance_count

  identifier         = "maysar-${var.environment}-instance-${count.index + 1}"
  cluster_identifier = aws_rds_cluster.main.id
  instance_class     = var.instance_class
  engine             = aws_rds_cluster.main.engine
  engine_version     = aws_rds_cluster.main.engine_version

  db_parameter_group_name = aws_db_parameter_group.main.name

  # Enable performance insights per instance
  performance_insights_enabled    = true
  performance_insights_kms_key_id = aws_kms_key.rds.arn

  # Enable enhanced monitoring
  monitoring_interval = 60
  monitoring_role_arn = aws_iam_role.rds_enhanced_monitoring.arn

  tags = {
    Name = "maysar-${var.environment}-rds-instance-${count.index + 1}"
  }
}

# IAM Role for RDS Enhanced Monitoring
resource "aws_iam_role" "rds_enhanced_monitoring" {
  name = "maysar-${var.environment}-rds-enhanced-monitoring"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "monitoring.rds.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "rds_enhanced_monitoring" {
  role       = aws_iam_role.rds_enhanced_monitoring.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonRDSEnhancedMonitoringRole"
}

# Security Group for RDS
resource "aws_security_group" "rds" {
  name_prefix = "maysar-${var.environment}-rds-"
  vpc_id      = var.vpc_id

  ingress {
    from_port   = 5432
    to_port     = 5432
    protocol    = "tcp"
    cidr_blocks = var.allowed_cidr_blocks
    description = "PostgreSQL access from allowed CIDR blocks"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "maysar-${var.environment}-rds-sg"
  }
}

# CloudWatch Alarms for RDS monitoring
resource "aws_cloudwatch_metric_alarm" "rds_cpu_utilization" {
  alarm_name          = "maysar-${var.environment}-rds-cpu-utilization"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "CPUUtilization"
  namespace           = "AWS/RDS"
  period              = "300"
  statistic           = "Average"
  threshold           = "80"
  alarm_description   = "This metric monitors RDS CPU utilization"
  alarm_actions       = [] # Add SNS topic ARN for notifications

  dimensions = {
    DBClusterIdentifier = aws_rds_cluster.main.id
  }
}

resource "aws_cloudwatch_metric_alarm" "rds_free_storage_space" {
  alarm_name          = "maysar-${var.environment}-rds-free-storage-space"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = "1"
  metric_name         = "FreeStorageSpace"
  namespace           = "AWS/RDS"
  period              = "300"
  statistic           = "Average"
  threshold           = "2000000000" # 2GB in bytes
  alarm_description   = "This metric monitors RDS free storage space"
  alarm_actions       = [] # Add SNS topic ARN for notifications

  dimensions = {
    DBClusterIdentifier = aws_rds_cluster.main.id
  }
}

resource "aws_cloudwatch_metric_alarm" "rds_database_connections" {
  alarm_name          = "maysar-${var.environment}-rds-database-connections"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "DatabaseConnections"
  namespace           = "AWS/RDS"
  period              = "300"
  statistic           = "Average"
  threshold           = "80"
  alarm_description   = "This metric monitors RDS database connections"
  alarm_actions       = [] # Add SNS topic ARN for notifications

  dimensions = {
    DBClusterIdentifier = aws_rds_cluster.main.id
  }
}

# IAM Policy for RDS access
resource "aws_iam_policy" "rds_access" {
  name        = "maysar-${var.environment}-rds-access"
  description = "IAM policy for accessing RDS cluster"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "rds:DescribeDBClusters",
          "rds:DescribeDBClusterParameters",
          "rds:DescribeDBInstances",
          "rds:DescribeDBParameters",
          "rds:DescribeDBSnapshots",
          "rds:CreateDBSnapshot",
          "rds:RestoreDBClusterFromSnapshot"
        ]
        Resource = [
          aws_rds_cluster.main.arn,
          "${aws_rds_cluster.main.arn}:*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "kms:Decrypt",
          "kms:DescribeKey"
        ]
        Resource = aws_kms_key.rds.arn
      },
      {
        Effect = "Allow"
        Action = [
          "cloudwatch:GetMetricStatistics",
          "cloudwatch:ListMetrics"
        ]
        Resource = "*"
      }
    ]
  })
}

# Create separate databases for each service
resource "postgresql_database" "auth" {
  name  = "auth_db"
  owner = var.master_username

  depends_on = [aws_rds_cluster_instance.main]
}

resource "postgresql_database" "order" {
  name  = "order_db"
  owner = var.master_username

  depends_on = [aws_rds_cluster_instance.main]
}

resource "postgresql_database" "payment" {
  name  = "payment_db"
  owner = var.master_username

  depends_on = [aws_rds_cluster_instance.main]
}

resource "postgresql_database" "seller" {
  name  = "seller_db"
  owner = var.master_username

  depends_on = [aws_rds_cluster_instance.main]
}

resource "postgresql_database" "catalog" {
  name  = "catalog_db"
  owner = var.master_username

  depends_on = [aws_rds_cluster_instance.main]
}

resource "postgresql_database" "inventory" {
  name  = "inventory_db"
  owner = var.master_username

  depends_on = [aws_rds_cluster_instance.main]
}

resource "postgresql_database" "logistics" {
  name  = "logistics_db"
  owner = var.master_username

  depends_on = [aws_rds_cluster_instance.main]
}

resource "postgresql_database" "commission" {
  name  = "commission_db"
  owner = var.master_username

  depends_on = [aws_rds_cluster_instance.main]
}

resource "postgresql_database" "trust" {
  name  = "trust_db"
  owner = var.master_username

  depends_on = [aws_rds_cluster_instance.main]
}

resource "postgresql_database" "notification" {
  name  = "notification_db"
  owner = var.master_username

  depends_on = [aws_rds_cluster_instance.main]
}

resource "postgresql_database" "admin" {
  name  = "admin_db"
  owner = var.master_username

  depends_on = [aws_rds_cluster_instance.main]
}

resource "postgresql_database" "analytics" {
  name  = "analytics_db"
  owner = var.master_username

  depends_on = [aws_rds_cluster_instance.main]
}

resource "postgresql_database" "community" {
  name  = "community_db"
  owner = var.master_username

  depends_on = [aws_rds_cluster_instance.main]
}

# PostgreSQL provider configuration
provider "postgresql" {
  host     = aws_rds_cluster.main.endpoint
  port     = 5432
  username = var.master_username
  password = var.master_password
  sslmode  = "require"
}
