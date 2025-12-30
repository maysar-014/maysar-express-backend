variable "environment" {
  description = "Environment name"
  type        = string
}

variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
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

variable "jaeger_endpoint" {
  description = "Jaeger endpoint for tracing"
  type        = string
  default     = ""
}

variable "alert_webhook_url" {
  description = "Webhook URL for alerts"
  type        = string
  default     = ""
}

variable "pagerduty_api_key" {
  description = "PagerDuty API key for incident management"
  type        = string
  default     = ""
}

variable "cognito_authorizer_id" {
  description = "Cognito authorizer ID for API Gateway"
  type        = string
}

variable "service_token" {
  description = "Service authentication token"
  type        = string
  sensitive   = true
}
