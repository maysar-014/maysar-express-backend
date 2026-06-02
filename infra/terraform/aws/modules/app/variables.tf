variable "name_prefix" {
  type = string
}

variable "vpc_id" {
  type = string
}

variable "public_subnet_ids" {
  type = list(string)
}

variable "private_subnet_ids" {
  type = list(string)
}

variable "alb_security_group_id" {
  type = string
}

variable "app_security_group_id" {
  type = string
}

variable "meilisearch_security_group_id" {
  type = string
}

variable "app_port" {
  type = number
}

variable "health_check_path" {
  type = string
}

variable "app_cpu" {
  type = number
}

variable "app_memory" {
  type = number
}

variable "app_desired_count" {
  type = number
}

variable "app_min_capacity" {
  type = number
}

variable "app_max_capacity" {
  type = number
}

variable "app_image" {
  type = string
}

variable "meilisearch_image" {
  type = string
}

variable "app_secret_arn" {
  type = string
}

variable "app_bucket_name" {
  type = string
}

variable "app_bucket_arn" {
  type = string
}

variable "backup_bucket_name" {
  type = string
}

variable "ecr_repository_url" {
  type = string
}

variable "cloudwatch_retention_days" {
  type = number
}

variable "custom_domain_name" {
  type    = string
  default = null
}

variable "route53_zone_id" {
  type    = string
  default = null
}

variable "meilisearch_efs_id" {
  type = string
}

variable "meilisearch_access_point_id" {
  type = string
}

variable "aws_region" {
  type = string
}

variable "base_url" {
  type = string
}

variable "frontend_url" {
  type = string
}

variable "cors_origin" {
  type = string
}

variable "service_version" {
  type = string
}

variable "log_level" {
  type = string
}

variable "paymentGateway_url" {
  type = string
}

variable "meilisearch_index_name" {
  type = string
}

variable "meilisearch_request_timeout" {
  type = number
}

variable "tags" {
  type = map(string)
}
