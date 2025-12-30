# Permission Matrix Implementation Module for Maysar

# Define permission matrix as locals
locals {
  permission_matrix = {
    "support" = {
      "view_orders"          = true
      "cancel_order"         = false
      "force_refund"         = false
      "wallet_credit"        = false
      "freeze_wallet"        = false
      "suspend_seller"       = false
      "override_kyc"         = false
      "delete_financial_data" = false
    }
    "ops" = {
      "view_orders"          = true
      "cancel_order"         = true
      "force_refund"         = false
      "wallet_credit"        = false
      "freeze_wallet"        = false
      "suspend_seller"       = true
      "override_kyc"         = false
      "delete_financial_data" = false
    }
    "finance" = {
      "view_orders"          = true
      "cancel_order"         = false
      "force_refund"         = true  # Requires 2FA
      "wallet_credit"        = true  # Requires 2FA
      "freeze_wallet"        = false
      "suspend_seller"       = false
      "override_kyc"         = false
      "delete_financial_data" = false
    }
    "compliance" = {
      "view_orders"          = true
      "cancel_order"         = false
      "force_refund"         = false
      "wallet_credit"        = false
      "freeze_wallet"        = true
      "suspend_seller"       = true
      "override_kyc"         = true
      "delete_financial_data" = false
    }
    "super" = {
      "view_orders"          = true
      "cancel_order"         = true
      "force_refund"         = true  # Requires 2FA
      "wallet_credit"        = true  # Requires 2FA
      "freeze_wallet"        = true
      "suspend_seller"       = true
      "override_kyc"         = true
      "delete_financial_data" = false
    }
  }

  # Actions requiring 2FA
  two_fa_required_actions = [
    "force_refund",
    "wallet_credit"
  ]
}

# Permission Validation Lambda Function
resource "aws_lambda_function" "permission_validator" {
  filename         = data.archive_file.permission_validator.output_path
  function_name    = "maysar-${var.environment}-permission-validator"
  role            = aws_iam_role.permission_validator.arn
  handler         = "index.handler"
  runtime         = "nodejs18.x"
  timeout         = 30

  environment {
    variables = {
      PERMISSION_MATRIX = jsonencode(local.permission_matrix)
      TWO_FA_ACTIONS    = jsonencode(local.two_fa_required_actions)
    }
  }
}

data "archive_file" "permission_validator" {
  type        = "zip"
  output_path = "/tmp/permission-validator.zip"

  source {
    content  = <<-EOF
const AWS = require('aws-sdk');

exports.handler = async (event) => {
  const { action, role, userId, hasTwoFactor } = event;
  const permissionMatrix = JSON.parse(process.env.PERMISSION_MATRIX);
  const twoFaActions = JSON.parse(process.env.TWO_FA_ACTIONS);

  try {
    // Check if role exists
    if (!permissionMatrix[role]) {
      return {
        allowed: false,
        reason: `Invalid role: ${role}`,
        requiresTwoFactor: false
      };
    }

    // Check if action exists for role
    if (!(action in permissionMatrix[role])) {
      return {
        allowed: false,
        reason: `Unknown action: ${action}`,
        requiresTwoFactor: false
      };
    }

    // Check permission
    const hasPermission = permissionMatrix[role][action];

    if (!hasPermission) {
      return {
        allowed: false,
        reason: `Role ${role} does not have permission for action: ${action}`,
        requiresTwoFactor: false
      };
    }

    // Check if 2FA is required
    const requiresTwoFactor = twoFaActions.includes(action);

    if (requiresTwoFactor && !hasTwoFactor) {
      return {
        allowed: false,
        reason: `Action ${action} requires two-factor authentication`,
        requiresTwoFactor: true
      };
    }

    // Log successful permission check
    console.log(`Permission granted: ${role} -> ${action} for user ${userId}`);

    return {
      allowed: true,
      reason: "Permission granted",
      requiresTwoFactor: requiresTwoFactor
    };

  } catch (error) {
    console.error('Permission validation error:', error);
    return {
      allowed: false,
      reason: `Validation error: ${error.message}`,
      requiresTwoFactor: false
    };
  }
};
EOF
    filename = "index.js"
  }
}

resource "aws_iam_role" "permission_validator" {
  name = "maysar-${var.environment}-permission-validator-role"

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

resource "aws_iam_role_policy" "permission_validator" {
  name = "maysar-${var.environment}-permission-validator-policy"
  role = aws_iam_role.permission_validator.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "arn:aws:logs:*:*:log-group:/aws/lambda/maysar-${var.environment}-permission-validator"
      }
    ]
  })
}

