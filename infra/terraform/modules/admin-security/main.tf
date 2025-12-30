# Admin Security Module for Maysar

# Admin IAM Users with MFA Enforcement
resource "aws_iam_user" "admins" {
  for_each = toset(var.admin_users)

  name = "maysar-admin-${each.key}"
  path = "/maysar/admins/"

  tags = {
    Name        = "maysar-admin-${each.key}"
    Environment = var.environment
    Role        = "Administrator"
  }
}

# Admin IAM Policies
resource "aws_iam_policy" "admin_base" {
  name        = "maysar-${var.environment}-admin-base-policy"
  description = "Base permissions for Maysar administrators"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "iam:ListUsers",
          "iam:ListRoles",
          "iam:ListPolicies",
          "iam:GetUser",
          "iam:GetRole",
          "iam:GetPolicy"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "ec2:DescribeInstances",
          "ec2:DescribeSecurityGroups",
          "ec2:DescribeSubnets",
          "ec2:DescribeVpcs"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "rds:DescribeDBInstances",
          "rds:DescribeDBClusters"
        ]
        Resource = "*"
      }
    ]
  })
}

resource "aws_iam_policy" "admin_financial" {
  name        = "maysar-${var.environment}-admin-financial-policy"
  description = "Financial operations permissions for Maysar administrators"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue"
        ]
        Resource = [
          "arn:aws:secretsmanager:${var.aws_region}:${var.aws_account_id}:secret:maysar/${var.environment}/payment/*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject"
        ]
        Resource = "arn:aws:s3:::maysar-${var.environment}-financial-audit/*"
      }
    ]
  })
}

resource "aws_iam_policy" "admin_compliance" {
  name        = "maysar-${var.environment}-admin-compliance-policy"
  description = "Compliance operations permissions for Maysar administrators"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "logs:DescribeLogGroups",
          "logs:DescribeLogStreams",
          "logs:GetLogEvents"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject"
        ]
        Resource = [
          "arn:aws:s3:::maysar-${var.environment}-audit-logs/*",
          "arn:aws:s3:::maysar-${var.environment}-db-audit-logs/*"
        ]
      }
    ]
  })
}

# Attach policies to admin users
resource "aws_iam_user_policy_attachment" "admin_base" {
  for_each = aws_iam_user.admins

  user       = each.value.name
  policy_arn = aws_iam_policy.admin_base.arn
}

resource "aws_iam_user_policy_attachment" "admin_financial" {
  for_each = toset(var.financial_admins)

  user       = "maysar-admin-${each.key}"
  policy_arn = aws_iam_policy.admin_financial.arn

  depends_on = [aws_iam_user.admins]
}

resource "aws_iam_user_policy_attachment" "admin_compliance" {
  for_each = toset(var.compliance_admins)

  user       = "maysar-admin-${each.key}"
  policy_arn = aws_iam_policy.admin_compliance.arn

  depends_on = [aws_iam_user.admins]
}

# Virtual MFA devices for admin users
resource "aws_iam_virtual_mfa_device" "admins" {
  for_each = aws_iam_user.admins

  virtual_mfa_device_name = "maysar-admin-${each.key}-mfa"
  path                    = "/maysar/admins/"

  tags = {
    Name = "maysar-admin-${each.key}-mfa"
  }
}

# IAM Policy for MFA enforcement
resource "aws_iam_policy" "mfa_enforcement" {
  name        = "maysar-${var.environment}-mfa-enforcement-policy"
  description = "Enforces MFA for all admin operations"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Deny"
        Action = "*"
        Resource = "*"
        Condition = {
          BoolIfExists = {
            "aws:MultiFactorAuthPresent": "false"
          }
        }
      }
    ]
  })
}

# Attach MFA enforcement to admin users
resource "aws_iam_user_policy_attachment" "mfa_enforcement" {
  for_each = aws_iam_user.admins

  user       = each.value.name
  policy_arn = aws_iam_policy.mfa_enforcement.arn
}

# Admin Console Security Group (IP-restricted)
resource "aws_security_group" "admin_console" {
  name_prefix = "maysar-${var.environment}-admin-console-"
  vpc_id      = var.vpc_id

  # SSH access from admin IPs only
  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = var.admin_ip_ranges
    description = "SSH access from admin IP ranges only"
  }

  # HTTPS for admin console
  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = var.admin_ip_ranges
    description = "HTTPS access from admin IP ranges only"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "maysar-${var.environment}-admin-console-sg"
  }
}

