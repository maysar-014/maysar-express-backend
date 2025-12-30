variable "environment" {
  description = "Environment name"
  type        = string
}

variable "kms_key_arn" {
  description = "KMS key ARN for encryption"
  type        = string
}

variable "event_bus_name" {
  description = "EventBridge bus name"
  type        = string
}

variable "event_bus_arn" {
  description = "EventBridge bus ARN"
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

variable "order_db_arn" {
  description = "Order service database ARN"
  type        = string
}

variable "order_db_secret_arn" {
  description = "Order database secret ARN"
  type        = string
}

variable "payment_db_arn" {
  description = "Payment service database ARN"
  type        = string
}

variable "payment_db_secret_arn" {
  description = "Payment database secret ARN"
  type        = string
}

variable "logistics_db_arn" {
  description = "Logistics service database ARN"
  type        = string
}

variable "logistics_db_secret_arn" {
  description = "Logistics database secret ARN"
  type        = string
}

variable "fraud_analysis_lambda_arn" {
  description = "Fraud analysis Lambda function ARN"
  type        = string
  default     = ""
}
