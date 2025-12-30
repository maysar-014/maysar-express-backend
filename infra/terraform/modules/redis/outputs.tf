output "replication_group_id" {
  description = "Redis replication group ID"
  value       = aws_elasticache_replication_group.main.id
}

output "replication_group_arn" {
  description = "Redis replication group ARN"
  value       = aws_elasticache_replication_group.main.arn
}

output "primary_endpoint_address" {
  description = "Redis primary endpoint address"
  value       = aws_elasticache_replication_group.main.primary_endpoint_address
}

output "reader_endpoint_address" {
  description = "Redis reader endpoint address"
  value       = aws_elasticache_replication_group.main.reader_endpoint_address
}

output "configuration_endpoint_address" {
  description = "Redis configuration endpoint address (for cluster mode)"
  value       = aws_elasticache_replication_group.main.configuration_endpoint_address
}

output "port" {
  description = "Redis port"
  value       = aws_elasticache_replication_group.main.port
}

output "security_group_id" {
  description = "Redis security group ID"
  value       = aws_security_group.redis.id
}

output "subnet_group_name" {
  description = "Redis subnet group name"
  value       = aws_elasticache_subnet_group.main.name
}

output "parameter_group_name" {
  description = "Redis parameter group name"
  value       = aws_elasticache_parameter_group.main.name
}

output "kms_key_arn" {
  description = "KMS key ARN for Redis encryption"
  value       = aws_kms_key.redis.arn
}

output "kms_key_id" {
  description = "KMS key ID for Redis encryption"
  value       = aws_kms_key.redis.key_id
}

output "access_policy_arn" {
  description = "IAM policy ARN for Redis access"
  value       = aws_iam_policy.redis_access.arn
}

output "cluster_enabled" {
  description = "Whether cluster mode is enabled"
  value       = aws_elasticache_replication_group.main.cluster_enabled
}

output "num_node_groups" {
  description = "Number of node groups"
  value       = aws_elasticache_replication_group.main.num_node_groups
}

output "replicas_per_node_group" {
  description = "Number of replicas per node group"
  value       = aws_elasticache_replication_group.main.replicas_per_node_group
}

# Idempotency cache outputs (conditional)
output "idempotency_replication_group_id" {
  description = "Idempotency Redis replication group ID"
  value       = var.enable_idempotency_cache ? aws_elasticache_replication_group.idempotency[0].id : null
}

output "idempotency_endpoint_address" {
  description = "Idempotency Redis endpoint address"
  value       = var.enable_idempotency_cache ? aws_elasticache_replication_group.idempotency[0].primary_endpoint_address : null
}
