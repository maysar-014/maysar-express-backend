output "api_gateway_id" {
  description = "API Gateway ID"
  value       = aws_api_gateway_rest_api.main.id
}

output "api_gateway_arn" {
  description = "API Gateway ARN"
  value       = aws_api_gateway_rest_api.main.arn
}

output "api_gateway_url" {
  description = "API Gateway URL"
  value       = aws_api_gateway_stage.main.invoke_url
}

output "custom_domain_name" {
  description = "API Gateway custom domain name"
  value       = var.domain_name != "" ? aws_api_gateway_domain_name.main[0].domain_name : null
}

output "stage_name" {
  description = "API Gateway stage name"
  value       = aws_api_gateway_stage.main.stage_name
}

output "usage_plan_id" {
  description = "API Gateway usage plan ID"
  value       = aws_api_gateway_usage_plan.main.id
}

output "api_key_id" {
  description = "API Gateway API key ID"
  value       = aws_api_gateway_api_key.main.id
}

output "authorizer_id" {
  description = "Cognito authorizer ID"
  value       = aws_api_gateway_authorizer.cognito.id
}

output "certificate_arn" {
  description = "ACM certificate ARN for custom domain"
  value       = var.domain_name != "" ? aws_acm_certificate.api_gateway[0].arn : null
}
