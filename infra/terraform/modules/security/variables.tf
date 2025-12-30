variable "environment" {
  description = "Environment name"
  type        = string
}

variable "vpc_id" {
  description = "VPC ID"
  type        = string
}

variable "aws_account_id" {
  description = "AWS account ID"
  type        = string
}

variable "kms_key_arn" {
  description = "KMS key ARN for encryption"
  type        = string
}

variable "admin_cidr_blocks" {
  description = "CIDR blocks allowed for admin access"
  type        = list(string)
  default     = []
}

variable "alb_arn" {
  description = "ALB ARN for Shield protection"
  type        = string
  default     = ""
}

variable "enable_shield" {
  description = "Enable AWS Shield Advanced"
  type        = bool
  default     = false
}

variable "enable_waf" {
  description = "Enable AWS WAF"
  type        = bool
  default     = true
}

variable "waf_rate_limit" {
  description = "WAF rate limit (requests per 5 minutes per IP)"
  type        = number
  default     = 1000
}

variable "enable_guardduty" {
  description = "Enable AWS GuardDuty"
  type        = bool
  default     = true
}

variable "enable_security_hub" {
  description = "Enable AWS Security Hub"
  type        = bool
  default     = true
}

variable "enable_macie" {
  description = "Enable AWS Macie for data discovery"
  type        = bool
  default     = false
}

variable "enable_inspector" {
  description = "Enable AWS Inspector for EC2 assessment"
  type        = bool
  default     = true
}

variable "enable_private_ca" {
  description = "Enable AWS Certificate Manager Private CA"
  type        = bool
  default     = false
}
