output "cluster_name" {
  value = aws_ecs_cluster.this.name
}

output "app_service_name" {
  value = aws_ecs_service.app.name
}

output "meilisearch_service_name" {
  value = aws_ecs_service.meilisearch.name
}

output "load_balancer_dns_name" {
  value = aws_lb.this.dns_name
}

output "load_balancer_arn_suffix" {
  value = aws_lb.this.arn_suffix
}

output "app_url" {
  value = var.custom_domain_name != null && trim(var.custom_domain_name) != ""
    ? "https://${var.custom_domain_name}"
    : "http://${aws_lb.this.dns_name}"
}

output "ecr_repository_url" {
  value = var.ecr_repository_url
}
