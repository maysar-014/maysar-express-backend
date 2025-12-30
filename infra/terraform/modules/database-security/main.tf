# Database Security Module for Maysar

# RDS Parameter Groups for Security
resource "aws_db_parameter_group" "security" {
  for_each = toset([
    "auth-service",
    "order-service",
    "payment-service",
    "seller-service",
    "catalog-service",
    "notification-service",
    "admin-service",
    "analytics-service"
  ])

  family = "postgres15"
  name   = "maysar-${var.environment}-${each.key}-security"

  # Security-focused parameters
  parameter {
    name  = "ssl"
    value = "1"
  }

  parameter {
    name  = "ssl_min_protocol_version"
    value = "TLSv1.2"
  }

  parameter {
    name  = "log_connections"
    value = "1"
  }

  parameter {
    name  = "log_disconnections"
    value = "1"
  }

  parameter {
    name  = "log_statement"
    value = "ddl"
  }

  parameter {
    name  = "log_min_duration_statement"
    value = "1000"
  }

  parameter {
    name  = "pgaudit.log"
    value = each.key == "payment-service" ? "ddl,role,write,read" : "ddl,role"
  }

  parameter {
    name  = "pgaudit.log_catalog"
    value = "0"
  }

  parameter {
    name  = "pgaudit.log_level"
    value = "log"
  }

  parameter {
    name  = "pgaudit.log_parameter"
    value = each.key == "payment-service" ? "1" : "0"
  }

  parameter {
    name  = "pgaudit.log_relation"
    value = each.key == "payment-service" ? "1" : "0"
  }

  parameter {
    name  = "pgaudit.log_statement_once"
    value = "1"
  }

  parameter {
    name  = "shared_preload_libraries"
    value = each.key == "payment-service" ? "pgaudit" : ""
  }

  tags = {
    Name        = "maysar-${var.environment}-${each.key}-security-params"
    Environment = var.environment
    Service     = each.key
  }
}

# Database Users with Least Privilege
resource "postgresql_role" "service_users" {
  for_each = toset([
    "auth-service",
    "order-service",
    "payment-service",
    "seller-service",
    "catalog-service",
    "notification-service",
    "admin-service",
    "analytics-service"
  ])

  name     = "${each.key}_user"
  login    = true
  password = random_password.service_users[each.key].result

  # Grant minimal privileges based on service needs
  depends_on = [var.database_host]
}

# Random passwords for service users
resource "random_password" "service_users" {
  for_each = toset([
    "auth-service",
    "order-service",
    "payment-service",
    "seller-service",
    "catalog-service",
    "notification-service",
    "admin-service",
    "analytics-service"
  ])

  length  = 32
  special = true
  upper   = true
  lower   = true
  numeric = true

  lifecycle {
    ignore_changes = [length, special, upper, lower, numeric]
  }
}

# Store service user credentials in Secrets Manager
resource "aws_secretsmanager_secret" "db_service_credentials" {
  for_each = toset([
    "auth-service",
    "order-service",
    "payment-service",
    "seller-service",
    "catalog-service",
    "notification-service",
    "admin-service",
    "analytics-service"
  ])

  name                    = "maysar/${var.environment}/db/${each.key}/service-user"
  description             = "Database service user credentials for ${each.key}"
  kms_key_id              = var.kms_key_arn
  recovery_window_in_days = 30

  tags = {
    Name        = "maysar-${var.environment}-db-${each.key}-service-user"
    Environment = var.environment
    Service     = each.key
  }
}

resource "aws_secretsmanager_secret_version" "db_service_credentials" {
  for_each = aws_secretsmanager_secret.db_service_credentials

  secret_id = each.value.id
  secret_string = jsonencode({
    username = "${each.key}_user"
    password = random_password.service_users[each.key].result
    host     = var.database_host
    port     = var.database_port
    database = "${each.key}_db"
    sslmode  = "require"
  })
}

# Database Grants with Least Privilege
resource "postgresql_grant" "service_user_grants" {
  for_each = toset([
    "auth-service",
    "order-service",
    "payment-service",
    "seller-service",
    "catalog-service",
    "notification-service",
    "admin-service",
    "analytics-service"
  ])

  database    = "${each.key}_db"
  role        = "${each.key}_user"
  object_type = "database"
  privileges  = ["CONNECT"]

  depends_on = [postgresql_role.service_users]
}

