output "approval_processor_lambda_arn" {
  description = "Approval processor Lambda function ARN"
  value       = aws_lambda_function.approval_processor.arn
}

output "approval_responder_lambda_arn" {
  description = "Approval responder Lambda function ARN"
  value       = aws_lambda_function.approval_responder.arn
}

output "financial_execution_lambda_arn" {
  description = "Financial execution Lambda function ARN"
  value       = aws_lambda_function.financial_execution.arn
}

output "approval_cleanup_lambda_arn" {
  description = "Approval cleanup Lambda function ARN"
  value       = aws_lambda_function.approval_cleanup.arn
}

output "approval_requests_bucket" {
  description = "S3 bucket for approval requests"
  value       = aws_s3_bucket.approval_requests.bucket
}

output "approval_notifications_topic_arn" {
  description = "SNS topic ARN for approval notifications"
  value       = aws_sns_topic.approval_notifications.arn
}
