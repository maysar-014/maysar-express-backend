# Variables for Monitoring & Alerting Module

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
  default     = "dev"
}

variable "aws_region" {
  description = "AWS region for resources"
  type        = string
  default     = "eu-west-1"
}

variable "primary_on_call_users" {
  description = "List of PagerDuty user IDs for primary on-call rotation"
  type        = list(string)
  default     = []
}

variable "secondary_on_call_users" {
  description = "List of PagerDuty user IDs for secondary on-call rotation"
  type        = list(string)
  default     = []
}

variable "slack_webhook_url" {
  description = "Slack webhook URL for incident notifications"
  type        = string
  default     = ""
  sensitive   = true
}

variable "pagerduty_token" {
  description = "PagerDuty API token"
  type        = string
  default     = ""
  sensitive   = true
}

variable "enable_pagerduty" {
  description = "Enable PagerDuty integration"
  type        = bool
  default     = true
}

variable "enable_slack_integration" {
  description = "Enable Slack integration for alerts"
  type        = bool
  default     = true
}

variable "slo_targets" {
  description = "Custom SLO targets per service (overrides defaults)"
  type = map(object({
    availability = optional(number, 99.9)
    latency_p95  = optional(number, 1000)
  }))
  default = {}
}

variable "alert_email_endpoints" {
  description = "List of email addresses for alert notifications"
  type        = list(string)
  default     = []
}

variable "alert_sms_endpoints" {
  description = "List of phone numbers for SMS alert notifications"
  type        = list(string)
  default     = []
}

variable "monitoring_retention_days" {
  description = "Number of days to retain monitoring data"
  type        = number
  default     = 90
}

variable "enable_detailed_logging" {
  description = "Enable detailed CloudWatch logging for all services"
  type        = bool
  default     = true
}

variable "tags" {
  description = "Common tags for all monitoring resources"
  type        = map(string)
  default = {
    Project     = "Maysar"
    Environment = "Production"
    ManagedBy   = "Terraform"
  }
}
