output "prometheus_url" {
  description = "Prometheus service URL"
  value       = "http://prometheus-server.monitoring.svc.cluster.local"
}

output "grafana_url" {
  description = "Grafana service URL"
  value       = "http://grafana.monitoring.svc.cluster.local"
}

output "grafana_admin_password" {
  description = "Grafana admin password"
  value       = var.grafana_admin_password
  sensitive   = true
}

output "elasticsearch_url" {
  description = "Elasticsearch service URL"
  value       = var.enable_elasticsearch ? "http://elasticsearch-master.logging.svc.cluster.local:9200" : null
}

output "kibana_url" {
  description = "Kibana service URL"
  value       = var.enable_elasticsearch ? "http://kibana-kibana.logging.svc.cluster.local:5601" : null
}

output "jaeger_url" {
  description = "Jaeger service URL"
  value       = var.enable_jaeger ? "http://jaeger-query.observability.svc.cluster.local:16686" : null
}

output "container_insights_log_group" {
  description = "CloudWatch log group for Container Insights"
  value       = aws_cloudwatch_log_group.container_insights.name
}

output "monitoring_alerts_topic_arn" {
  description = "SNS topic ARN for monitoring alerts"
  value       = aws_sns_topic.monitoring_alerts.arn
}

output "ebs_csi_driver_role_arn" {
  description = "EBS CSI driver IAM role ARN"
  value       = aws_iam_role.ebs_csi_driver.arn
}

output "aws_lbc_role_arn" {
  description = "AWS Load Balancer Controller IAM role ARN"
  value       = aws_iam_role.aws_load_balancer_controller.arn
}