# Admin Action Audit Lambda
resource "aws_lambda_function" "admin_action_auditor" {
  filename         = data.archive_file.admin_action_auditor.output_path
  function_name    = "maysar-${var.environment}-admin-action-auditor"
  role            = aws_iam_role.admin_action_auditor.arn
  handler         = "index.handler"
  runtime         = "nodejs18.x"
  timeout         = 60

  environment {
    variables = {
      AUDIT_BUCKET = aws_s3_bucket.admin_action_audit.bucket
      SNS_TOPIC    = aws_sns_topic.admin_action_alerts.arn
    }
  }
}

data "archive_file" "admin_action_auditor" {
  type        = "zip"
  output_path = "/tmp/admin-action-auditor.zip"

  source {
    content  = <<-EOF
const AWS = require('aws-sdk');

exports.handler = async (event) => {
  const s3 = new AWS.S3();
  const sns = new AWS.SNS();

  try {
    const { adminId, adminRole, action, entityType, entityId, reason, previousState, newState, twoFactorUsed, approvers } = event;

    // Create audit record
    const auditRecord = {
      timestamp: new Date().toISOString(),
      adminId,
      adminRole,
      action,
      entityType,
      entityId,
      reason,
      previousState,
      newState,
      twoFactorUsed: twoFactorUsed || false,
      approvers: approvers || [],
      ipAddress: event.ipAddress || 'unknown',
      userAgent: event.userAgent || 'unknown'
    };

    // Store in S3
    const key = `audit/${new Date().toISOString().split('T')[0]}/${adminId}/${Date.now()}.json`;
    await s3.putObject({
      Bucket: process.env.AUDIT_BUCKET,
      Key: key,
      Body: JSON.stringify(auditRecord, null, 2),
      ServerSideEncryption: 'aws:kms',
      Metadata: {
        'admin-id': adminId,
        'action': action,
        'entity-type': entityType,
        'entity-id': entityId
      }
    }).promise();

    // Send alert for high-risk actions
    const highRiskActions = ['force_refund', 'wallet_credit', 'freeze_wallet', 'delete_financial_data'];
    if (highRiskActions.includes(action)) {
      await sns.publish({
        TopicArn: process.env.SNS_TOPIC,
        Subject: `🚨 High-Risk Admin Action: ${action}`,
        Message: `Admin ${adminId} (${adminRole}) performed high-risk action: ${action}

Entity: ${entityType} ${entityId}
Reason: ${reason}
2FA Used: ${twoFactorUsed}
Approvers: ${approvers?.join(', ') || 'None'}

Action logged and requires immediate review.`
      }).promise();
    }

    console.log(`Admin action audited: ${adminId} -> ${action} on ${entityType} ${entityId}`);

    return {
      statusCode: 200,
      auditKey: key,
      message: 'Action audited successfully'
    };

  } catch (error) {
    console.error('Admin action audit failed:', error);
    throw error;
  }
};
EOF
    filename = "index.js"
  }
}

resource "aws_iam_role" "admin_action_auditor" {
  name = "maysar-${var.environment}-admin-action-auditor-role"

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

resource "aws_iam_role_policy" "admin_action_auditor" {
  name = "maysar-${var.environment}-admin-action-auditor-policy"
  role = aws_iam_role.admin_action_auditor.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:PutObject"
        ]
        Resource = "${aws_s3_bucket.admin_action_audit.arn}/*"
      },
      {
        Effect = "Allow"
        Action = [
          "sns:Publish"
        ]
        Resource = aws_sns_topic.admin_action_alerts.arn
      },
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "arn:aws:logs:*:*:log-group:/aws/lambda/maysar-${var.environment}-admin-action-auditor"
      }
    ]
  })
}

# S3 Bucket for Admin Action Audit Logs
resource "aws_s3_bucket" "admin_action_audit" {
  bucket = "maysar-${var.environment}-admin-action-audit-${random_string.audit_suffix.result}"

  tags = {
    Name = "maysar-${var.environment}-admin-action-audit"
  }
}

resource "random_string" "audit_suffix" {
  length  = 8
  lower   = true
  upper   = false
  numeric = true
  special = false
}

# S3 bucket encryption
resource "aws_s3_bucket_server_side_encryption_configuration" "admin_action_audit" {
  bucket = aws_s3_bucket.admin_action_audit.id

  rule {
    apply_server_side_encryption_by_default {
      kms_master_key_id = var.kms_key_arn
      sse_algorithm     = "aws:kms"
    }
    bucket_key_enabled = true
  }
}

