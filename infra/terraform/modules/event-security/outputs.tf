output "event_schema_registry_arn" {
  description = "Glue schema registry ARN"
  value       = aws_glue_registry.maysar_events.arn
}

output "event_hmac_secret_arn" {
  description = "Event HMAC secret ARN"
  value       = aws_secretsmanager_secret.event_hmac_key.arn
}

output "event_encryption_secret_arn" {
  description = "Event encryption secret ARN"
  value       = aws_secretsmanager_secret.event_encryption_key.arn
}

output "event_validator_lambda_arn" {
  description = "Event validator Lambda function ARN"
  value       = aws_lambda_function.event_validator.arn
}

output "event_encryptor_lambda_arn" {
  description = "Event encryptor Lambda function ARN"
  value       = aws_lambda_function.event_encryptor.arn
}

output "msk_serverless_cluster_arn" {
  description = "MSK Serverless cluster ARN"
  value       = var.enable_msk_serverless ? aws_msk_serverless_cluster.events[0].arn : null
}

output "secure_topics_arns" {
  description = "Secure event topic ARNs"
  value = {
    for k, v in aws_msk_topic.secure_topics : k => v.arn
  }
}

output "event_dlq_bucket" {
  description = "Event DLQ S3 bucket"
  value       = aws_s3_bucket.event_dlq.bucket
}

output "event_security_alerts_topic_arn" {
  description = "Event security alerts SNS topic ARN"
  value       = aws_sns_topic.event_security_alerts.arn
}

output "event_producer_policies" {
  description = "Event producer IAM policy ARNs"
  value = {
    for k, v in aws_iam_policy.event_producer : k => v.arn
  }
}

output "event_consumer_policies" {
  description = "Event consumer IAM policy ARNs"
  value = {
    for k, v in aws_iam_policy.event_consumer : k => v.arn
  }
}
