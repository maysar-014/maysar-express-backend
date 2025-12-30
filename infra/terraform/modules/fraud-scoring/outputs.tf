output "fraud_score_calculator_lambda_arn" {
  description = "Fraud score calculator Lambda function ARN"
  value       = aws_lambda_function.fraud_score_calculator.arn
}

output "fraud_dashboard_api_url" {
  description = "Fraud dashboard API Gateway URL"
  value       = aws_api_gateway_deployment.fraud_dashboard.invoke_url
}

output "fraud_dashboard_api_id" {
  description = "Fraud dashboard API Gateway ID"
  value       = aws_api_gateway_rest_api.fraud_dashboard.id
}

output "fraud_alerts_topic_arn" {
  description = "SNS topic ARN for fraud alerts"
  value       = aws_sns_topic.fraud_alerts.arn
}

output "fraud_dashboard_lambda_arn" {
  description = "Fraud dashboard Lambda function ARN"
  value       = aws_lambda_function.fraud_dashboard_api.arn
}
