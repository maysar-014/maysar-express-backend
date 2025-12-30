# Security Module for Maysar - Network & Infrastructure Security

# VPC Flow Logs for traffic analysis
resource "aws_flow_log" "vpc" {
  iam_role_arn    = aws_iam_role.vpc_flow_logs.arn
  log_destination = aws_cloudwatch_log_group.vpc_flow_logs.arn
  traffic_type    = "ALL"
  vpc_id          = var.vpc_id

  tags = {
    Name = "maysar-${var.environment}-vpc-flow-logs"
  }
}

# CloudWatch Log Group for VPC Flow Logs
resource "aws_cloudwatch_log_group" "vpc_flow_logs" {
  name              = "/aws/vpc/flowlogs/maysar-${var.environment}"
  retention_in_days = 30

  tags = {
    Name = "maysar-${var.environment}-vpc-flow-logs"
  }
}

# IAM Role for VPC Flow Logs
resource "aws_iam_role" "vpc_flow_logs" {
  name = "maysar-${var.environment}-vpc-flow-logs-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "vpc-flow-logs.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "vpc_flow_logs" {
  role       = aws_iam_role.vpc_flow_logs.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonVPCCrossAccountNetworkInterfaceOperations"
}

# Network ACLs for additional security layers
resource "aws_network_acl" "secure" {
  vpc_id = var.vpc_id

  # Inbound rules - very restrictive
  ingress {
    protocol   = "tcp"
    rule_no    = 100
    action     = "allow"
    cidr_block = "10.0.0.0/8"
    from_port  = 0
    to_port    = 65535
  }

  ingress {
    protocol   = "tcp"
    rule_no    = 110
    action     = "allow"
    cidr_block = var.admin_cidr_blocks
    from_port  = 22
    to_port    = 22
  }

  ingress {
    protocol   = "tcp"
    rule_no    = 120
    action     = "allow"
    cidr_block = "0.0.0.0/0"
    from_port  = 80
    to_port    = 80
  }

  ingress {
    protocol   = "tcp"
    rule_no    = 130
    action     = "allow"
    cidr_block = "0.0.0.0/0"
    from_port  = 443
    to_port    = 443
  }

  # Outbound rules
  egress {
    protocol   = "-1"
    rule_no    = 100
    action     = "allow"
    cidr_block = "0.0.0.0/0"
    from_port  = 0
    to_port    = 0
  }

  tags = {
    Name = "maysar-${var.environment}-secure-nacl"
  }
}

# Security Groups for bastion hosts (admin access)
resource "aws_security_group" "bastion" {
  name_prefix = "maysar-${var.environment}-bastion-"
  vpc_id      = var.vpc_id

  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = var.admin_cidr_blocks
    description = "SSH access from admin IPs only"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "maysar-${var.environment}-bastion-sg"
  }
}

# AWS Config for compliance monitoring
resource "aws_config_configuration_recorder" "main" {
  name     = "maysar-${var.environment}-config-recorder"
  role_arn = aws_iam_role.config.arn

  recording_group {
    all_supported                 = true
    include_global_resource_types = true
  }
}

resource "aws_config_delivery_channel" "main" {
  name           = "maysar-${var.environment}-config-delivery"
  s3_bucket_name = aws_s3_bucket.config_logs.bucket
}

resource "aws_config_configuration_recorder_status" "main" {
  name       = aws_config_configuration_recorder.main.name
  is_enabled = true

  depends_on = [aws_config_delivery_channel.main]
}

# S3 Bucket for Config logs
resource "aws_s3_bucket" "config_logs" {
  bucket = "maysar-${var.environment}-config-logs-${random_string.config_suffix.result}"

  tags = {
    Name = "maysar-${var.environment}-config-logs"
  }
}

resource "random_string" "config_suffix" {
  length  = 8
  lower   = true
  upper   = false
  numeric = true
  special = false
}

# S3 Bucket encryption for Config logs
resource "aws_s3_bucket_server_side_encryption_configuration" "config_logs" {
  bucket = aws_s3_bucket.config_logs.id

  rule {
    apply_server_side_encryption_by_default {
      kms_master_key_id = var.kms_key_arn
      sse_algorithm     = "aws:kms"
    }
    bucket_key_enabled = true
  }
}

