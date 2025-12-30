output "cognito_user_pool_id" {
  description = "Cognito User Pool ID"
  value       = aws_cognito_user_pool.maysar.id
}

output "cognito_user_pool_arn" {
  description = "Cognito User Pool ARN"
  value       = aws_cognito_user_pool.maysar.arn
}

output "cognito_user_pool_client_id" {
  description = "Cognito User Pool Client ID"
  value       = aws_cognito_user_pool_client.maysar.id
}

output "cognito_identity_pool_id" {
  description = "Cognito Identity Pool ID"
  value       = aws_cognito_identity_pool.maysar.id
}

output "jwt_secret_arn" {
  description = "JWT secret ARN"
  value       = aws_secretsmanager_secret.jwt_keys.arn
}

output "db_credentials_arns" {
  description = "Database credentials ARNs"
  value = {
    for k, v in aws_secretsmanager_secret.db_credentials : k => v.arn
  }
}

output "payment_credentials_arn" {
  description = "Payment credentials ARN"
  value       = aws_secretsmanager_secret.payment_credentials.arn
}

output "external_services_arn" {
  description = "External services credentials ARN"
  value       = aws_secretsmanager_secret.external_services.arn
}

output "auth_alerts_topic_arn" {
  description = "SNS topic ARN for authentication alerts"
  value       = aws_sns_topic.auth_alerts.arn
}

output "waf_auth_protection_arn" {
  description = "WAF rule group ARN for auth protection"
  value       = aws_wafv2_rule_group.auth_protection.arn
}

output "log_sanitizer_function_arn" {
  description = "Log sanitizer Lambda function ARN"
  value       = aws_lambda_function.log_sanitizer.arn
}

output "pinpoint_app_id" {
  description = "AWS Pinpoint application ID"
  value       = aws_pinpoint_app.maysar.application_id
}
