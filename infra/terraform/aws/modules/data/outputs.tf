output "db_endpoint" {
  value = aws_db_instance.this.address
}

output "db_port" {
  value = aws_db_instance.this.port
}

output "db_instance_id" {
  value = aws_db_instance.this.identifier
}

output "redis_primary_endpoint" {
  value = aws_elasticache_replication_group.this.primary_endpoint_address
}

output "redis_port" {
  value = aws_elasticache_replication_group.this.port
}

output "redis_replication_group_id" {
  value = aws_elasticache_replication_group.this.replication_group_id
}

output "meilisearch_efs_id" {
  value = aws_efs_file_system.meilisearch.id
}

output "meilisearch_access_point_id" {
  value = aws_efs_access_point.meilisearch.id
}

output "app_bucket_name" {
  value = aws_s3_bucket.app.bucket
}

output "app_bucket_arn" {
  value = aws_s3_bucket.app.arn
}

output "backup_bucket_name" {
  value = aws_s3_bucket.backup.bucket
}
