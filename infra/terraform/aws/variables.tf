variable "aws_region" {
  description = "AWS region for the production stack."
  type        = string
  default     = "us-east-1"
}

variable "project_name" {
  description = "Short project identifier used in AWS resource names."
  type        = string
  default     = "maysar"
}

variable "environment" {
  description = "Environment name for this stack."
  type        = string
  default     = "production"
}

variable "vpc_cidr" {
  description = "Primary CIDR block for the VPC."
  type        = string
  default     = "10.20.0.0/16"
}

variable "availability_zones" {
  description = "Availability zones used for public and private subnets."
  type        = list(string)
  default     = ["us-east-1a", "us-east-1b"]
}

variable "public_subnet_cidrs" {
  description = "Public subnet CIDR blocks aligned with availability_zones."
  type        = list(string)
  default     = ["10.20.0.0/24", "10.20.1.0/24"]
}

variable "private_subnet_cidrs" {
  description = "Private subnet CIDR blocks aligned with availability_zones."
  type        = list(string)
  default     = ["10.20.10.0/24", "10.20.11.0/24"]
}

variable "allowed_ingress_cidrs" {
  description = "CIDR blocks allowed to reach the public ALB."
  type        = list(string)
  default     = ["0.0.0.0/0"]
}

variable "enable_single_nat_gateway" {
  description = "Whether to use a single NAT gateway to reduce cost."
  type        = bool
  default     = false
}

variable "app_port" {
  description = "Container port exposed by the API."
  type        = number
  default     = 3000
}

variable "app_cpu" {
  description = "Fargate CPU units for the backend task."
  type        = number
  default     = 1024
}

variable "app_memory" {
  description = "Fargate memory in MiB for the backend task."
  type        = number
  default     = 2048
}

variable "app_desired_count" {
  description = "Desired number of backend tasks."
  type        = number
  default     = 2
}

variable "app_min_capacity" {
  description = "Minimum autoscaling capacity for the backend service."
  type        = number
  default     = 2
}

variable "app_max_capacity" {
  description = "Maximum autoscaling capacity for the backend service."
  type        = number
  default     = 6
}

variable "health_check_path" {
  description = "ALB health check path."
  type        = string
  default     = "/health"
}

variable "app_image" {
  description = "Container image for the backend. If null, the stack creates an ECR repository and assumes :latest."
  type        = string
  default     = null
}

variable "meilisearch_image" {
  description = "Container image for Meilisearch."
  type        = string
  default     = "getmeili/meilisearch:v1.12"
}

variable "meilisearch_index_name" {
  description = "Default Meilisearch index name used by the catalog service."
  type        = string
  default     = "catalog"
}

variable "meilisearch_request_timeout" {
  description = "Meilisearch client request timeout in milliseconds."
  type        = number
  default     = 30000
}

variable "custom_domain_name" {
  description = "Optional public DNS name for the API."
  type        = string
  default     = null
}

variable "route53_zone_id" {
  description = "Optional public Route53 hosted zone id for certificate validation and alias records."
  type        = string
  default     = null
}

variable "db_name" {
  description = "Primary PostgreSQL database name."
  type        = string
  default     = "maysar_prod"
}

variable "db_username" {
  description = "Master username for the PostgreSQL database."
  type        = string
  default     = "maysar_admin"
}

variable "db_engine_version" {
  description = "RDS PostgreSQL engine version."
  type        = string
  default     = "16.3"
}

variable "db_instance_class" {
  description = "Instance class for the RDS PostgreSQL database."
  type        = string
  default     = "db.t4g.medium"
}

variable "db_allocated_storage" {
  description = "Allocated storage in GiB for RDS."
  type        = number
  default     = 100
}

variable "db_max_allocated_storage" {
  description = "Maximum autoscaled storage in GiB for RDS."
  type        = number
  default     = 500
}

variable "db_backup_retention_days" {
  description = "Automated backup retention window for RDS."
  type        = number
  default     = 14
}

variable "db_multi_az" {
  description = "Enable Multi-AZ for the primary PostgreSQL instance."
  type        = bool
  default     = true
}

variable "redis_node_type" {
  description = "Node type for the ElastiCache Redis replication group."
  type        = string
  default     = "cache.t4g.small"
}

variable "redis_engine_version" {
  description = "Redis engine version."
  type        = string
  default     = "7.1"
}

variable "redis_num_cache_clusters" {
  description = "Number of Redis cache nodes in the replication group."
  type        = number
  default     = 2
}

variable "alarm_email_endpoints" {
  description = "Email endpoints subscribed to infrastructure alarms."
  type        = list(string)
  default     = []
}

variable "frontend_url" {
  description = "Public frontend URL used in application configuration."
  type        = string
  default     = ""
}

variable "cors_origin" {
  description = "Comma-separated allowed CORS origins."
  type        = string
  default     = "*"
}

variable "service_version" {
  description = "Service version exposed to runtime telemetry."
  type        = string
  default     = "1.0.0"
}

variable "log_level" {
  description = "Application log level."
  type        = string
  default     = "info"
}

variable "pesapal_url" {
  description = "Pesapal API base URL."
  type        = string
  default     = "https://api.pesapal.com/v3"
}

variable "pesapal_consumer_key" {
  description = "Pesapal consumer key for production."
  type        = string
  sensitive   = true
}

variable "pesapal_consumer_secret" {
  description = "Pesapal consumer secret for production."
  type        = string
  sensitive   = true
}

variable "pesapal_ipn_id" {
  description = "Pesapal IPN identifier for production."
  type        = string
  sensitive   = true
}

variable "jwt_secret" {
  description = "Optional override for JWT_SECRET. Leave null to auto-generate."
  type        = string
  default     = null
  sensitive   = true
}

variable "user_service_jwt_secret" {
  description = "Optional override for USER_SERVICE_JWT_SECRET. Leave null to auto-generate."
  type        = string
  default     = null
  sensitive   = true
}

variable "auth_service_session_secret" {
  description = "Optional override for AUTH_SERVICE_SESSION_SECRET. Leave null to auto-generate."
  type        = string
  default     = null
  sensitive   = true
}

variable "meili_master_key" {
  description = "Optional override for the Meilisearch master key. Leave null to auto-generate."
  type        = string
  default     = null
  sensitive   = true
}

variable "pii_encryption_key" {
  description = "Optional 32-byte hex key for PII encryption. Leave null to auto-generate."
  type        = string
  default     = null
  sensitive   = true
}

variable "pii_hmac_secret" {
  description = "Optional HMAC secret used for PII integrity. Leave null to auto-generate."
  type        = string
  default     = null
  sensitive   = true
}

variable "google_oauth_client_id" {
  description = "Optional Google OAuth client id."
  type        = string
  default     = ""
  sensitive   = true
}

variable "google_oauth_client_secret" {
  description = "Optional Google OAuth client secret."
  type        = string
  default     = ""
  sensitive   = true
}

variable "smtp_host" {
  description = "Optional SMTP host."
  type        = string
  default     = ""
}

variable "smtp_port" {
  description = "Optional SMTP port."
  type        = number
  default     = 587
}

variable "smtp_user" {
  description = "Optional SMTP username."
  type        = string
  default     = ""
  sensitive   = true
}

variable "smtp_pass" {
  description = "Optional SMTP password."
  type        = string
  default     = ""
  sensitive   = true
}

variable "sentry_dsn" {
  description = "Optional Sentry DSN."
  type        = string
  default     = ""
  sensitive   = true
}

variable "tags" {
  description = "Additional tags applied to all resources."
  type        = map(string)
  default     = {}
}