# IAM Role for AWS Config
resource "aws_iam_role" "config" {
  name = "maysar-${var.environment}-config-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "config.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "config" {
  role       = aws_iam_role.config.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSConfigRole"
}

# AWS Config Rules for security compliance
resource "aws_config_config_rule" "s3_bucket_versioning" {
  name = "s3-bucket-versioning-enabled"

  source {
    owner             = "AWS"
    source_identifier = "S3_BUCKET_VERSIONING_ENABLED"
  }

  depends_on = [aws_config_configuration_recorder.main]
}

resource "aws_config_config_rule" "s3_bucket_encryption" {
  name = "s3-bucket-server-side-encryption-enabled"

  source {
    owner             = "AWS"
    source_identifier = "S3_BUCKET_SERVER_SIDE_ENCRYPTION_ENABLED"
  }

  depends_on = [aws_config_configuration_recorder.main]
}

resource "aws_config_config_rule" "rds_encryption" {
  name = "rds-storage-encrypted"

  source {
    owner             = "AWS"
    source_identifier = "RDS_STORAGE_ENCRYPTED"
  }

  depends_on = [aws_config_configuration_recorder.main]
}

resource "aws_config_config_rule" "iam_password_policy" {
  name = "iam-password-policy"

  source {
    owner             = "AWS"
    source_identifier = "IAM_PASSWORD_POLICY"
  }

  input_parameters = jsonencode({
    RequireUppercaseCharacters   = "true"
    RequireLowercaseCharacters   = "true"
    RequireSymbols              = "true"
    RequireNumbers              = "true"
    MinimumPasswordLength       = "12"
    PasswordReusePrevention     = "24"
    MaxPasswordAge              = "90"
  })

  depends_on = [aws_config_configuration_recorder.main]
}

# AWS Shield Advanced for DDoS protection
resource "aws_shield_protection" "alb" {
  count = var.enable_shield ? 1 : 0

  name         = "maysar-${var.environment}-alb-protection"
  resource_arn = var.alb_arn

  tags = {
    Name = "maysar-${var.environment}-shield-protection"
  }
}

# AWS WAF v2 Web ACL for CloudFront (API Gateway)
resource "aws_wafv2_web_acl" "cloudfront" {
  count = var.enable_waf ? 1 : 0

  name        = "maysar-${var.environment}-cloudfront-waf"
  description = "WAF for Maysar CloudFront distribution"
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

  rule {
    name     = "AWSManagedRulesKnownBadInputsRuleSet"
    priority = 2

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesKnownBadInputsRuleSet"
        vendor_name = "AWS"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name               = "AWSManagedRulesKnownBadInputsRuleSet"
      sampled_requests_enabled  = true
    }
  }

  rule {
    name     = "AWSManagedRulesSQLiRuleSet"
    priority = 3

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesSQLiRuleSet"
        vendor_name = "AWS"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name               = "AWSManagedRulesSQLiRuleSet"
      sampled_requests_enabled  = true
    }
  }

  rule {
    name     = "RateLimit"
    priority = 4

    action {
      block {}
    }

    statement {
      rate_based_statement {
        limit              = var.waf_rate_limit
        aggregate_key_type = "IP"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name               = "RateLimit"
      sampled_requests_enabled  = true
    }
  }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name               = "CloudFrontWAF"
    sampled_requests_enabled  = true
  }
}

# AWS GuardDuty for threat detection
resource "aws_guardduty_detector" "main" {
  count = var.enable_guardduty ? 1 : 0

  enable = true

  datasources {
    s3_logs {
      enable = true
    }
    kubernetes {
      audit_logs {
        enable = true
      }
    }
    malware_protection {
      scan_ec2_instance_with_findings {
        ebs_volumes {
          enable = true
        }
      }
    }
  }

  tags = {
    Name = "maysar-${var.environment}-guardduty"
  }
}

# AWS Security Hub for centralized security findings
resource "aws_securityhub_account" "main" {
  count = var.enable_security_hub ? 1 : 0
}

# Enable Security Hub standards
resource "aws_securityhub_standards_subscription" "cis" {
  count = var.enable_security_hub ? 1 : 0

  standards_arn = "arn:aws:securityhub:us-east-1::standards/cis-aws-foundations-benchmark/v/1.4.0"
  depends_on    = [aws_securityhub_account.main]
}

resource "aws_securityhub_standards_subscription" "pci_dss" {
  count = var.enable_security_hub ? 1 : 0

  standards_arn = "arn:aws:securityhub:us-east-1::standards/pci-dss/v/3.2.1"
  depends_on    = [aws_securityhub_account.main]
}

