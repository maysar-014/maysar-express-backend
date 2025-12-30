variable "environment" {
  description = "Environment name"
  type        = string
}

variable "prometheus_endpoint" {
  description = "Prometheus endpoint for metrics"
  type        = string
  default     = ""
}

variable "grafana_endpoint" {
  description = "Grafana endpoint for dashboards"
  type        = string
  default     = ""
}

variable "alert_webhook_url" {
  description = "Webhook URL for SLO alerts"
  type        = string
  default     = ""
}

variable "sentry_dsn" {
  description = "Sentry DSN for error tracking"
  type        = string
  default     = ""
}

variable "error_budget_threshold" {
  description = "Threshold for error budget exhaustion (0.0-1.0)"
  type        = string
  default     = "0.5"
}

variable "cognito_authorizer_id" {
  description = "Cognito authorizer ID for API Gateway"
  type        = string
}
