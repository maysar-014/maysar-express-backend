output "daily_operations_lambda_arn" {
  description = "Daily operations Lambda function ARN"
  value       = aws_lambda_function.daily_operations.arn
}

output "weekly_operations_lambda_arn" {
  description = "Weekly operations Lambda function ARN"
  value       = aws_lambda_function.weekly_operations.arn
}

output "monthly_operations_lambda_arn" {
  description = "Monthly operations Lambda function ARN"
  value       = aws_lambda_function.monthly_operations.arn
}

output "change_window_manager_lambda_arn" {
  description = "Change window manager Lambda function ARN"
  value       = aws_lambda_function.change_window_manager.arn
}

output "daily_reports_bucket" {
  description = "S3 bucket for daily operations reports"
  value       = aws_s3_bucket.daily_reports.bucket
}

output "weekly_reports_bucket" {
  description = "S3 bucket for weekly operations reports"
  value       = aws_s3_bucket.weekly_reports.bucket
}

output "monthly_reports_bucket" {
  description = "S3 bucket for monthly operations reports"
  value       = aws_s3_bucket.monthly_reports.bucket
}

output "daily_ops_summary_topic_arn" {
  description = "SNS topic ARN for daily operations summaries"
  value       = aws_sns_topic.daily_ops_summary.arn
}

output "weekly_ops_summary_topic_arn" {
  description = "SNS topic ARN for weekly operations summaries"
  value       = aws_sns_topic.weekly_ops_summary.arn
}

output "monthly_ops_summary_topic_arn" {
  description = "SNS topic ARN for monthly operations summaries"
  value       = aws_sns_topic.monthly_ops_summary.arn
}

output "dlq_clearance_topic_arn" {
  description = "SNS topic ARN for DLQ clearance notifications"
  value       = aws_sns_topic.dlq_clearance.arn
}

output "backup_verification_topic_arn" {
  description = "SNS topic ARN for backup verification alerts"
  value       = aws_sns_topic.backup_verification.arn
}

output "compliance_audit_topic_arn" {
  description = "SNS topic ARN for compliance audit alerts"
  value       = aws_sns_topic.compliance_audit.arn
}

output "high_risk_deployment_topic_arn" {
  description = "SNS topic ARN for high-risk deployment alerts"
  value       = aws_sns_topic.high_risk_deployment.arn
}
