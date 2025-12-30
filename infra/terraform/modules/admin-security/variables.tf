variable "environment" {
  description = "Environment name"
  type        = string
}

variable "aws_region" {
  description = "AWS region"
  type        = string
}

variable "vpc_id" {
  description = "VPC ID"
  type        = string
}

variable "private_subnets" {
  description = "Private subnet IDs"
  type        = list(string)
  default     = []
}

variable "admin_users" {
  description = "List of admin usernames"
  type        = list(string)
  default     = []
}

variable "financial_admins" {
  description = "List of financial admin usernames"
  type        = list(string)
  default     = []
}

variable "compliance_admins" {
  description = "List of compliance admin usernames"
  type        = list(string)
  default     = []
}

variable "admin_ip_ranges" {
  description = "IP ranges allowed for admin access"
  type        = list(string)
  default     = []
}

variable "financial_admin_emails" {
  description = "Email addresses for financial admin approvals"
  type        = list(string)
  default     = []
}

variable "super_admin_arn" {
  description = "ARN of super admin who can delete audit logs"
  type        = string
  default     = ""
}

variable "enable_admin_console" {
  description = "Enable admin console EC2 instance"
  type        = bool
  default     = false
}

variable "admin_ssh_public_key" {
  description = "SSH public key for admin console access"
  type        = string
  default     = ""
}

variable "kms_key_arn" {
  description = "KMS key ARN for encryption"
  type        = string
  default     = ""
}

variable "aws_account_id" {
  description = "AWS account ID"
  type        = string
  default     = ""
}
