# KMS Module for Maysar - Standalone KMS Keys

# KMS Key for General Encryption
resource "aws_kms_key" "general" {
  description             = "General purpose KMS key for Maysar encryption"
  deletion_window_in_days = 30
  enable_key_rotation     = true

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "Enable IAM User Permissions"
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::${var.aws_account_id}:root"
        }
        Action   = "kms:*"
        Resource = "*"
      },
      {
        Sid    = "Allow access for Key Administrators"
        Effect = "Allow"
        Principal = {
          AWS = var.key_administrators
        }
        Action = [
          "kms:Create*",
          "kms:Describe*",
          "kms:Enable*",
          "kms:List*",
          "kms:Put*",
          "kms:Update*",
          "kms:Revoke*",
          "kms:Disable*",
          "kms:Get*",
          "kms:Delete*",
          "kms:TagResource",
          "kms:UntagResource",
          "kms:ScheduleKeyDeletion",
          "kms:CancelKeyDeletion"
        ]
        Resource = "*"
      },
      {
        Sid    = "Allow use of the key"
        Effect = "Allow"
        Principal = {
          AWS = var.key_users
        }
        Action = [
          "kms:Encrypt",
          "kms:Decrypt",
          "kms:ReEncrypt*",
          "kms:GenerateDataKey*",
          "kms:DescribeKey"
        ]
        Resource = "*"
      }
    ]
  })

  tags = {
    Name = "maysar-${var.environment}-general-kms"
  }
}

resource "aws_kms_alias" "general" {
  name          = "alias/maysar-${var.environment}-general"
  target_key_id = aws_kms_key.general.key_id
}

# KMS Key for Audit Logging
resource "aws_kms_key" "audit" {
  description             = "KMS key for audit log encryption"
  deletion_window_in_days = 30
  enable_key_rotation     = true

  tags = {
    Name = "maysar-${var.environment}-audit-kms"
  }
}

resource "aws_kms_alias" "audit" {
  name          = "alias/maysar-${var.environment}-audit"
  target_key_id = aws_kms_key.audit.key_id
}

# KMS Key for Backup Encryption
resource "aws_kms_key" "backup" {
  description             = "KMS key for backup encryption"
  deletion_window_in_days = 30
  enable_key_rotation     = true

  tags = {
    Name = "maysar-${var.environment}-backup-kms"
  }
}

resource "aws_kms_alias" "backup" {
  name          = "alias/maysar-${var.environment}-backup"
  target_key_id = aws_kms_key.backup.key_id
}

# KMS Grant for cross-account access (if needed)
resource "aws_kms_grant" "cross_account" {
  count = length(var.cross_account_principals) > 0 ? 1 : 0

  name              = "maysar-${var.environment}-cross-account-grant"
  key_id            = aws_kms_key.general.key_id
  grantee_principal = var.cross_account_principals[0]

  operations = [
    "Encrypt",
    "Decrypt",
    "GenerateDataKey",
    "DescribeKey"
  ]

  retiring_principal = var.cross_account_principals[0]
}

# CloudWatch Alarms for KMS monitoring
resource "aws_cloudwatch_metric_alarm" "kms_key_usage" {
  alarm_name          = "maysar-${var.environment}-kms-key-usage"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "1"
  metric_name         = "KeyUsage"
  namespace           = "AWS/KMS"
  period              = "300"
  statistic           = "Sum"
  threshold           = "1000"
  alarm_description   = "This metric monitors KMS key usage"
  alarm_actions       = [] # Add SNS topic ARN for notifications

  dimensions = {
    KeyId = aws_kms_key.general.key_id
  }
}

# IAM Policy for KMS access
resource "aws_iam_policy" "kms_access" {
  name        = "maysar-${var.environment}-kms-access"
  description = "IAM policy for accessing Maysar KMS keys"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "kms:Encrypt",
          "kms:Decrypt",
          "kms:ReEncrypt*",
          "kms:GenerateDataKey*",
          "kms:DescribeKey",
          "kms:CreateGrant"
        ]
        Resource = [
          aws_kms_key.general.arn,
          aws_kms_key.audit.arn,
          aws_kms_key.backup.arn
        ]
      }
    ]
  })
}
