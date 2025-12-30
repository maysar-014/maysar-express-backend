variable "environment" {
  description = "Environment name"
  type        = string
}

variable "kms_key_arn" {
  description = "KMS key ARN for encryption"
  type        = string
}

variable "trust_db_arn" {
  description = "Trust service database ARN"
  type        = string
}

variable "payment_db_arn" {
  description = "Payment service database ARN"
  type        = string
}

variable "order_db_arn" {
  description = "Order service database ARN"
  type        = string
}

variable "logistics_db_arn" {
  description = "Logistics service database ARN"
  type        = string
}

variable "trust_db_secret_arn" {
  description = "Trust database secret ARN"
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

variable "logistics_db_secret_arn" {
  description = "Logistics database secret ARN"
  type        = string
}

variable "triage_sla_hours" {
  description = "SLA for initial triage in hours"
  type        = number
  default     = 24
}

variable "resolution_sla_hours" {
  description = "SLA for dispute resolution in hours"
  type        = number
  default     = 168 # 7 days
}

variable "evidence_collection_timeout_hours" {
  description = "Timeout for evidence collection in hours"
  type        = number
  default     = 48
}
