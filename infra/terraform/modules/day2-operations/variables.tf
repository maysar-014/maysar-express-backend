variable "environment" {
  description = "Environment name"
  type        = string
}

variable "fraud_dashboard_url" {
  description = "Fraud dashboard URL for monitoring"
  type        = string
  default     = ""
}

variable "payment_db_arn" {
  description = "Payment service database ARN"
  type        = string
}

variable "payment_db_secret_arn" {
  description = "Payment database secret ARN"
  type        = string
}

variable "trust_db_arn" {
  description = "Trust service database ARN"
  type        = string
}

variable "trust_db_secret_arn" {
  description = "Trust database secret ARN"
  type        = string
}

variable "admin_db_arn" {
  description = "Admin service database ARN"
  type        = string
}

variable "admin_db_secret_arn" {
  description = "Admin database secret ARN"
  type        = string
}

variable "kms_key_arn" {
  description = "KMS key ARN for encryption"
  type        = string
}

variable "deployment_pipeline_arn" {
  description = "CI/CD deployment pipeline ARN"
  type        = string
  default     = ""
}
