output "dispute_state_manager_lambda_arn" {
  description = "Dispute state manager Lambda function ARN"
  value       = aws_lambda_function.dispute_state_manager.arn
}

output "dispute_sla_monitor_lambda_arn" {
  description = "Dispute SLA monitor Lambda function ARN"
  value       = aws_lambda_function.dispute_sla_monitor.arn
}

output "evidence_collector_lambda_arn" {
  description = "Evidence collector Lambda function ARN"
  value       = aws_lambda_function.evidence_collector.arn
}

output "dispute_evidence_bucket" {
  description = "S3 bucket for dispute evidence"
  value       = aws_s3_bucket.dispute_evidence.bucket
}

output "dispute_notifications_topic_arn" {
  description = "SNS topic ARN for dispute notifications"
  value       = aws_sns_topic.dispute_notifications.arn
}

output "dispute_escalation_topic_arn" {
  description = "SNS topic ARN for dispute escalation alerts"
  value       = aws_sns_topic.dispute_escalation.arn
}

output "dispute_states" {
  description = "Available dispute states"
  value       = local.dispute_states
}

output "sla_thresholds" {
  description = "SLA thresholds for dispute resolution"
  value       = local.sla_thresholds
}