# Admin Console EC2 Instance (for admin UI)
resource "aws_instance" "admin_console" {
  count = var.enable_admin_console ? 1 : 0

  ami           = data.aws_ami.amazon_linux.id
  instance_type = "t3.micro"
  vpc_security_group_ids = [aws_security_group.admin_console.id]
  subnet_id     = var.private_subnets[0]
  key_name      = aws_key_pair.admin_console[0].key_name

  user_data = <<-EOF
    #!/bin/bash
    yum update -y
    yum install -y httpd php
    systemctl start httpd
    systemctl enable httpd
    echo "<h1>Maysar Admin Console</h1><p>Access restricted to authorized personnel only.</p>" > /var/www/html/index.html
  EOF

  tags = {
    Name = "maysar-${var.environment}-admin-console"
  }

  lifecycle {
    ignore_changes = [user_data]
  }
}

# Admin SSH Key Pair
resource "aws_key_pair" "admin_console" {
  count = var.enable_admin_console ? 1 : 0

  key_name   = "maysar-${var.environment}-admin-console-key"
  public_key = var.admin_ssh_public_key

  tags = {
    Name = "maysar-${var.environment}-admin-console-key"
  }
}

# S3 Bucket for Admin Audit Logs (immutable)
resource "aws_s3_bucket" "admin_audit_logs" {
  bucket = "maysar-${var.environment}-admin-audit-logs-${random_string.admin_audit_suffix.result}"

  tags = {
    Name = "maysar-${var.environment}-admin-audit-logs"
  }
}

resource "random_string" "admin_audit_suffix" {
  length  = 8
  lower   = true
  upper   = false
  numeric = true
  special = false
}

# S3 Bucket encryption for admin audit logs
resource "aws_s3_bucket_server_side_encryption_configuration" "admin_audit_logs" {
  bucket = aws_s3_bucket.admin_audit_logs.id

  rule {
    apply_server_side_encryption_by_default {
      kms_master_key_id = var.kms_key_arn
      sse_algorithm     = "aws:kms"
    }
    bucket_key_enabled = true
  }
}

# S3 Bucket versioning for immutability
resource "aws_s3_bucket_versioning" "admin_audit_logs" {
  bucket = aws_s3_bucket.admin_audit_logs.id
  versioning_configuration {
    status = "Enabled"
  }
}

# S3 Bucket lifecycle for admin audit logs (7 years retention)
resource "aws_s3_bucket_lifecycle_configuration" "admin_audit_logs" {
  bucket = aws_s3_bucket.admin_audit_logs.id

  rule {
    id     = "admin_audit_log_retention"
    status = "Enabled"

    expiration {
      days = 2555 # 7 years
    }

    noncurrent_version_expiration {
      noncurrent_days = 2555
    }
  }
}

# S3 Bucket policy for immutable audit logs
resource "aws_s3_bucket_policy" "admin_audit_logs" {
  bucket = aws_s3_bucket.admin_audit_logs.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Deny"
        Principal = "*"
        Action = [
          "s3:DeleteObject",
          "s3:DeleteObjectVersion"
        ]
        Resource = "${aws_s3_bucket.admin_audit_logs.arn}/*"
        Condition = {
          StringNotEquals = {
            "aws:PrincipalArn": var.super_admin_arn
          }
        }
      }
    ]
  })
}

# Financial Audit Logs Bucket
resource "aws_s3_bucket" "financial_audit_logs" {
  bucket = "maysar-${var.environment}-financial-audit-logs-${random_string.financial_audit_suffix.result}"

  tags = {
    Name = "maysar-${var.environment}-financial-audit-logs"
  }
}

resource "random_string" "financial_audit_suffix" {
  length  = 8
  lower   = true
  upper   = false
  numeric = true
  special = false
}

# Financial audit logs encryption
resource "aws_s3_bucket_server_side_encryption_configuration" "financial_audit_logs" {
  bucket = aws_s3_bucket.financial_audit_logs.id

  rule {
    apply_server_side_encryption_by_default {
      kms_master_key_id = var.kms_key_arn
      sse_algorithm     = "aws:kms"
    }
    bucket_key_enabled = true
  }
}

# Financial audit logs versioning and immutability
resource "aws_s3_bucket_versioning" "financial_audit_logs" {
  bucket = aws_s3_bucket.financial_audit_logs.id
  versioning_configuration {
    status = "Enabled"
  }
}

# Two-Person Approval Lambda for Financial Operations
resource "aws_lambda_function" "financial_approval" {
  filename         = data.archive_file.financial_approval.output_path
  function_name    = "maysar-${var.environment}-financial-approval"
  role            = aws_iam_role.financial_approval.arn
  handler         = "index.handler"
  runtime         = "nodejs18.x"
  timeout         = 300

  environment {
    variables = {
      AUDIT_BUCKET     = aws_s3_bucket.financial_audit_logs.bucket
      APPROVAL_TIMEOUT = "3600" # 1 hour
      REQUIRED_APPROVERS = "2"
    }
  }
}

