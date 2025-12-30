# Authentication & Secrets Management Module for Maysar

# AWS Cognito User Pool for Advanced Authentication
resource "aws_cognito_user_pool" "maysar" {
  name = "maysar-${var.environment}-users"

  # Password policy
  password_policy {
    minimum_length                   = 12
    require_uppercase                = true
    require_lowercase                = true
    require_numbers                  = true
    require_symbols                  = true
    password_history_size            = 24
    temporary_password_validity_days = 7
  }

  # MFA configuration
  mfa_configuration = "OPTIONAL"

  software_token_mfa_configuration {
    enabled = true
  }

  # Device tracking
  device_configuration {
    challenge_required_on_new_device      = true
    device_only_remembered_on_user_prompt = true
  }

  # User attributes
  schema {
    name                     = "email"
    attribute_data_type      = "String"
    mutable                  = true
    required                 = true

    string_attribute_constraints {
      min_length = 3
      max_length = 254
    }
  }

  schema {
    name                = "given_name"
    attribute_data_type = "String"
    mutable             = true
    required            = true

    string_attribute_constraints {
      min_length = 1
      max_length = 50
    }
  }

  schema {
    name                = "family_name"
    attribute_data_type = "String"
    mutable             = true
    required            = true

    string_attribute_constraints {
      min_length = 1
      max_length = 50
    }
  }

  schema {
    name                     = "phone_number"
    attribute_data_type      = "String"
    mutable                  = true
    required                 = false

    string_attribute_constraints {
      min_length = 1
      max_length = 20
    }
  }

  # Auto-verification
  auto_verified_attributes = ["email"]

  # Email configuration
  email_configuration {
    email_sending_account = "COGNITO_DEFAULT"
  }

  # User verification message
  verification_message_template {
    default_email_option = "CONFIRM_WITH_CODE"
    email_message        = "Your Maysar verification code is {####}"
    email_subject        = "Maysar - Verify your email"
    sms_message          = "Your Maysar verification code is {####}"
  }

  # User invitation message
  user_pool_add_ons {
    advanced_security_mode = "ENFORCED"
  }

  # Account recovery
  account_recovery_setting {
    recovery_mechanism {
      name     = "verified_email"
      priority = 1
    }

    recovery_mechanism {
      name     = "verified_phone_number"
      priority = 2
    }
  }

  tags = {
    Name = "maysar-${var.environment}-user-pool"
  }
}

# Cognito User Pool Client
resource "aws_cognito_user_pool_client" "maysar" {
  name                                 = "maysar-${var.environment}-client"
  user_pool_id                        = aws_cognito_user_pool.maysar.id
  generate_secret                     = true
  explicit_auth_flows                 = ["ALLOW_USER_SRP_AUTH", "ALLOW_REFRESH_TOKEN_AUTH"]
  supported_identity_providers        = ["COGNITO"]
  prevent_user_existence_errors       = "ENABLED"

  # Token validity
  access_token_validity                = 1    # 1 hour
  id_token_validity                   = 1    # 1 hour
  refresh_token_validity              = 30   # 30 days

  # OAuth settings
  allowed_oauth_flows                  = ["code", "implicit"]
  allowed_oauth_flows_user_pool_client = true
  allowed_oauth_scopes                 = ["phone", "email", "openid", "profile"]

  # Callback URLs
  callback_urls = [
    "https://${var.domain_name}/auth/callback",
    "https://api.${var.domain_name}/auth/callback"
  ]

  logout_urls = [
    "https://${var.domain_name}/auth/logout"
  ]

  # Analytics
  analytics_configuration {
    application_id   = aws_pinpoint_app.maysar.application_id
    external_id      = var.aws_account_id
    role_arn         = aws_iam_role.cognito_analytics.arn
    user_data_shared = true
  }
}

# Cognito Identity Pool (for temporary AWS credentials)
resource "aws_cognito_identity_pool" "maysar" {
  identity_pool_name               = "maysar_${var.environment}_identity_pool"
  allow_unauthenticated_identities = false
  allow_classic_flow              = false

  cognito_identity_providers {
    client_id               = aws_cognito_user_pool_client.maysar.id
    provider_name           = "cognito-idp.${var.aws_region}.amazonaws.com/${aws_cognito_user_pool.maysar.id}"
    server_side_token_check = true
  }

  supported_login_providers = {}

  tags = {
    Name = "maysar-${var.environment}-identity-pool"
  }
}

