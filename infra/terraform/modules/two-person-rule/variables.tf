variable "environment" {
  description = "Environment name"
  type        = string
}

variable "kms_key_arn" {
  description = "KMS key ARN for encryption"
  type        = string
}

variable "approval_timeout_hours" {
  description = "Hours before approval requests expire"
  type        = number
  default     = 24
}

variable "required_approvers" {
  description = "Number of required approvers for actions"
  type        = number
  default     = 2
}