data "archive_file" "financial_approval" {
  type        = "zip"
  output_path = "/tmp/financial-approval.zip"

  source {
    content  = <<-EOF
const AWS = require('aws-sdk');

exports.handler = async (event) => {
  const s3 = new AWS.S3();
  const ses = new AWS.SES();

  try {
    const { operation, amount, requester, details } = event;

    // Check if operation requires two-person approval
    if (amount > 1000 || operation === 'payout') {
      // Create approval request
      const approvalRequest = {
        id: `approval-${Date.now()}`,
        operation,
        amount,
        requester,
        details,
        status: 'pending',
        createdAt: new Date().toISOString(),
        approvers: [],
        requiredApprovers: 2
      };

      // Store approval request
      await s3.putObject({
        Bucket: process.env.AUDIT_BUCKET,
        Key: `approvals/${approvalRequest.id}.json`,
        Body: JSON.stringify(approvalRequest, null, 2),
        ServerSideEncryption: 'aws:kms'
      }).promise();

      // Send approval emails to financial admins
      const emailParams = {
        Source: 'noreply@maysar.com',
        Destination: {
          ToAddresses: ${jsonencode(var.financial_admin_emails)}
        },
        Message: {
          Subject: {
            Data: `Maysar Financial Approval Required: ${operation}`
          },
          Body: {
            Text: {
              Data: `Financial operation requires approval:

Operation: ${operation}
Amount: $${amount}
Requester: ${requester}
Details: ${JSON.stringify(details, null, 2)}

Please review and approve via the admin console.`
            }
          }
        }
      };

      await ses.sendEmail(emailParams).promise();

      return {
        statusCode: 200,
        approvalRequired: true,
        approvalId: approvalRequest.id
      };
    }

    // Operation doesn't require approval
    return {
      statusCode: 200,
      approvalRequired: false
    };

  } catch (error) {
    console.error('Financial approval failed:', error);
    throw error;
  }
};
EOF
    filename = "index.js"
  }
}

resource "aws_iam_role" "financial_approval" {
  name = "maysar-${var.environment}-financial-approval-role"

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

resource "aws_iam_role_policy" "financial_approval" {
  name = "maysar-${var.environment}-financial-approval-policy"
  role = aws_iam_role.financial_approval.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:PutObject",
          "s3:GetObject"
        ]
        Resource = "${aws_s3_bucket.financial_audit_logs.arn}/*"
      },
      {
        Effect = "Allow"
        Action = [
          "ses:SendEmail"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "kms:GenerateDataKey",
          "kms:Decrypt"
        ]
        Resource = var.kms_key_arn
      }
    ]
  })
}

# CloudWatch Alarms for Admin Security
resource "aws_cloudwatch_metric_alarm" "admin_console_access" {
  alarm_name          = "maysar-${var.environment}-admin-console-access"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "1"
  metric_name         = "ConsoleLoginFailures"
  namespace           = "AWS/Console"
  period              = "300"
  statistic           = "Sum"
  threshold           = "3"
  alarm_description   = "Multiple failed admin console login attempts"
  alarm_actions       = [aws_sns_topic.admin_security_alerts.arn]

  dimensions = {
    SourceRegion = var.aws_region
  }
}

resource "aws_cloudwatch_metric_alarm" "mfa_disabled" {
  alarm_name          = "maysar-${var.environment}-mfa-disabled"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "1"
  metric_name         = "MFADevicesDeleted"
  namespace           = "AWS/IAM"
  period              = "300"
  statistic           = "Sum"
  threshold           = "0"
  alarm_description   = "MFA device disabled for admin user"
  alarm_actions       = [aws_sns_topic.admin_security_alerts.arn]
}

# SNS Topic for Admin Security Alerts
resource "aws_sns_topic" "admin_security_alerts" {
  name = "maysar-${var.environment}-admin-security-alerts"

  tags = {
    Name = "maysar-${var.environment}-admin-security-alerts"
  }
}

# AWS Config Rules for Admin Security
resource "aws_config_config_rule" "iam_user_mfa_enabled" {
  name = "iam-user-mfa-enabled"

  source {
    owner             = "AWS"
    source_identifier = "IAM_USER_MFA_ENABLED"
  }

  depends_on = [aws_config_configuration_recorder.main]
}

resource "aws_config_config_rule" "root_access_keys" {
  name = "root-access-keys"

  source {
    owner             = "AWS"
    source_identifier = "ROOT_ACCESS_KEYS"
  }

  depends_on = [aws_config_configuration_recorder.main]
}

# Data sources
data "aws_ami" "amazon_linux" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["amzn2-ami-hvm-*-x86_64-gp2"]
  }
}

data "aws_caller_identity" "current" {}

# Variables for Config (from security module)
variable "aws_account_id" {
  description = "AWS account ID"
  type        = string
  default     = ""
}

variable "kms_key_arn" {
  description = "KMS key ARN"
  type        = string
  default     = ""
}

# Local values
locals {
  aws_account_id = var.aws_account_id != "" ? var.aws_account_id : data.aws_caller_identity.current.account_id
  kms_key_arn   = var.kms_key_arn != "" ? var.kms_key_arn : "alias/aws/s3"
}