# IAM Role for Cognito Analytics
resource "aws_iam_role" "cognito_analytics" {
  name = "maysar-${var.environment}-cognito-analytics-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "cognito-idp.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "cognito_analytics" {
  role       = aws_iam_role.cognito_analytics.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/CognitoUserPoolAnalyticsServiceRole"
}

# AWS Pinpoint for analytics
resource "aws_pinpoint_app" "maysar" {
  name = "maysar-${var.environment}"

  campaign_hook {
    lambda_function_name = aws_lambda_function.campaign_hook.function_name
    mode                 = "FILTER"
  }

  limits {
    daily                = 10000
    maximum_duration     = 600
    messages_per_second  = 50
    total                = 100000
  }
}

# Lambda for campaign hooks
resource "aws_lambda_function" "campaign_hook" {
  filename         = data.archive_file.campaign_hook.output_path
  function_name    = "maysar-${var.environment}-campaign-hook"
  role            = aws_iam_role.campaign_hook.arn
  handler         = "index.handler"
  runtime         = "nodejs18.x"
  timeout         = 30

  environment {
    variables = {
      ENVIRONMENT = var.environment
    }
  }
}

data "archive_file" "campaign_hook" {
  type        = "zip"
  output_path = "/tmp/campaign-hook.zip"

  source {
    content  = <<-EOF
exports.handler = async (event) => {
  console.log('Campaign hook triggered:', JSON.stringify(event, null, 2));

  // Campaign filtering logic
  return {
    statusCode: 200,
    body: JSON.stringify({ message: 'Campaign hook processed' })
  };
};
EOF
    filename = "index.js"
  }
}

resource "aws_iam_role" "campaign_hook" {
  name = "maysar-${var.environment}-campaign-hook-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })
}

# Secrets Manager with automatic rotation
resource "aws_secretsmanager_secret" "jwt_keys" {
  name                    = "maysar/${var.environment}/jwt"
  description             = "JWT signing keys for Maysar authentication"
  kms_key_id              = var.kms_key_arn
  recovery_window_in_days = 30

  rotation_rules {
    automatically_after_days = var.jwt_rotation_days
  }

  tags = {
    Name        = "maysar-${var.environment}-jwt-keys"
    Environment = var.environment
  }
}

resource "aws_secretsmanager_secret_version" "jwt_keys" {
  secret_id = aws_secretsmanager_secret.jwt_keys.id
  secret_string = jsonencode({
    current_key = "initial-jwt-secret-change-in-production"
    previous_key = "initial-jwt-secret-change-in-production"
    algorithm   = "HS256"
    key_id      = "1"
  })
}

# Lambda for JWT key rotation
resource "aws_lambda_function" "jwt_rotation" {
  filename         = data.archive_file.jwt_rotation.output_path
  function_name    = "maysar-${var.environment}-jwt-rotation"
  role            = aws_iam_role.jwt_rotation.arn
  handler         = "index.handler"
  runtime         = "nodejs18.x"
  timeout         = 60

  environment {
    variables = {
      SECRET_ARN = aws_secretsmanager_secret.jwt_keys.arn
    }
  }
}

data "archive_file" "jwt_rotation" {
  type        = "zip"
  output_path = "/tmp/jwt-rotation.zip"

  source {
    content  = <<-EOF
const crypto = require('crypto');
const AWS = require('aws-sdk');

exports.handler = async (event) => {
  const secretsManager = new AWS.SecretsManager();

  try {
    // Get current secret
    const currentSecret = await secretsManager.getSecretValue({
      SecretId: process.env.SECRET_ARN
    }).promise();

    const secretData = JSON.parse(currentSecret.SecretString);

    // Generate new key
    const newKey = crypto.randomBytes(32).toString('hex');

    // Update secret with rotation
    const newSecretData = {
      current_key: newKey,
      previous_key: secretData.current_key,
      algorithm: 'HS256',
      key_id: (parseInt(secretData.key_id) + 1).toString(),
      rotated_at: new Date().toISOString()
    };

    await secretsManager.updateSecret({
      SecretId: process.env.SECRET_ARN,
      SecretString: JSON.stringify(newSecretData)
    });

    console.log('JWT key rotated successfully');
    return { statusCode: 200, body: 'Rotation completed' };

  } catch (error) {
    console.error('JWT rotation failed:', error);
    throw error;
  }
};
EOF
    filename = "index.js"
  }
}

resource "aws_iam_role" "jwt_rotation" {
  name = "maysar-${var.environment}-jwt-rotation-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy" "jwt_rotation" {
  name = "maysar-${var.environment}-jwt-rotation-policy"
  role = aws_iam_role.jwt_rotation.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue",
          "secretsmanager:UpdateSecret"
        ]
        Resource = aws_secretsmanager_secret.jwt_keys.arn
      },
      {
        Effect = "Allow"
        Action = [
          "kms:Decrypt",
          "kms:GenerateDataKey"
        ]
        Resource = var.kms_key_arn
      }
    ]
  })
}

