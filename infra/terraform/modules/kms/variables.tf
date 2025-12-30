variable "environment" {
  description = "Environment name"
  type        = string
}

variable "aws_account_id" {
  description = "AWS account ID"
  type        = string
}

variable "key_administrators" {
  description = "List of IAM ARNs that can administer KMS keys"
  type        = list(string)
  default     = []
}

variable "key_users" {
  description = "List of IAM ARNs that can use KMS keys for encryption/decryption"
  type        = list(string)
  default     = []
}

variable "cross_account_principals" {
  description = "List of cross-account principals for KMS grants"
  type        = list(string)
  default     = []
}
