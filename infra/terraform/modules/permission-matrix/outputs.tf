output "permission_validator_lambda_arn" {
  description = "Permission validator Lambda function ARN"
  value       = aws_lambda_function.permission_validator.arn
}

output "admin_action_auditor_lambda_arn" {
  description = "Admin action auditor Lambda function ARN"
  value       = aws_lambda_function.admin_action_auditor.arn
}

output "admin_action_handler_lambda_arn" {
  description = "Admin action handler Lambda function ARN"
  value       = aws_lambda_function.admin_action_handler.arn
}

output "admin_actions_api_url" {
  description = "Admin actions API Gateway URL"
  value       = aws_api_gateway_deployment.admin_actions.invoke_url
}

output "admin_actions_api_id" {
  description = "Admin actions API Gateway ID"
  value       = aws_api_gateway_rest_api.admin_actions.id
}

output "admin_action_audit_bucket" {
  description = "S3 bucket for admin action audit logs"
  value       = aws_s3_bucket.admin_action_audit.bucket
}

output "admin_action_alerts_topic_arn" {
  description = "SNS topic ARN for admin action alerts"
  value       = aws_sns_topic.admin_action_alerts.arn
}

output "permission_matrix" {
  description = "Permission matrix configuration"
  value       = local.permission_matrix
}

output "two_fa_required_actions" {
  description = "Actions requiring two-factor authentication"
  value       = local.two_fa_required_actions
}