# Attach rotation function to secret
resource "aws_secretsmanager_secret_rotation" "jwt_keys" {
  secret_id           = aws_secretsmanager_secret.jwt_keys.id
  rotation_lambda_arn = aws_lambda_function.jwt_rotation.arn

  rotation_rules {
    automatically_after_days = var.jwt_rotation_days
  }
}

# Database credentials with rotation
resource "aws_secretsmanager_secret" "db_credentials" {
  for_each = toset([
    "auth-service",
    "order-service",
    "payment-service",
    "seller-service",
    "catalog-service",
    "notification-service",
    "admin-service",
    "analytics-service"
  ])

  name                    = "maysar/${var.environment}/db/${each.key}"
  description             = "Database credentials for ${each.key}"
  kms_key_id              = var.kms_key_arn
  recovery_window_in_days = 30

  rotation_rules {
    automatically_after_days = var.db_rotation_days
  }

  tags = {
    Name        = "maysar-${var.environment}-db-${each.key}"
    Environment = var.environment
    Service     = each.key
  }
}

# Payment credentials with enhanced security
resource "aws_secretsmanager_secret" "payment_credentials" {
  name                    = "maysar/${var.environment}/payment/gateway"
  description             = "Payment gateway credentials"
  kms_key_id              = var.kms_key_arn
  recovery_window_in_days = 30

  rotation_rules {
    automatically_after_days = var.payment_rotation_days
  }

  tags = {
    Name        = "maysar-${var.environment}-payment-gateway"
    Environment = var.environment
    PCI         = "true"
  }
}

# External service credentials (SMTP, SMS, etc.)
resource "aws_secretsmanager_secret" "external_services" {
  name                    = "maysar/${var.environment}/external/services"
  description             = "External service API credentials"
  kms_key_id              = var.kms_key_arn
  recovery_window_in_days = 30

  rotation_rules {
    automatically_after_days = var.external_rotation_days
  }

  tags = {
    Name        = "maysar-${var.environment}-external-services"
    Environment = var.environment
  }
}

# CloudWatch alarms for authentication monitoring
resource "aws_cloudwatch_metric_alarm" "cognito_failed_auth" {
  alarm_name          = "maysar-${var.environment}-cognito-failed-auth"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "1"
  metric_name         = "SignInFailureCount"
  namespace           = "AWS/Cognito"
  period              = "300"
  statistic           = "Sum"
  threshold           = "10"
  alarm_description   = "High number of failed authentication attempts"
  alarm_actions       = [aws_sns_topic.auth_alerts.arn]

  dimensions = {
    UserPool = aws_cognito_user_pool.maysar.id
  }
}

# SNS topic for authentication alerts
resource "aws_sns_topic" "auth_alerts" {
  name = "maysar-${var.environment}-auth-alerts"

  tags = {
    Name = "maysar-${var.environment}-auth-alerts"
  }
}

