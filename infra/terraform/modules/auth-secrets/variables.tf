variable "environment" {
  description = "Environment name"
  type        = string
}

variable "aws_region" {
  description = "AWS region"
  type        = string
}

variable "aws_account_id" {
  description = "AWS account ID"
  type        = string
}

variable "domain_name" {
  description = "Domain name for the application"
  type        = string
}

variable "kms_key_arn" {
  description = "KMS key ARN for encryption"
  type        = string
}

variable "jwt_rotation_days" {
  description = "Days between JWT key rotations"
  type        = number
  default     = 30
}

variable "db_rotation_days" {
  description = "Days between database credential rotations"
  type        = number
  default     = 90
}

variable "payment_rotation_days" {
  description = "Days between payment credential rotations"
  type        = number
  default     = 60
}

variable "external_rotation_days" {
  description = "Days between external service credential rotations"
  type        = number
  default     = 90
}

variable "log_level" {
  description = "Log level for sanitization"
  type        = string
  default     = "INFO"
}
