variable "environment" {
  description = "Environment name"
  type        = string
}

variable "fraud_db_arn" {
  description = "Fraud database ARN"
  type        = string
}

variable "fraud_db_secret_arn" {
  description = "Fraud database secret ARN"
  type        = string
}

variable "auth_db_arn" {
  description = "Auth service database ARN"
  type        = string
}

variable "auth_db_secret_arn" {
  description = "Auth database secret ARN"
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

variable "trust_db_arn" {
  description = "Trust service database ARN"
  type        = string
}

variable "trust_db_secret_arn" {
  description = "Trust database secret ARN"
  type        = string
}

variable "cognito_authorizer_id" {
  description = "Cognito authorizer ID for API Gateway"
  type        = string
}

variable "score_thresholds" {
  description = "Fraud score thresholds"
  type        = map(number)
  default = {
    normal  = 30
    monitor = 60
    limit   = 80
    freeze  = 100
  }
}
