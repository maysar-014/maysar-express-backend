output "vpc_id" {
  description = "VPC id for the AWS production stack."
  value       = module.network.vpc_id
}

output "public_subnet_ids" {
  description = "Public subnet ids for ingress resources."
  value       = module.network.public_subnet_ids
}

output "private_subnet_ids" {
  description = "Private subnet ids for application and data services."
  value       = module.network.private_subnet_ids
}

output "app_url" {
  description = "Public URL for the API."
  value       = module.app.app_url
}

output "load_balancer_dns_name" {
  description = "DNS name of the public application load balancer."
  value       = module.app.load_balancer_dns_name
}

output "ecr_repository_url" {
  description = "ECR repository URL that can receive the backend image."
  value       = aws_ecr_repository.app.repository_url
}

output "rds_endpoint" {
  description = "RDS PostgreSQL endpoint."
  value       = module.data.db_endpoint
}

output "redis_primary_endpoint" {
  description = "Primary Redis endpoint."
  value       = module.data.redis_primary_endpoint
}

output "app_bucket_name" {
  description = "S3 bucket used for application object storage."
  value       = module.data.app_bucket_name
}

output "backup_bucket_name" {
  description = "S3 bucket reserved for operational backups."
  value       = module.data.backup_bucket_name
}

output "runtime_secret_arn" {
  description = "Secrets Manager ARN containing runtime application secrets."
  value       = aws_secretsmanager_secret.app_runtime.arn
  sensitive   = true
}

output "alarm_topic_arn" {
  description = "SNS topic ARN for infrastructure alarms."
  value       = aws_sns_topic.alarms.arn
}