# AWS WAF rate-based rules for authentication endpoints
resource "aws_wafv2_rule_group" "auth_protection" {
  capacity = 100
  name     = "maysar-${var.environment}-auth-protection"
  scope    = "CLOUDFRONT"

  rule {
    name     = "auth-rate-limit"
    priority = 1

    action {
      block {}
    }

    statement {
      rate_based_statement {
        limit              = 5 # 5 auth attempts per 5 minutes per IP
        aggregate_key_type = "IP"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name               = "AuthRateLimit"
      sampled_requests_enabled  = true
    }
  }

  rule {
    name     = "suspicious-auth-patterns"
    priority = 2

    action {
      challenge {}
    }

    statement {
      and_statement {
        statement {
          byte_match_statement {
            field_to_match {
              uri_path {}
            }
            positional_constraint = "STARTS_WITH"
            search_string         = "/auth"
            text_transformation {
              priority = 1
              type     = "LOWERCASE"
            }
          }
        }

        statement {
          rate_based_statement {
            limit              = 20 # 20 requests per 5 minutes per IP to auth endpoints
            aggregate_key_type = "IP"
            scope_down_statement {
              byte_match_statement {
                field_to_match {
                  uri_path {}
                }
                positional_constraint = "STARTS_WITH"
                search_string         = "/auth"
                text_transformation {
                  priority = 1
                  type     = "LOWERCASE"
                }
              }
            }
          }
        }
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name               = "SuspiciousAuthPatterns"
      sampled_requests_enabled  = true
    }
  }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name               = "AuthProtection"
    sampled_requests_enabled  = true
  }
}

# Log sanitization Lambda function
resource "aws_lambda_function" "log_sanitizer" {
  filename         = data.archive_file.log_sanitizer.output_path
  function_name    = "maysar-${var.environment}-log-sanitizer"
  role            = aws_iam_role.log_sanitizer.arn
  handler         = "index.handler"
  runtime         = "nodejs18.x"
  timeout         = 30

  environment {
    variables = {
      LOG_LEVEL = var.log_level
    }
  }
}

data "archive_file" "log_sanitizer" {
  type        = "zip"
  output_path = "/tmp/log-sanitizer.zip"

  source {
    content  = <<-EOF
const crypto = require('crypto');

// Patterns for sensitive data
const SENSITIVE_PATTERNS = [
  /"password"\s*:\s*"[^"]*"/gi,
  /"token"\s*:\s*"[^"]*"/gi,
  /"secret"\s*:\s*"[^"]*"/gi,
  /"key"\s*:\s*"[^"]*"/gi,
  /"cardNumber"\s*:\s*"[^"]*"/gi,
  /"cvv"\s*:\s*"[^"]*"/gi,
  /Bearer\s+[A-Za-z0-9+/=]{20,}/gi,
  /Authorization:\s*Bearer\s+[A-Za-z0-9+/=]{20,}/gi
];

exports.handler = async (event) => {
  const sanitizedLogs = event.logs.map(log => {
    let sanitizedLog = log;

    SENSITIVE_PATTERNS.forEach(pattern => {
      sanitizedLog = sanitizedLog.replace(pattern, (match) => {
        // Replace sensitive data with hash
        const hash = crypto.createHash('sha256').update(match).digest('hex').substring(0, 8);
        return match.replace(/[^"]*"/, `[REDACTED-${hash}]"`);
      });
    });

    return sanitizedLog;
  });

  return {
    statusCode: 200,
    sanitizedLogs
  };
};
EOF
    filename = "index.js"
  }
}

resource "aws_iam_role" "log_sanitizer" {
  name = "maysar-${var.environment}-log-sanitizer-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })
}

# CloudWatch Logs subscription filter for log sanitization
resource "aws_cloudwatch_log_subscription_filter" "api_gateway_logs" {
  log_group_name  = "/aws/api-gateway/maysar-${var.environment}"
  filter_pattern  = ""
  destination_arn = aws_kinesis_stream.log_processing.arn
  role_arn        = aws_iam_role.log_subscription.arn
}

resource "aws_kinesis_stream" "log_processing" {
  name             = "maysar-${var.environment}-log-processing"
  shard_count      = 1
  retention_period = 24

  tags = {
    Name = "maysar-${var.environment}-log-processing"
  }
}

resource "aws_iam_role" "log_subscription" {
  name = "maysar-${var.environment}-log-subscription-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "logs.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy" "log_subscription" {
  name = "maysar-${var.environment}-log-subscription-policy"
  role = aws_iam_role.log_subscription.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "kinesis:PutRecord"
        ]
        Resource = aws_kinesis_stream.log_processing.arn
      }
    ]
  })
}
