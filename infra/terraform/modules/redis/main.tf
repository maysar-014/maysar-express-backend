# Redis (ElastiCache) Module for Maysar

# Redis Subnet Group
resource "aws_elasticache_subnet_group" "main" {
  name       = "maysar-${var.environment}-redis-subnet-group"
  subnet_ids = var.private_subnets

  tags = {
    Name = "maysar-${var.environment}-redis-subnet-group"
  }
}

# Redis Parameter Group
resource "aws_elasticache_parameter_group" "main" {
  family = "redis7"
  name   = "maysar-${var.environment}-redis-params"

  parameter {
    name  = "maxmemory-policy"
    value = "allkeys-lru"
  }

  parameter {
    name  = "tcp-keepalive"
    value = "300"
  }

  parameter {
    name  = "timeout"
    value = "300"
  }

  parameter {
    name  = "maxclients"
    value = "65000"
  }

  parameter {
    name  = "databases"
    value = "16"
  }

  tags = {
    Name = "maysar-${var.environment}-redis-params"
  }
}

# KMS Key for Redis encryption
resource "aws_kms_key" "redis" {
  description             = "KMS key for Redis cluster encryption"
  deletion_window_in_days = 30
  enable_key_rotation     = true

  tags = {
    Name = "maysar-${var.environment}-redis-kms"
  }
}

resource "aws_kms_alias" "redis" {
  name          = "alias/maysar-${var.environment}-redis"
  target_key_id = aws_kms_key.redis.key_id
}

# Redis Replication Group (Cluster Mode Enabled)
resource "aws_elasticache_replication_group" "main" {
  replication_group_id          = "maysar-${var.environment}-redis"
  description                   = "Maysar Redis cluster for ${var.environment}"
  node_type                     = var.node_type
  port                          = 6379
  parameter_group_name          = aws_elasticache_parameter_group.main.name
  subnet_group_name             = aws_elasticache_subnet_group.main.name
  security_group_ids            = [aws_security_group.redis.id]
  automatic_failover_enabled    = true
  multi_az_enabled              = var.multi_az_enabled
  num_cache_clusters            = var.num_cache_clusters
  num_node_groups               = var.num_node_groups
  replicas_per_node_group       = var.replicas_per_node_group
  snapshot_retention_limit      = var.snapshot_retention_limit
  snapshot_window               = var.snapshot_window
  maintenance_window            = var.maintenance_window
  at_rest_encryption_enabled     = true
  transit_encryption_enabled     = true
  kms_key_id                     = aws_kms_key.redis.arn
  apply_immediately              = var.apply_immediately

  # Enable data tiering for cost optimization (if using r6gd instances)
  data_tiering_enabled = var.enable_data_tiering

  tags = {
    Name = "maysar-${var.environment}-redis"
  }
}

# Security Group for Redis
resource "aws_security_group" "redis" {
  name_prefix = "maysar-${var.environment}-redis-"
  vpc_id      = var.vpc_id

  ingress {
    from_port   = 6379
    to_port     = 6379
    protocol    = "tcp"
    cidr_blocks = var.allowed_cidr_blocks
    description = "Redis access from allowed CIDR blocks"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "maysar-${var.environment}-redis-sg"
  }
}

# CloudWatch Alarms for Redis monitoring
resource "aws_cloudwatch_metric_alarm" "redis_cpu_utilization" {
  alarm_name          = "maysar-${var.environment}-redis-cpu-utilization"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "CPUUtilization"
  namespace           = "AWS/ElastiCache"
  period              = "300"
  statistic           = "Average"
  threshold           = "80"
  alarm_description   = "This metric monitors Redis CPU utilization"
  alarm_actions       = [] # Add SNS topic ARN for notifications

  dimensions = {
    CacheClusterId = aws_elasticache_replication_group.main.id
  }
}