# S3 bucket versioning
resource "aws_s3_bucket_versioning" "admin_action_audit" {
  bucket = aws_s3_bucket.admin_action_audit.id
  versioning_configuration {
    status = "Enabled"
  }
}

# S3 bucket lifecycle (7 years retention)
resource "aws_s3_bucket_lifecycle_configuration" "admin_action_audit" {
  bucket = aws_s3_bucket.admin_action_audit.id

  rule {
    id     = "admin_action_audit_retention"
    status = "Enabled"

    expiration {
      days = 2555 # 7 years
    }

    noncurrent_version_expiration {
      noncurrent_days = 2555
    }
  }
}

# SNS Topic for Admin Action Alerts
resource "aws_sns_topic" "admin_action_alerts" {
  name = "maysar-${var.environment}-admin-action-alerts"

  tags = {
    Name = "maysar-${var.environment}-admin-action-alerts"
  }
}

# CloudWatch Alarms for Permission Violations
resource "aws_cloudwatch_metric_alarm" "permission_violations" {
  alarm_name          = "maysar-${var.environment}-permission-violations"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "1"
  metric_name         = "PermissionViolations"
  namespace           = "Maysar/Admin"
  period              = "300"
  statistic           = "Sum"
  threshold           = "0"
  alarm_description   = "Permission violations detected"
  alarm_actions       = [aws_sns_topic.admin_action_alerts.arn]

  dimensions = {
    ServiceName = "permission-validator"
  }
}

resource "aws_cloudwatch_metric_alarm" "high_risk_actions" {
  alarm_name          = "maysar-${var.environment}-high-risk-admin-actions"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "1"
  metric_name         = "HighRiskAdminActions"
  namespace           = "Maysar/Admin"
  period              = "3600"
  statistic           = "Sum"
  threshold           = "2"
  alarm_description   = "Multiple high-risk admin actions performed"
  alarm_actions       = [aws_sns_topic.admin_action_alerts.arn]

  dimensions = {
    ServiceName = "admin-action-auditor"
  }
}

# API Gateway for Admin Actions (secured)
resource "aws_api_gateway_rest_api" "admin_actions" {
  name        = "maysar-${var.environment}-admin-actions"
  description = "Admin Actions API with Permission Matrix"

  endpoint_configuration {
    types = ["REGIONAL"]
  }
}

# API Gateway Authorizer using Cognito
resource "aws_api_gateway_authorizer" "admin_cognito" {
  name          = "maysar-${var.environment}-admin-cognito-authorizer"
  type          = "COGNITO_USER_POOLS"
  rest_api_id   = aws_api_gateway_rest_api.admin_actions.id
  provider_arns = [var.cognito_user_pool_arn]
}

# Example Admin Action Resource - Cancel Order
resource "aws_api_gateway_resource" "cancel_order" {
  rest_api_id = aws_api_gateway_rest_api.admin_actions.id
  parent_id   = aws_api_gateway_rest_api.admin_actions.root_resource_id
  path_part   = "orders"
}

resource "aws_api_gateway_resource" "cancel_order_id" {
  rest_api_id = aws_api_gateway_rest_api.admin_actions.id
  parent_id   = aws_api_gateway_resource.cancel_order.id
  path_part   = "cancel"
}

resource "aws_api_gateway_method" "cancel_order" {
  rest_api_id   = aws_api_gateway_rest_api.admin_actions.id
  resource_id   = aws_api_gateway_resource.cancel_order_id.id
  http_method   = "POST"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.admin_cognito.id
}

resource "aws_api_gateway_integration" "cancel_order" {
  rest_api_id = aws_api_gateway_rest_api.admin_actions.id
  resource_id = aws_api_gateway_resource.cancel_order_id.id
  http_method = aws_api_gateway_method.cancel_order.http_method

  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.admin_action_handler.invoke_arn
}

# Lambda for handling admin actions
resource "aws_lambda_function" "admin_action_handler" {
  filename         = data.archive_file.admin_action_handler.output_path
  function_name    = "maysar-${var.environment}-admin-action-handler"
  role            = aws_iam_role.admin_action_handler.arn
  handler         = "index.handler"
  runtime         = "nodejs18.x"
  timeout         = 120

  environment {
    variables = {
      PERMISSION_VALIDATOR_ARN = aws_lambda_function.permission_validator.arn
      ACTION_AUDITOR_ARN      = aws_lambda_function.admin_action_auditor.arn
      ADMIN_SERVICE_URL       = "http://admin-service.maysar.svc.cluster.local:3000"
    }
  }
}