# Schema-level grants
resource "postgresql_grant" "service_schema_grants" {
  for_each = toset([
    "auth-service",
    "order-service",
    "payment-service",
    "seller-service",
    "catalog-service",
    "notification-service",
    "admin-service",
    "analytics-service"
  ])

  database    = "${each.key}_db"
  schema      = "public"
  role        = "${each.key}_user"
  object_type = "schema"
  privileges  = ["USAGE"]

  depends_on = [postgresql_grant.service_user_grants]
}

# Table-level grants based on service needs
resource "postgresql_grant" "service_table_grants" {
  for_each = {
    "auth-service"     = ["SELECT", "INSERT", "UPDATE"]
    "order-service"    = ["SELECT", "INSERT", "UPDATE"]
    "payment-service"  = ["SELECT", "INSERT", "UPDATE"]
    "seller-service"   = ["SELECT", "INSERT", "UPDATE"]
    "catalog-service"  = ["SELECT", "INSERT", "UPDATE"]
    "notification-service" = ["SELECT", "INSERT", "UPDATE"]
    "admin-service"    = ["SELECT", "INSERT", "UPDATE"]
    "analytics-service" = ["SELECT", "INSERT"]
  }

  database    = "${each.key}_db"
  schema      = "public"
  role        = "${each.key}_user"
  object_type = "table"
  privileges  = each.value

  depends_on = [postgresql_grant.service_schema_grants]
}

# Payment DB Audit Trail
resource "postgresql_extension" "pgaudit_payment" {
  name     = "pgaudit"
  database = "payment_db"

  depends_on = [postgresql_grant.service_user_grants]
}

# Audit log storage in S3
resource "aws_s3_bucket" "db_audit_logs" {
  bucket = "maysar-${var.environment}-db-audit-logs-${random_string.audit_suffix.result}"

  tags = {
    Name        = "maysar-${var.environment}-db-audit-logs"
    Environment = var.environment
  }
}

resource "random_string" "audit_suffix" {
  length  = 8
  lower   = true
  upper   = false
  numeric = true
  special = false
}

# S3 bucket encryption for audit logs
resource "aws_s3_bucket_server_side_encryption_configuration" "db_audit_logs" {
  bucket = aws_s3_bucket.db_audit_logs.id

  rule {
    apply_server_side_encryption_by_default {
      kms_master_key_id = var.kms_key_arn
      sse_algorithm     = "aws:kms"
    }
    bucket_key_enabled = true
  }
}

# S3 bucket lifecycle for audit logs (7 years retention)
resource "aws_s3_bucket_lifecycle_configuration" "db_audit_logs" {
  bucket = aws_s3_bucket.db_audit_logs.id

  rule {
    id     = "audit_log_retention"
    status = "Enabled"

    expiration {
      days = 2555 # 7 years
    }

    transition {
      days          = 90
      storage_class = "STANDARD_IA"
    }

    transition {
      days          = 365
      storage_class = "GLACIER"
    }

    noncurrent_version_expiration {
      noncurrent_days = 2555
    }
  }
}

# CloudWatch Alarms for Database Security
resource "aws_cloudwatch_metric_alarm" "db_failed_connections" {
  alarm_name          = "maysar-${var.environment}-db-failed-connections"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "DatabaseConnections"
  namespace           = "AWS/RDS"
  period              = "300"
  statistic           = "Maximum"
  threshold           = "100"
  alarm_description   = "High number of database connections detected"
  alarm_actions       = [aws_sns_topic.db_security_alerts.arn]

  dimensions = {
    DBClusterIdentifier = var.cluster_identifier
  }
}

resource "aws_cloudwatch_metric_alarm" "db_ssl_connections" {
  alarm_name          = "maysar-${var.environment}-db-ssl-connections"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = "1"
  metric_name         = "SSLConnections"
  namespace           = "AWS/RDS"
  period              = "3600"
  statistic           = "Minimum"
  threshold           = "1"
  alarm_description   = "Non-SSL database connections detected"
  alarm_actions       = [aws_sns_topic.db_security_alerts.arn]

  dimensions = {
    DBClusterIdentifier = var.cluster_identifier
  }
}

# SNS Topic for Database Security Alerts
resource "aws_sns_topic" "db_security_alerts" {
  name = "maysar-${var.environment}-db-security-alerts"

  tags = {
    Name        = "maysar-${var.environment}-db-security-alerts"
    Environment = var.environment
  }
}

