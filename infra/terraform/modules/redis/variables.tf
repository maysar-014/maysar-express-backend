variable "environment" {
  description = "Environment name"
  type        = string
}

variable "vpc_id" {
  description = "VPC ID"
  type        = string
}

variable "private_subnets" {
  description = "Private subnet IDs"
  type        = list(string)
}

variable "allowed_cidr_blocks" {
  description = "CIDR blocks allowed to access Redis"
  type        = list(string)
}

variable "node_type" {
  description = "Redis node instance type"
  type        = string
  default     = "cache.r6g.large"
}

variable "num_cache_clusters" {
  description = "Number of cache clusters (when not using cluster mode)"
  type        = number
  default     = null
}

variable "num_node_groups" {
  description = "Number of node groups (for cluster mode)"
  type        = number
  default     = 2
}

variable "replicas_per_node_group" {
  description = "Number of replicas per node group"
  type        = number
  default     = 1
}

variable "multi_az_enabled" {
  description = "Enable Multi-AZ deployment"
  type        = bool
  default     = true
}

variable "snapshot_retention_limit" {
  description = "Number of days to retain snapshots"
  type        = number
  default     = 7
}

variable "snapshot_window" {
  description = "Daily time range for automated snapshots"
  type        = string
  default     = "03:00-04:00"
}

variable "maintenance_window" {
  description = "Weekly time range for maintenance"
  type        = string
  default     = "sun:05:00-sun:06:00"
}

variable "apply_immediately" {
  description = "Apply changes immediately"
  type        = bool
  default     = false
}

variable "enable_data_tiering" {
  description = "Enable data tiering for cost optimization"
  type        = bool
  default     = false
}

variable "enable_idempotency_cache" {
  description = "Enable separate Redis cluster for idempotency cache"
  type        = bool
  default     = true
}

variable "idempotency_node_type" {
  description = "Node type for idempotency cache"
  type        = string
  default     = "cache.t4g.micro"
}
