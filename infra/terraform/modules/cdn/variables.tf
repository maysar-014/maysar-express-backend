variable "environment" {
  description = "Environment name"
  type        = string
}

variable "domain_name" {
  description = "Domain name for the application"
  type        = string
  default     = ""
}

variable "aws_account_id" {
  description = "AWS account ID for trusted signers"
  type        = string
}

variable "enable_waf" {
  description = "Enable WAF protection for CDN"
  type        = bool
  default     = true
}

variable "enable_url_signing" {
  description = "Enable CloudFront signed URLs"
  type        = bool
  default     = false
}
