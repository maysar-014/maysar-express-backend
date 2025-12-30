variable "environment" {
  description = "Environment name"
  type        = string
}

variable "domain_name" {
  description = "Domain name for custom API Gateway domain"
  type        = string
  default     = ""
}

variable "alb_dns_name" {
  description = "ALB DNS name to proxy requests to"
  type        = string
}

variable "cognito_user_pool_arn" {
  description = "Cognito User Pool ARN for authorization"
  type        = string
}

variable "stage_name" {
  description = "API Gateway stage name"
  type        = string
  default     = "prod"
}

variable "rate_limit" {
  description = "Rate limit for API Gateway usage plan"
  type        = number
  default     = 100
}

variable "burst_limit" {
  description = "Burst limit for API Gateway usage plan"
  type        = number
  default     = 200
}

variable "quota_limit" {
  description = "Quota limit for API Gateway usage plan"
  type        = number
  default     = 10000
}

variable "quota_offset" {
  description = "Quota offset for API Gateway usage plan"
  type        = number
  default     = 0
}

variable "quota_period" {
  description = "Quota period for API Gateway usage plan"
  type        = string
  default     = "DAY"
}

variable "enable_waf" {
  description = "Enable WAF protection for API Gateway"
  type        = bool
  default     = true
}
