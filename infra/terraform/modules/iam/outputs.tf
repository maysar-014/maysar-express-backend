output "eks_service_account_roles" {
  description = "Map of service account names to their IAM role ARNs"
  value = {
    for k, v in aws_iam_role.eks_service_account : k => v.arn
  }
}

output "api_gateway_role_arn" {
  description = "API Gateway IAM role ARN"
  value       = aws_iam_role.api_gateway.arn
}

output "eventbridge_role_arn" {
  description = "EventBridge IAM role ARN"
  value       = aws_iam_role.eventbridge.arn
}

output "lambda_role_arn" {
  description = "Lambda IAM role ARN"
  value       = aws_iam_role.lambda.arn
}

output "codebuild_role_arn" {
  description = "CodeBuild IAM role ARN"
  value       = aws_iam_role.codebuild.arn
}

output "codepipeline_role_arn" {
  description = "CodePipeline IAM role ARN"
  value       = aws_iam_role.codepipeline.arn
}

output "ecs_task_execution_role_arn" {
  description = "ECS task execution IAM role ARN"
  value       = aws_iam_role.ecs_task_execution.arn
}

output "ecs_task_role_arn" {
  description = "ECS task IAM role ARN"
  value       = aws_iam_role.ecs_task.arn
}

output "service_policies" {
  description = "Map of service names to their IAM policy ARNs"
  value = {
    auth_service       = aws_iam_policy.auth_service.arn
    payment_service    = aws_iam_policy.payment_service.arn
    admin_service      = aws_iam_policy.admin_service.arn
    analytics_service  = aws_iam_policy.analytics_service.arn
    cdn_service        = aws_iam_policy.cdn_service.arn
  }
}

# Individual service account role ARNs for convenience
output "auth_service_role_arn" {
  description = "Auth service IAM role ARN"
  value       = aws_iam_role.eks_service_account["auth-service"].arn
}

output "order_service_role_arn" {
  description = "Order service IAM role ARN"
  value       = aws_iam_role.eks_service_account["order-service"].arn
}

output "payment_service_role_arn" {
  description = "Payment service IAM role ARN"
  value       = aws_iam_role.eks_service_account["payment-service"].arn
}

output "seller_service_role_arn" {
  description = "Seller service IAM role ARN"
  value       = aws_iam_role.eks_service_account["seller-service"].arn
}

output "catalog_service_role_arn" {
  description = "Catalog service IAM role ARN"
  value       = aws_iam_role.eks_service_account["catalog-service"].arn
}

output "inventory_service_role_arn" {
  description = "Inventory service IAM role ARN"
  value       = aws_iam_role.eks_service_account["inventory-service"].arn
}

output "logistics_service_role_arn" {
  description = "Logistics service IAM role ARN"
  value       = aws_iam_role.eks_service_account["logistics-service"].arn
}

output "commission_service_role_arn" {
  description = "Commission service IAM role ARN"
  value       = aws_iam_role.eks_service_account["commission-service"].arn
}

output "trust_service_role_arn" {
  description = "Trust service IAM role ARN"
  value       = aws_iam_role.eks_service_account["trust-service"].arn
}

output "notification_service_role_arn" {
  description = "Notification service IAM role ARN"
  value       = aws_iam_role.eks_service_account["notification-service"].arn
}

output "admin_service_role_arn" {
  description = "Admin service IAM role ARN"
  value       = aws_iam_role.eks_service_account["admin-service"].arn
}

output "analytics_service_role_arn" {
  description = "Analytics service IAM role ARN"
  value       = aws_iam_role.eks_service_account["analytics-service"].arn
}

output "community_service_role_arn" {
  description = "Community service IAM role ARN"
  value       = aws_iam_role.eks_service_account["community-service"].arn
}

output "cdn_service_role_arn" {
  description = "CDN service IAM role ARN"
  value       = aws_iam_role.eks_service_account["cdn-service"].arn
}
