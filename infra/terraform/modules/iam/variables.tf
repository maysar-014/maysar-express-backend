variable "environment" {
  description = "Environment name"
  type        = string
}

variable "aws_region" {
  description = "AWS region"
  type        = string
}

variable "aws_account_id" {
  description = "AWS account ID"
  type        = string
}

variable "eks_oidc_provider_arn" {
  description = "EKS OIDC provider ARN for IRSA"
  type        = string
}

variable "service_accounts" {
  description = "Map of service accounts and their configurations"
  type = map(object({
    namespace           = string
    additional_policies = list(string)
  }))
  default = {
    "auth-service" = {
      namespace           = "maysar"
      additional_policies = []
    }
    "order-service" = {
      namespace           = "maysar"
      additional_policies = []
    }
    "payment-service" = {
      namespace           = "maysar"
      additional_policies = []
    }
    "seller-service" = {
      namespace           = "maysar"
      additional_policies = []
    }
    "catalog-service" = {
      namespace           = "maysar"
      additional_policies = []
    }
    "inventory-service" = {
      namespace           = "maysar"
      additional_policies = []
    }
    "logistics-service" = {
      namespace           = "maysar"
      additional_policies = []
    }
    "commission-service" = {
      namespace           = "maysar"
      additional_policies = []
    }
    "trust-service" = {
      namespace           = "maysar"
      additional_policies = []
    }
    "notification-service" = {
      namespace           = "maysar"
      additional_policies = []
    }
    "admin-service" = {
      namespace           = "maysar"
      additional_policies = []
    }
    "analytics-service" = {
      namespace           = "maysar"
      additional_policies = []
    }
    "community-service" = {
      namespace           = "maysar"
      additional_policies = []
    }
    "cdn-service" = {
      namespace           = "maysar"
      additional_policies = []
    }
  }
}
