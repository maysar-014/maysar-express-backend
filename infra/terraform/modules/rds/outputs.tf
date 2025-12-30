output "cluster_id" {
  description = "RDS cluster ID"
  value       = aws_rds_cluster.main.id
}

output "cluster_arn" {
  description = "RDS cluster ARN"
  value       = aws_rds_cluster.main.arn
}

output "cluster_endpoint" {
  description = "RDS cluster endpoint"
  value       = aws_rds_cluster.main.endpoint
}

output "cluster_reader_endpoint" {
  description = "RDS cluster reader endpoint"
  value       = aws_rds_cluster.main.reader_endpoint
}

output "cluster_port" {
  description = "RDS cluster port"
  value       = aws_rds_cluster.main.port
}

output "cluster_database_name" {
  description = "RDS cluster database name"
  value       = aws_rds_cluster.main.database_name
}

output "cluster_master_username" {
  description = "RDS cluster master username"
  value       = aws_rds_cluster.main.master_username
  sensitive   = true
}

output "instance_ids" {
  description = "RDS cluster instance IDs"
  value       = aws_rds_cluster_instance.main[*].id
}

output "instance_endpoints" {
  description = "RDS cluster instance endpoints"
  value       = aws_rds_cluster_instance.main[*].endpoint
}

output "security_group_id" {
  description = "RDS security group ID"
  value       = aws_security_group.rds.id
}

output "subnet_group_name" {
  description = "RDS subnet group name"
  value       = aws_db_subnet_group.main.name
}

output "parameter_group_name" {
  description = "RDS parameter group name"
  value       = aws_db_parameter_group.main.name
}

output "cluster_parameter_group_name" {
  description = "RDS cluster parameter group name"
  value       = aws_rds_cluster_parameter_group.main.name
}

output "kms_key_arn" {
  description = "KMS key ARN for RDS encryption"
  value       = aws_kms_key.rds.arn
}

output "kms_key_id" {
  description = "KMS key ID for RDS encryption"
  value       = aws_kms_key.rds.key_id
}

output "access_policy_arn" {
  description = "IAM policy ARN for RDS access"
  value       = aws_iam_policy.rds_access.arn
}

# Database endpoints for each service
output "auth_db_endpoint" {
  description = "Auth service database endpoint"
  value       = "${aws_rds_cluster.main.endpoint}:5432/auth_db"
}

output "order_db_endpoint" {
  description = "Order service database endpoint"
  value       = "${aws_rds_cluster.main.endpoint}:5432/order_db"
}

output "payment_db_endpoint" {
  description = "Payment service database endpoint"
  value       = "${aws_rds_cluster.main.endpoint}:5432/payment_db"
}

output "seller_db_endpoint" {
  description = "Seller service database endpoint"
  value       = "${aws_rds_cluster.main.endpoint}:5432/seller_db"
}

output "catalog_db_endpoint" {
  description = "Catalog service database endpoint"
  value       = "${aws_rds_cluster.main.endpoint}:5432/catalog_db"
}

output "inventory_db_endpoint" {
  description = "Inventory service database endpoint"
  value       = "${aws_rds_cluster.main.endpoint}:5432/inventory_db"
}

output "logistics_db_endpoint" {
  description = "Logistics service database endpoint"
  value       = "${aws_rds_cluster.main.endpoint}:5432/logistics_db"
}

output "commission_db_endpoint" {
  description = "Commission service database endpoint"
  value       = "${aws_rds_cluster.main.endpoint}:5432/commission_db"
}

output "trust_db_endpoint" {
  description = "Trust service database endpoint"
  value       = "${aws_rds_cluster.main.endpoint}:5432/trust_db"
}

output "notification_db_endpoint" {
  description = "Notification service database endpoint"
  value       = "${aws_rds_cluster.main.endpoint}:5432/notification_db"
}

output "admin_db_endpoint" {
  description = "Admin service database endpoint"
  value       = "${aws_rds_cluster.main.endpoint}:5432/admin_db"
}

output "analytics_db_endpoint" {
  description = "Analytics service database endpoint"
  value       = "${aws_rds_cluster.main.endpoint}:5432/analytics_db"
}

output "community_db_endpoint" {
  description = "Community service database endpoint"
  value       = "${aws_rds_cluster.main.endpoint}:5432/community_db"
}