# AWS Systems Manager Session Manager for secure admin access
resource "aws_ssm_document" "session_manager_prefs" {
  name            = "SSM-SessionManagerRunShell"
  document_type   = "Session"
  document_format = "JSON"

  content = jsonencode({
    schemaVersion = "1.0"
    description   = "Document to hold regional settings for Session Manager"
    sessionType   = "Standard_Stream"
    inputs = {
      s3BucketName                = aws_s3_bucket.session_logs.bucket
      s3KeyPrefix                 = "session-logs/"
      s3EncryptionEnabled         = true
      cloudWatchLogGroupName      = aws_cloudwatch_log_group.session_logs.name
      cloudWatchEncryptionEnabled = true
    }
  })
}

# S3 Bucket for Session Manager logs
resource "aws_s3_bucket" "session_logs" {
  bucket = "maysar-${var.environment}-session-logs-${random_string.session_suffix.result}"

  tags = {
    Name = "maysar-${var.environment}-session-logs"
  }
}

resource "random_string" "session_suffix" {
  length  = 8
  lower   = true
  upper   = false
  numeric = true
  special = false
}

# S3 Bucket encryption for Session Manager logs
resource "aws_s3_bucket_server_side_encryption_configuration" "session_logs" {
  bucket = aws_s3_bucket.session_logs.id

  rule {
    apply_server_side_encryption_by_default {
      kms_master_key_id = var.kms_key_arn
      sse_algorithm     = "aws:kms"
    }
    bucket_key_enabled = true
  }
}

# CloudWatch Log Group for Session Manager
resource "aws_cloudwatch_log_group" "session_logs" {
  name              = "/aws/ssm/session-logs/maysar-${var.environment}"
  retention_in_days = 90

  tags = {
    Name = "maysar-${var.environment}-session-logs"
  }
}

# CloudWatch Alarms for security monitoring
resource "aws_cloudwatch_metric_alarm" "unauthorized_api_calls" {
  alarm_name          = "maysar-${var.environment}-unauthorized-api-calls"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "1"
  metric_name         = "UnauthorizedAttemptCount"
  namespace           = "AWS/S3"
  period              = "300"
  statistic           = "Sum"
  threshold           = "10"
  alarm_description   = "This metric monitors unauthorized API calls"
  alarm_actions       = [aws_sns_topic.security_alerts.arn]

  dimensions = {
    BucketName = aws_s3_bucket.session_logs.bucket
  }
}

# SNS Topic for security alerts
resource "aws_sns_topic" "security_alerts" {
  name = "maysar-${var.environment}-security-alerts"

  tags = {
    Name = "maysar-${var.environment}-security-alerts"
  }
}

# AWS Macie for sensitive data discovery
resource "aws_macie2_account" "main" {
  count = var.enable_macie ? 1 : 0

  finding_publishing_frequency = "FIFTEEN_MINUTES"
  status                      = "ENABLED"
}

# AWS Inspector for EC2 instance assessment
resource "aws_inspector2_enabler" "main" {
  count = var.enable_inspector ? 1 : 0

  account_ids    = [var.aws_account_id]
  resource_types = ["EC2", "ECR"]
}

# AWS Certificate Manager Private CA (for internal certificates)
resource "aws_acmpca_certificate_authority" "internal" {
  count = var.enable_private_ca ? 1 : 0

  type = "ROOT"

  key_algorithm     = "RSA_2048"
  signing_algorithm = "SHA256WITHRSA"

  subject {
    common_name         = "Maysar ${var.environment} Internal CA"
    country             = "TZ"
    organization        = "Maysar"
    organizational_unit = "Security"
  }

  revocation_configuration {
    crl_configuration {
      enabled = true
      s3_bucket_name = aws_s3_bucket.ca_crl[0].bucket
    }
  }

  tags = {
    Name = "maysar-${var.environment}-internal-ca"
  }
}

# S3 Bucket for CA CRL
resource "aws_s3_bucket" "ca_crl" {
  count = var.enable_private_ca ? 1 : 0

  bucket = "maysar-${var.environment}-ca-crl-${random_string.ca_suffix[0].result}"

  tags = {
    Name = "maysar-${var.environment}-ca-crl"
  }
}

resource "random_string" "ca_suffix" {
  count = var.enable_private_ca ? 1 : 0

  length  = 8
  lower   = true
  upper   = false
  numeric = true
  special = false
}