# Database Backup Configuration
resource "aws_db_option_group" "backup" {
  name                     = "maysar-${var.environment}-db-backup-options"
  option_group_description = "Option group for database backup and security"
  engine_name              = "postgres"
  major_engine_version     = "15"

  option {
    option_name = "sqlserver_audit"
    option_settings {
      name  = "ENABLED"
      value = "true"
    }
    option_settings {
      name  = "S3_BUCKET_ARN"
      value = aws_s3_bucket.db_audit_logs.arn
    }
  }

  tags = {
    Name        = "maysar-${var.environment}-db-backup-options"
    Environment = var.environment
  }
}

# Automated Backup Verification Lambda
resource "aws_lambda_function" "backup_verification" {
  filename         = data.archive_file.backup_verification.output_path
  function_name    = "maysar-${var.environment}-backup-verification"
  role            = aws_iam_role.backup_verification.arn
  handler         = "index.handler"
  runtime         = "nodejs18.x"
  timeout         = 900

  environment {
    variables = {
      CLUSTER_IDENTIFIER = var.cluster_identifier
      BACKUP_RETENTION   = var.backup_retention_days
      NOTIFICATION_TOPIC = aws_sns_topic.db_security_alerts.arn
    }
  }
}

data "archive_file" "backup_verification" {
  type        = "zip"
  output_path = "/tmp/backup-verification.zip"

  source {
    content  = <<-EOF
const AWS = require('aws-sdk');

exports.handler = async (event) => {
  const rds = new AWS.RDS();
  const sns = new AWS.SNS();

  try {
    // Verify backup retention
    const cluster = await rds.describeDBClusters({
      DBClusterIdentifier: process.env.CLUSTER_IDENTIFIER
    }).promise();

    const retentionPeriod = cluster.DBClusters[0].BackupRetentionPeriod;

    if (retentionPeriod < parseInt(process.env.BACKUP_RETENTION)) {
      await sns.publish({
        TopicArn: process.env.NOTIFICATION_TOPIC,
        Subject: 'Database Backup Retention Alert',
        Message: `Database backup retention (${retentionPeriod} days) is below required minimum (${process.env.BACKUP_RETENTION} days)`
      }).promise();
    }

    // Verify PITR capability
    const snapshots = await rds.describeDBClusterSnapshots({
      DBClusterIdentifier: process.env.CLUSTER_IDENTIFIER,
      SnapshotType: 'automated'
    }).promise();

    if (snapshots.DBClusterSnapshots.length === 0) {
      await sns.publish({
        TopicArn: process.env.NOTIFICATION_TOPIC,
        Subject: 'Database Backup Alert',
        Message: 'No automated database snapshots found'
      }).promise();
    }

    console.log('Database backup verification completed successfully');
    return { statusCode: 200, body: 'Verification completed' };

  } catch (error) {
    console.error('Backup verification failed:', error);
    throw error;
  }
};
EOF
    filename = "index.js"
  }
}

resource "aws_iam_role" "backup_verification" {
  name = "maysar-${var.environment}-backup-verification-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy" "backup_verification" {
  name = "maysar-${var.environment}-backup-verification-policy"
  role = aws_iam_role.backup_verification.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "rds:DescribeDBClusters",
          "rds:DescribeDBClusterSnapshots"
        ]
        Resource = [
          "arn:aws:rds:${var.aws_region}:${var.aws_account_id}:cluster:${var.cluster_identifier}",
          "arn:aws:rds:${var.aws_region}:${var.aws_account_id}:cluster-snapshot:*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "sns:Publish"
        ]
        Resource = aws_sns_topic.db_security_alerts.arn
      }
    ]
  })
}

# CloudWatch Event Rule for Daily Backup Verification
resource "aws_cloudwatch_event_rule" "daily_backup_check" {
  name                = "maysar-${var.environment}-daily-backup-check"
  description         = "Daily backup verification for database security"
  schedule_expression = "cron(0 2 * * ? *)" # Daily at 2 AM UTC
}

resource "aws_cloudwatch_event_target" "daily_backup_check" {
  rule      = aws_cloudwatch_event_rule.daily_backup_check.name
  arn       = aws_lambda_function.backup_verification.arn
}

resource "aws_lambda_permission" "daily_backup_check" {
  statement_id  = "AllowExecutionFromCloudWatch"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.backup_verification.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.daily_backup_check.arn
}

# PostgreSQL provider configuration
provider "postgresql" {
  host     = var.database_host
  port     = var.database_port
  username = var.database_admin_username
  password = var.database_admin_password
  sslmode  = "require"
}
