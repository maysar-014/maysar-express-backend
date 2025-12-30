output "auth_failure_monitor_lambda_arn" {
  description = "Auth failure monitor Lambda function ARN"
  value       = aws_lambda_function.auth_failure_monitor.arn
}

output "payout_anomaly_detector_lambda_arn" {
  description = "Payout anomaly detector Lambda function ARN"
  value       = aws_lambda_function.payout_anomaly_detector.arn
}

output "order_backlog_monitor_lambda_arn" {
  description = "Order backlog monitor Lambda function ARN"
  value       = aws_lambda_function.order_backlog_monitor.arn
}

output "dlq_growth_monitor_lambda_arn" {
  description = "DLQ growth monitor Lambda function ARN"
  value       = aws_lambda_function.dlq_growth_monitor.arn
}

output "monitoring_security_alerts_topic_arn" {
  description = "Monitoring security alerts SNS topic ARN"
  value       = aws_sns_topic.monitoring_security_alerts.arn
}

output "dlq_metrics_table_arn" {
  description = "DLQ metrics DynamoDB table ARN"
  value       = aws_dynamodb_table.dlq_metrics.arn
}

output "dlq_metrics_table_name" {
  description = "DLQ metrics DynamoDB table name"
  value       = aws_dynamodb_table.dlq_metrics.name
}
