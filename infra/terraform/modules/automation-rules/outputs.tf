output "pod_auto_decline_lambda_arn" {
  description = "POD auto-decline Lambda function ARN"
  value       = aws_lambda_function.pod_auto_decline.arn
}

output "repeat_pattern_flagger_lambda_arn" {
  description = "Repeat pattern flagger Lambda function ARN"
  value       = aws_lambda_function.repeat_pattern_flagger.arn
}

output "automation_alerts_topic_arn" {
  description = "SNS topic ARN for automation alerts"
  value       = aws_sns_topic.automation_alerts.arn
}
