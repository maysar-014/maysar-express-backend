output "prometheus_workspace_arn" {
  description = "Prometheus workspace ARN"
  value       = aws_prometheus_workspace.maysar.arn
}

output "prometheus_workspace_endpoint" {
  description = "Prometheus workspace endpoint"
  value       = aws_prometheus_workspace.maysar.prometheus_endpoint
}

output "grafana_workspace_endpoint" {
  description = "Grafana workspace endpoint"
  value       = aws_grafana_workspace.maysar.endpoint
}

output "opensearch_domain_endpoint" {
  description = "OpenSearch domain endpoint"
  value       = aws_opensearch_domain.maysar_logs.endpoint
}

output "opensearch_domain_arn" {
  description = "OpenSearch domain ARN"
  value       = aws_opensearch_domain.maysar_logs.arn
}

output "maintenance_assets_bucket" {
  description = "S3 bucket for maintenance assets"
  value       = aws_s3_bucket.maintenance_assets.bucket
}

output "backup_test_results_bucket" {
  description = "S3 bucket for backup test results"
  value       = aws_s3_bucket.backup_test_results.bucket
}

output "rca_required_topic_arn" {
  description = "SNS topic ARN for RCA requirements"
  value       = aws_sns_topic.rca_required.arn
}

output "dlq_alerts_topic_arn" {
  description = "SNS topic ARN for DLQ alerts"
  value       = aws_sns_topic.dlq_alerts.arn
}

output "maintenance_alerts_topic_arn" {
  description = "SNS topic ARN for maintenance alerts"
  value       = aws_sns_topic.maintenance_alerts.arn
}

output "backup_test_alerts_topic_arn" {
  description = "SNS topic ARN for backup test alerts"
  value       = aws_sns_topic.backup_test_alerts.arn
}
