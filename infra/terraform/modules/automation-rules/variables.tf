variable "environment" {
  description = "Environment name"
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

variable "logistics_db_arn" {
  description = "Logistics service database ARN"
  type        = string
}

variable "logistics_db_secret_arn" {
  description = "Logistics database secret ARN"
  type        = string
}

variable "fraud_db_arn" {
  description = "Fraud database ARN"
  type        = string
  default     = ""
}

variable "fraud_db_secret_arn" {
  description = "Fraud database secret ARN"
  type        = string
  default     = ""
}

variable "event_bus_name" {
  description = "EventBridge bus name"
  type        = string
}

variable "event_bus_arn" {
  description = "EventBridge bus ARN"
  type        = string
}

variable "pod_min_strength" {
  description = "Minimum POD strength for auto-decline"
  type        = string
  default     = "STRONG"
}

variable "pattern_threshold" {
  description = "Minimum occurrences to flag as pattern"
  type        = number
  default     = 3
}

variable "pattern_lookback_days" {
  description = "Days to look back for pattern analysis"
  type        = number
  default     = 90
}
