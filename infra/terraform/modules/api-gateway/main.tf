# API Gateway Module for Maysar

# API Gateway REST API
resource "aws_api_gateway_rest_api" "main" {
  name        = "maysar-${var.environment}-api"
  description = "Maysar API Gateway for ${var.environment}"

  endpoint_configuration {
    types = ["REGIONAL"]
  }

  # Enable X-Ray tracing
  xray_tracing_enabled = true

  tags = {
    Name = "maysar-${var.environment}-api-gateway"
  }
}

# API Gateway Resource for v1
resource "aws_api_gateway_resource" "v1" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_rest_api.main.root_resource_id
  path_part   = "v1"
}

# API Gateway Resource for auth
resource "aws_api_gateway_resource" "auth" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_resource.v1.id
  path_part   = "auth"
}

# API Gateway Method for auth
resource "aws_api_gateway_method" "auth" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.auth.id
  http_method   = "ANY"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito.id
}

# Integration for auth (proxy to ALB)
resource "aws_api_gateway_integration" "auth" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.auth.id
  http_method = aws_api_gateway_method.auth.http_method

  type                    = "HTTP_PROXY"
  integration_http_method = "ANY"
  uri                     = "http://${var.alb_dns_name}/v1/auth/{proxy}"

  connection_type = "INTERNET"

  request_parameters = {
    "integration.request.path.proxy" = "method.request.path.proxy"
  }

  cache_key_parameters = ["method.request.path.proxy"]
}

# API Gateway Resource for orders
resource "aws_api_gateway_resource" "orders" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_resource.v1.id
  path_part   = "orders"
}

# API Gateway Method for orders
resource "aws_api_gateway_method" "orders" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.orders.id
  http_method   = "ANY"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito.id

  request_parameters = {
    "method.request.path.orderId" = false
  }
}

# Integration for orders
resource "aws_api_gateway_integration" "orders" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.orders.id
  http_method = aws_api_gateway_method.orders.http_method

  type                    = "HTTP_PROXY"
  integration_http_method = "ANY"
  uri                     = "http://${var.alb_dns_name}/v1/orders/{proxy}"

  connection_type = "INTERNET"

  request_parameters = {
    "integration.request.path.proxy" = "method.request.path.proxy"
  }

  cache_key_parameters = ["method.request.path.proxy"]
}

# API Gateway Resource for payments
resource "aws_api_gateway_resource" "payments" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_resource.v1.id
  path_part   = "payments"
}

# API Gateway Method for payments
resource "aws_api_gateway_method" "payments" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.payments.id
  http_method   = "ANY"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito.id

  # Enable API key requirement for payments
  api_key_required = true
}

# Integration for payments
resource "aws_api_gateway_integration" "payments" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.payments.id
  http_method = aws_api_gateway_method.payments.http_method

  type                    = "HTTP_PROXY"
  integration_http_method = "ANY"
  uri                     = "http://${var.alb_dns_name}/v1/payments/{proxy}"

  connection_type = "INTERNET"

  request_parameters = {
    "integration.request.path.proxy" = "method.request.path.proxy"
  }

  cache_key_parameters = ["method.request.path.proxy"]
}

# Cognito User Pool Authorizer
resource "aws_api_gateway_authorizer" "cognito" {
  name          = "maysar-${var.environment}-cognito-authorizer"
  type          = "COGNITO_USER_POOLS"
  rest_api_id   = aws_api_gateway_rest_api.main.id
  provider_arns = [var.cognito_user_pool_arn]
}

# API Key for rate limiting
resource "aws_api_gateway_api_key" "main" {
  name = "maysar-${var.environment}-api-key"
}

# Usage Plan
resource "aws_api_gateway_usage_plan" "main" {
  name        = "maysar-${var.environment}-usage-plan"
  description = "Usage plan for Maysar API"

  api_stages {
    api_id = aws_api_gateway_rest_api.main.id
    stage  = aws_api_gateway_stage.main.stage_name
  }

  throttle_settings {
    burst_limit = var.burst_limit
    rate_limit  = var.rate_limit
  }

  quota_settings {
    limit  = var.quota_limit
    offset = var.quota_offset
    period = var.quota_period
  }
}

# Usage Plan Key
resource "aws_api_gateway_usage_plan_key" "main" {
  key_id        = aws_api_gateway_api_key.main.id
  key_type      = "API_KEY"
  usage_plan_id = aws_api_gateway_usage_plan.main.id
}

# API Gateway Deployment
resource "aws_api_gateway_deployment" "main" {
  rest_api_id = aws_api_gateway_rest_api.main.id

  triggers = {
    redeployment = sha1(jsonencode([
      aws_api_gateway_resource.v1.id,
      aws_api_gateway_resource.auth.id,
      aws_api_gateway_resource.orders.id,
      aws_api_gateway_resource.payments.id,
      aws_api_gateway_method.auth.id,
      aws_api_gateway_method.orders.id,
      aws_api_gateway_method.payments.id,
      aws_api_gateway_integration.auth.id,
      aws_api_gateway_integration.orders.id,
      aws_api_gateway_integration.payments.id,
    ]))
  }

  lifecycle {
    create_before_destroy = true
  }

  depends_on = [
    aws_api_gateway_integration.auth,
    aws_api_gateway_integration.orders,
    aws_api_gateway_integration.payments,
  ]
}

