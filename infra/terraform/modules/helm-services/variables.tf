variable "environment" {
  description = "Environment name"
  type        = string
}

variable "cluster_name" {
  description = "EKS cluster name"
  type        = string
}

variable "vpc_id" {
  description = "VPC ID"
  type        = string
}

variable "domain_name" {
  description = "Domain name for ingress"
  type        = string
}

variable "helm_repo_url" {
  description = "Helm repository URL"
  type        = string
  default     = "https://maysar.github.io/helm-charts"
}

# Database endpoints
variable "auth_db_endpoint" {
  description = "Auth service database endpoint"
  type        = string
}

variable "order_db_endpoint" {
  description = "Order service database endpoint"
  type        = string
}

variable "payment_db_endpoint" {
  description = "Payment service database endpoint"
  type        = string
}

variable "seller_db_endpoint" {
  description = "Seller service database endpoint"
  type        = string
}

variable "catalog_db_endpoint" {
  description = "Catalog service database endpoint"
  type        = string
}

variable "notification_db_endpoint" {
  description = "Notification service database endpoint"
  type        = string
}

variable "admin_db_endpoint" {
  description = "Admin service database endpoint"
  type        = string
}

variable "analytics_db_endpoint" {
  description = "Analytics service database endpoint"
  type        = string
}

# Redis and Kafka
variable "redis_endpoint" {
  description = "Redis cluster endpoint"
  type        = string
}

variable "kafka_brokers" {
  description = "Kafka brokers endpoints"
  type        = string
}

# AWS configuration
variable "aws_region" {
  description = "AWS region"
  type        = string
}

# Service images
variable "auth_service_image" {
  description = "Auth service Docker image"
  type        = string
  default     = "maysar/auth-service"
}

variable "auth_service_tag" {
  description = "Auth service image tag"
  type        = string
  default     = "latest"
}

variable "order_service_image" {
  description = "Order service Docker image"
  type        = string
  default     = "maysar/order-service"
}

variable "order_service_tag" {
  description = "Order service image tag"
  type        = string
  default     = "latest"
}

variable "payment_service_image" {
  description = "Payment service Docker image"
  type        = string
  default     = "maysar/payment-service"
}

variable "payment_service_tag" {
  description = "Payment service image tag"
  type        = string
  default     = "latest"
}

variable "seller_service_image" {
  description = "Seller service Docker image"
  type        = string
  default     = "maysar/seller-service"
}

variable "seller_service_tag" {
  description = "Seller service image tag"
  type        = string
  default     = "latest"
}

variable "catalog_service_image" {
  description = "Catalog service Docker image"
  type        = string
  default     = "maysar/catalog-service"
}

variable "catalog_service_tag" {
  description = "Catalog service image tag"
  type        = string
  default     = "latest"
}

variable "notification_service_image" {
  description = "Notification service Docker image"
  type        = string
  default     = "maysar/notification-service"
}

variable "notification_service_tag" {
  description = "Notification service image tag"
  type        = string
  default     = "latest"
}

variable "admin_service_image" {
  description = "Admin service Docker image"
  type        = string
  default     = "maysar/admin-service"
}

variable "admin_service_tag" {
  description = "Admin service image tag"
  type        = string
  default     = "latest"
}

variable "analytics_service_image" {
  description = "Analytics service Docker image"
  type        = string
  default     = "maysar/analytics-service"
}

variable "analytics_service_tag" {
  description = "Analytics service image tag"
  type        = string
  default     = "latest"
}

variable "cdn_service_image" {
  description = "CDN service Docker image"
  type        = string
  default     = "maysar/cdn-service"
}

variable "cdn_service_tag" {
  description = "CDN service image tag"
  type        = string
  default     = "latest"
}

# IAM roles
variable "auth_service_role_arn" {
  description = "Auth service IAM role ARN"
  type        = string
}

variable "order_service_role_arn" {
  description = "Order service IAM role ARN"
  type        = string
}

variable "payment_service_role_arn" {
  description = "Payment service IAM role ARN"
  type        = string
}

variable "seller_service_role_arn" {
  description = "Seller service IAM role ARN"
  type        = string
}

variable "catalog_service_role_arn" {
  description = "Catalog service IAM role ARN"
  type        = string
}

variable "notification_service_role_arn" {
  description = "Notification service IAM role ARN"
  type        = string
}

variable "admin_service_role_arn" {
  description = "Admin service IAM role ARN"
  type        = string
}

variable "analytics_service_role_arn" {
  description = "Analytics service IAM role ARN"
  type        = string
}

variable "cdn_service_role_arn" {
  description = "CDN service IAM role ARN"
  type        = string
}

# Secrets
variable "jwt_secret" {
  description = "JWT secret for authentication"
  type        = string
  sensitive   = true
}

variable "admin_jwt_secret" {
  description = "Admin JWT secret"
  type        = string
  sensitive   = true
}

variable "pesapal_consumer_key" {
  description = "Pesapal consumer key"
  type        = string
  sensitive   = true
}

variable "pesapal_consumer_secret" {
  description = "Pesapal consumer secret"
  type        = string
  sensitive   = true
}

variable "smtp_username" {
  description = "SMTP username"
  type        = string
  sensitive   = true
}

variable "smtp_password" {
  description = "SMTP password"
  type        = string
  sensitive   = true
}

variable "sms_api_key" {
  description = "SMS API key"
  type        = string
  sensitive   = true
}

# CDN configuration
variable "cdn_domain" {
  description = "CDN domain"
  type        = string
}

variable "cloudfront_distribution_id" {
  description = "CloudFront distribution ID"
  type        = string
}
