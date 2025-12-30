output "slo_monitor_lambda_arn" {
  description = "SLO monitor Lambda function ARN"
  value       = aws_lambda_function.slo_monitor.arn
}

output "error_budget_calculator_lambda_arn" {
  description = "Error budget calculator Lambda function ARN"
  value       = aws_lambda_function.error_budget_calculator.arn
}

output "slo_dashboard_api_url" {
  description = "SLO dashboard API Gateway URL"
  value       = aws_api_gateway_deployment.slo_dashboard.invoke_url
}

output "slo_dashboard_api_id" {
  description = "SLO dashboard API Gateway ID"
  value       = aws_api_gateway_rest_api.slo_dashboard.id
}

output "error_budget_table_name" {
  description = "DynamoDB table name for error budget tracking"
  value       = aws_dynamodb_table.error_budget.table_name
}

output "release_freeze_sns_topic_arn" {
  description = "SNS topic ARN for release freeze alerts"
  value       = aws_sns_topic.release_freeze.arn
}

output "rca_required_sns_topic_arn" {
  description = "SNS topic ARN for RCA requirement alerts"
  value       = aws_sns_topic.rca_required.arn
}
