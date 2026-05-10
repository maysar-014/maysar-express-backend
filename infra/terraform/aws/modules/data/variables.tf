variable "name_prefix" {
  type = string
}

variable "private_subnet_ids" {
  type = list(string)
}

variable "db_security_group_id" {
  type = string
}

variable "redis_security_group_id" {
  type = string
}

variable "efs_security_group_id" {
  type = string
}

variable "db_name" {
  type = string
}

variable "db_username" {
  type = string
}

variable "db_password" {
  type      = string
  sensitive = true
}

variable "db_engine_version" {
  type = string
}

variable "db_instance_class" {
  type = string
}

variable "db_allocated_storage" {
  type = number
}

variable "db_max_allocated_storage" {
  type = number
}

variable "db_backup_retention_days" {
  type = number
}

variable "db_multi_az" {
  type = bool
}

variable "redis_node_type" {
  type = string
}

variable "redis_engine_version" {
  type = string
}

variable "redis_auth_token" {
  type      = string
  sensitive = true
}

variable "redis_num_cache_clusters" {
  type = number
}

variable "tags" {
  type = map(string)
}
