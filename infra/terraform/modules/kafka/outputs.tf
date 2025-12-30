output "cluster_arn" {
  description = "MSK cluster ARN"
  value       = aws_msk_cluster.main.arn
}

output "cluster_name" {
  description = "MSK cluster name"
  value       = aws_msk_cluster.main.cluster_name
}

output "bootstrap_brokers" {
  description = "MSK bootstrap brokers (plaintext)"
  value       = aws_msk_cluster.main.bootstrap_brokers
}

output "bootstrap_brokers_tls" {
  description = "MSK bootstrap brokers (TLS)"
  value       = aws_msk_cluster.main.bootstrap_brokers_tls
}

output "bootstrap_brokers_public" {
  description = "MSK bootstrap brokers (public)"
  value       = aws_msk_cluster.main.bootstrap_brokers_public_tls
}

output "zookeeper_connect_string" {
  description = "MSK Zookeeper connect string"
  value       = aws_msk_cluster.main.zookeeper_connect_string
}

output "access_policy_arn" {
  description = "IAM policy ARN for MSK access"
  value       = aws_iam_policy.msk_access.arn
}

output "security_group_id" {
  description = "MSK security group ID"
  value       = aws_security_group.kafka.id
}

output "kms_key_arn" {
  description = "KMS key ARN for MSK encryption"
  value       = aws_kms_key.kafka.arn
}
