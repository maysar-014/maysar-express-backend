variable "environment" {
  description = "Environment name"
  type        = string
}

variable "payment_db_arn" {
  description = "Payment database ARN"
  type        = string
}

variable "order_db_arn" {
  description = "Order database ARN"
  type        = string
}

variable "payment_db_secret_arn" {
  description = "Payment database secret ARN"
  type        = string
}

variable "order_db_secret_arn" {
  description = "Order database secret ARN"
  type        = string
}

variable "dlq_bucket_name" {
  description = "DLQ S3 bucket name"
  type        = string
}

variable "auth_failure_threshold" {
  description = "Threshold for auth failure alerts"
  type        = number
  default     = 10
}

variable "payout_spike_threshold" {
  description = "Threshold for payout spike alerts (USD)"
  type        = number
  default     = 50000
}

variable "order_backlog_threshold" {
  description = "Threshold for order backlog alerts"
  type        = number
  default     = 100
}

variable "dlq_growth_threshold" {
  description = "Threshold for DLQ growth alerts (%)"
  type        = number
  default     = 50
}

variable "dlq_absolute_threshold" {
  description = "Absolute threshold for DLQ size alerts"
  type        = number
  default     = 100
}
