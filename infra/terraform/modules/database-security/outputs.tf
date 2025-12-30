output "db_parameter_groups" {
  description = "Database parameter group names"
  value = {
    for k, v in aws_db_parameter_group.security : k => v.name
  }
}

output "service_user_credentials_arns" {
  description = "Service user credentials ARNs"
  value = {
    for k, v in aws_secretsmanager_secret.db_service_credentials : k => v.arn
  }
}

output "db_audit_logs_bucket" {
  description = "S3 bucket for database audit logs"
  value       = aws_s3_bucket.db_audit_logs.bucket
}

output "db_security_alerts_topic_arn" {
  description = "SNS topic ARN for database security alerts"
  value       = aws_sns_topic.db_security_alerts.arn
}

output "backup_verification_lambda_arn" {
  description = "Backup verification Lambda function ARN"
  value       = aws_lambda_function.backup_verification.arn
}

output "db_option_group_name" {
  description = "Database option group name"
  value       = aws_db_option_group.backup.name
}
