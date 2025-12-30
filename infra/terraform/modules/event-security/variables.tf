variable "environment" {
  description = "Environment name"
  type        = string
}

variable "aws_region" {
  description = "AWS region"
  type        = string
}

variable "kms_key_arn" {
  description = "KMS key ARN for encryption"
  type        = string
}

variable "kafka_cluster_arn" {
  description = "MSK cluster ARN"
  type        = string
}

variable "private_subnets" {
  description = "Private subnet IDs"
  type        = list(string)
  default     = []
}

variable "msk_security_group_id" {
  description = "MSK security group ID"
  type        = string
  default     = ""
}

variable "enable_msk_serverless" {
  description = "Enable MSK Serverless cluster"
  type        = bool
  default     = false
}
