variable "environment" {
  description = "Environment name"
  type        = string
}

variable "kms_key_arn" {
  description = "KMS key ARN for encryption"
  type        = string
}

variable "cognito_user_pool_arn" {
  description = "Cognito User Pool ARN for admin authentication"
  type        = string
}