resource "aws_cloudwatch_metric_alarm" "redis_freeable_memory" {
  alarm_name          = "maysar-${var.environment}-redis-freeable-memory"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "FreeableMemory"
  namespace           = "AWS/ElastiCache"
  period              = "300"
  statistic           = "Average"
  threshold           = "100000000" # 100MB in bytes
  alarm_description   = "This metric monitors Redis freeable memory"
  alarm_actions       = [] # Add SNS topic ARN for notifications

  dimensions = {
    CacheClusterId = aws_elasticache_replication_group.main.id
  }
}

resource "aws_cloudwatch_metric_alarm" "redis_curr_connections" {
  alarm_name          = "maysar-${var.environment}-redis-curr-connections"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "CurrConnections"
  namespace           = "AWS/ElastiCache"
  period              = "300"
  statistic           = "Average"
  threshold           = "1000"
  alarm_description   = "This metric monitors Redis current connections"
  alarm_actions       = [] # Add SNS topic ARN for notifications

  dimensions = {
    CacheClusterId = aws_elasticache_replication_group.main.id
  }
}

resource "aws_cloudwatch_metric_alarm" "redis_evictions" {
  alarm_name          = "maysar-${var.environment}-redis-evictions"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "Evictions"
  namespace           = "AWS/ElastiCache"
  period              = "300"
  statistic           = "Sum"
  threshold           = "100"
  alarm_description   = "This metric monitors Redis evictions"
  alarm_actions       = [] # Add SNS topic ARN for notifications

  dimensions = {
    CacheClusterId = aws_elasticache_replication_group.main.id
  }
}

# IAM Policy for Redis access
resource "aws_iam_policy" "redis_access" {
  name        = "maysar-${var.environment}-redis-access"
  description = "IAM policy for accessing Redis cluster"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "elasticache:DescribeReplicationGroups",
          "elasticache:DescribeCacheClusters",
          "elasticache:ListTagsForResource",
          "elasticache:DescribeCacheParameters",
          "elasticache:DescribeCacheParameterGroups",
          "elasticache:DescribeCacheSubnetGroups"
        ]
        Resource = [
          aws_elasticache_replication_group.main.arn,
          "${aws_elasticache_replication_group.main.arn}:*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "kms:Decrypt",
          "kms:DescribeKey"
        ]
        Resource = aws_kms_key.redis.arn
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

# Redis configuration for idempotency cache (separate smaller cluster)
resource "aws_elasticache_replication_group" "idempotency" {
  count = var.enable_idempotency_cache ? 1 : 0

  replication_group_id          = "maysar-${var.environment}-idempotency"
  description                   = "Maysar Redis for idempotency cache ${var.environment}"
  node_type                     = var.idempotency_node_type
  port                          = 6379
  parameter_group_name          = aws_elasticache_parameter_group.idempotency[0].name
  subnet_group_name             = aws_elasticache_subnet_group.main.name
  security_group_ids            = [aws_security_group.redis.id]
  automatic_failover_enabled    = false
  multi_az_enabled              = false
  num_cache_clusters            = 1
  snapshot_retention_limit      = 7
  snapshot_window               = var.snapshot_window
  maintenance_window            = var.maintenance_window
  at_rest_encryption_enabled     = true
  transit_encryption_enabled     = true
  kms_key_id                     = aws_kms_key.redis.arn
  apply_immediately              = var.apply_immediately

  tags = {
    Name = "maysar-${var.environment}-redis-idempotency"
  }
}

# Parameter group for idempotency cache
resource "aws_elasticache_parameter_group" "idempotency" {
  count = var.enable_idempotency_cache ? 1 : 0

  family = "redis7"
  name   = "maysar-${var.environment}-idempotency-params"

  parameter {
    name  = "maxmemory-policy"
    value = "allkeys-lru"
  }

  parameter {
    name  = "tcp-keepalive"
    value = "60"
  }

  parameter {
    name  = "timeout"
    value = "60"
  }

  tags = {
    Name = "maysar-${var.environment}-redis-idempotency-params"
  }
}