data "archive_file" "admin_action_handler" {
  type        = "zip"
  output_path = "/tmp/admin-action-handler.zip"

  source {
    content  = <<-EOF
const AWS = require('aws-sdk');
const lambda = new AWS.Lambda();

exports.handler = async (event) => {
  try {
    const { action, entityId, reason, userId, role, hasTwoFactor } = JSON.parse(event.body);
    const adminId = event.requestContext.authorizer.claims.sub;

    // Step 1: Validate permissions
    const permissionResult = await lambda.invoke({
      FunctionName: process.env.PERMISSION_VALIDATOR_ARN,
      Payload: JSON.stringify({
        action,
        role,
        userId: adminId,
        hasTwoFactor
      })
    }).promise();

    const permission = JSON.parse(permissionResult.Payload);

    if (!permission.allowed) {
      return {
        statusCode: 403,
        body: JSON.stringify({
          error: permission.reason,
          requiresTwoFactor: permission.requiresTwoFactor
        })
      };
    }

    // Step 2: Execute action (call admin service)
    const actionResult = await executeAdminAction(action, entityId, reason);

    // Step 3: Audit action
    await lambda.invoke({
      FunctionName: process.env.ACTION_AUDITOR_ARN,
      Payload: JSON.stringify({
        adminId,
        adminRole: role,
        action,
        entityType: getEntityType(action),
        entityId,
        reason,
        previousState: actionResult.previousState,
        newState: actionResult.newState,
        twoFactorUsed: hasTwoFactor,
        approvers: actionResult.approvers,
        ipAddress: event.requestContext.identity.sourceIp,
        userAgent: event.requestContext.identity.userAgent
      })
    }).promise();

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        action,
        entityId,
        result: actionResult
      })
    };

  } catch (error) {
    console.error('Admin action failed:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Internal server error',
        message: error.message
      })
    };
  }
};

async function executeAdminAction(action, entityId, reason) {
  // Call admin service to execute action
  // This is a placeholder - actual implementation would call the admin service
  const mockResult = {
    previousState: 'active',
    newState: getNewState(action),
    approvers: [],
    executedAt: new Date().toISOString()
  };

  // For actions requiring approval, this would trigger the approval workflow
  if (action === 'force_refund' || action === 'wallet_credit') {
    mockResult.approvers = ['finance-admin-1', 'finance-admin-2'];
  }

  return mockResult;
}

function getEntityType(action) {
  const entityMap = {
    'cancel_order': 'order',
    'force_refund': 'payment',
    'wallet_credit': 'wallet',
    'freeze_wallet': 'wallet',
    'suspend_seller': 'seller',
    'override_kyc': 'user',
    'delete_financial_data': 'user'
  };
  return entityMap[action] || 'unknown';
}

function getNewState(action) {
  const stateMap = {
    'cancel_order': 'cancelled',
    'force_refund': 'refunded',
    'wallet_credit': 'credited',
    'freeze_wallet': 'frozen',
    'suspend_seller': 'suspended',
    'override_kyc': 'verified',
    'delete_financial_data': 'deleted'
  };
  return stateMap[action] || 'modified';
}
EOF
    filename = "index.js"
  }
}

resource "aws_iam_role" "admin_action_handler" {
  name = "maysar-${var.environment}-admin-action-handler-role"

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

resource "aws_iam_role_policy" "admin_action_handler" {
  name = "maysar-${var.environment}-admin-action-handler-policy"
  role = aws_iam_role.admin_action_handler.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "lambda:InvokeFunction"
        ]
        Resource = [
          aws_lambda_function.permission_validator.arn,
          aws_lambda_function.admin_action_auditor.arn
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "arn:aws:logs:*:*:log-group:/aws/lambda/maysar-${var.environment}-admin-action-handler"
      }
    ]
  })
}

# API Gateway Deployment
resource "aws_api_gateway_deployment" "admin_actions" {
  rest_api_id = aws_api_gateway_rest_api.admin_actions.id
  stage_name  = "prod"

  depends_on = [
    aws_api_gateway_integration.cancel_order
  ]
}

# Usage Plan for Admin Actions
resource "aws_api_gateway_usage_plan" "admin_actions" {
  name        = "maysar-${var.environment}-admin-actions-usage-plan"
  description = "Usage plan for admin actions API"

  api_stages {
    api_id = aws_api_gateway_rest_api.admin_actions.id
    stage  = aws_api_gateway_deployment.admin_actions.stage_name
  }

  throttle_settings {
    burst_limit = 10
    rate_limit  = 5
  }
}