# API Gateway Stage
resource "aws_api_gateway_stage" "main" {
  deployment_id = aws_api_gateway_deployment.main.id
  rest_api_id   = aws_api_gateway_rest_api.main.id
  stage_name    = var.stage_name

  # Enable access logging
  access_log_settings {
    destination_arn = aws_cloudwatch_log_group.api_gateway.arn
    format          = jsonencode({
      requestId      = "$context.requestId"
      ip            = "$context.identity.sourceIp"
      requestTime   = "$context.requestTime"
      httpMethod    = "$context.httpMethod"
      resourcePath  = "$context.resourcePath"
      status        = "$context.status"
      protocol      = "$context.protocol"
      responseLength = "$context.responseLength"
      userAgent     = "$context.identity.userAgent"
    })
  }

  # Enable X-Ray tracing
  xray_tracing_enabled = true

  tags = {
    Name = "maysar-${var.environment}-api-gateway-stage"
  }
}

# CloudWatch Log Group for API Gateway
resource "aws_cloudwatch_log_group" "api_gateway" {
  name              = "/aws/api-gateway/maysar-${var.environment}"
  retention_in_days = 30

  tags = {
    Name = "maysar-${var.environment}-api-gateway-logs"
  }
}

# API Gateway Domain Name (custom domain)
resource "aws_api_gateway_domain_name" "main" {
  count = var.domain_name != "" ? 1 : 0

  domain_name     = "api.${var.domain_name}"
  certificate_arn = aws_acm_certificate.api_gateway[0].arn

  endpoint_configuration {
    types = ["REGIONAL"]
  }

  security_policy = "TLS_1_2"
}

# ACM Certificate for API Gateway custom domain
resource "aws_acm_certificate" "api_gateway" {
  count = var.domain_name != "" ? 1 : 0

  domain_name       = "api.${var.domain_name}"
  validation_method = "DNS"

  subject_alternative_names = [
    "*.api.${var.domain_name}"
  ]

  tags = {
    Name = "maysar-${var.environment}-api-gateway-cert"
  }

  lifecycle {
    create_before_destroy = true
  }
}

# API Gateway Base Path Mapping
resource "aws_api_gateway_base_path_mapping" "main" {
  count = var.domain_name != "" ? 1 : 0

  api_id      = aws_api_gateway_rest_api.main.id
  stage_name  = aws_api_gateway_stage.main.stage_name
  domain_name = aws_api_gateway_domain_name.main[0].domain_name
}

# Route 53 Record for API Gateway custom domain
resource "aws_route53_record" "api_gateway" {
  count = var.domain_name != "" ? 1 : 0

  zone_id = data.aws_route53_zone.main[0].zone_id
  name    = aws_api_gateway_domain_name.main[0].domain_name
  type    = "A"

  alias {
    name                   = aws_api_gateway_domain_name.main[0].regional_domain_name
    zone_id                = aws_api_gateway_domain_name.main[0].regional_zone_id
    evaluate_target_health = false
  }
}

# Data source for Route 53 zone
data "aws_route53_zone" "main" {
  count = var.domain_name != "" ? 1 : 0

  name = var.domain_name
}

# CloudWatch Alarms for API Gateway monitoring
resource "aws_cloudwatch_metric_alarm" "api_gateway_5xx_errors" {
  alarm_name          = "maysar-${var.environment}-api-gateway-5xx-errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "5XXError"
  namespace           = "AWS/ApiGateway"
  period              = "300"
  statistic           = "Sum"
  threshold           = "5"
  alarm_description   = "This metric monitors API Gateway 5XX errors"
  alarm_actions       = [] # Add SNS topic ARN for notifications

  dimensions = {
    ApiName = aws_api_gateway_rest_api.main.name
    Stage   = aws_api_gateway_stage.main.stage_name
    Method  = "GET"
  }
}

resource "aws_cloudwatch_metric_alarm" "api_gateway_latency" {
  alarm_name          = "maysar-${var.environment}-api-gateway-latency"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "Latency"
  namespace           = "AWS/ApiGateway"
  period              = "300"
  statistic           = "Average"
  threshold           = "5000"
  alarm_description   = "This metric monitors API Gateway latency"
  alarm_actions       = [] # Add SNS topic ARN for notifications

  dimensions = {
    ApiName = aws_api_gateway_rest_api.main.name
    Stage   = aws_api_gateway_stage.main.stage_name
    Method  = "GET"
  }
}

# WAF Web ACL for API Gateway (CloudFront distribution)
resource "aws_wafv2_web_acl" "api_gateway" {
  count = var.enable_waf ? 1 : 0

  name        = "maysar-${var.environment}-api-gateway-waf"
  description = "WAF for Maysar API Gateway"
  scope       = "CLOUDFRONT"

  default_action {
    allow {}
  }

  # AWS Managed Rules
  rule {
    name     = "AWSManagedRulesCommonRuleSet"
    priority = 1

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesCommonRuleSet"
        vendor_name = "AWS"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name               = "AWSManagedRulesCommonRuleSet"
      sampled_requests_enabled  = true
    }
  }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name               = "APIGatewayWAF"
    sampled_requests_enabled  = true
  }
}
