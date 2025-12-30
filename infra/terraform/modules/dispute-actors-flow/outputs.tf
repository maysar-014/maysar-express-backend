output "dispute_opened_emitter_lambda_arn" {
  description = "Dispute opened emitter Lambda function ARN"
  value       = aws_lambda_function.dispute_opened_emitter.arn
}

output "evidence_collection_72h_lambda_arn" {
  description = "72h evidence collection Lambda function ARN"
  value       = aws_lambda_function.evidence_collection_72h.arn
}

output "auto_checks_pod_fraud_lambda_arn" {
  description = "Auto-checks POD fraud Lambda function ARN"
  value       = aws_lambda_function.auto_checks_pod_fraud.arn
}

output "admin_decision_payment_execution_lambda_arn" {
  description = "Admin decision payment execution Lambda function ARN"
  value       = aws_lambda_function.admin_decision_payment_execution.arn
}

output "dispute_evidence_flow_bucket" {
  description = "S3 bucket for dispute evidence flow"
  value       = aws_s3_bucket.dispute_evidence_flow.bucket
}

output "dispute_flow_notifications_topic_arn" {
  description = "SNS topic ARN for dispute flow notifications"
  value       = aws_sns_topic.dispute_flow_notifications.arn
}

output "dispute_actors_config" {
  description = "Dispute actors configuration"
  value       = local.dispute_actors
}

output "dispute_flow_steps" {
  description = "Dispute flow steps"
  value       = local.dispute_flow_steps
}
