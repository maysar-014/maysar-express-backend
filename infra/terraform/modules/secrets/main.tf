# AWS Secrets Manager + KMS Module for Maysar

# KMS Key for envelope encryption
resource "aws_kms_key" "secrets" {
  description             = "KMS key for envelope encryption of secrets"
  deletion_window_in_days = 30
  enable_key_rotation     = true

  tags = {
    Name = "maysar-${var.environment}-secrets-kms"
  }
}

resource "aws_kms_alias" "secrets" {
  name          = "alias/maysar-${var.environment}-secrets"
  target_key_id = aws_kms_key.secrets.key_id
}

# Secrets Manager secrets
resource "aws_secretsmanager_secret" "database_credentials" {
  name                    = "maysar/${var.environment}/database"
  description             = "Database credentials for Maysar services"
  kms_key_id              = aws_kms_key.secrets.id
  recovery_window_in_days = 30

  tags = {
    Name        = "maysar-${var.environment}-database-secrets"
    Environment = var.environment
  }
}

resource "aws_secretsmanager_secret" "jwt_secrets" {
  name                    = "maysar/${var.environment}/jwt"
  description             = "JWT secrets for Maysar authentication"
  kms_key_id              = aws_kms_key.secrets.id
  recovery_window_in_days = 30

  tags = {
    Name        = "maysar-${var.environment}-jwt-secrets"
    Environment = var.environment
  }
}

resource "aws_secretsmanager_secret" "payment_credentials" {
  name                    = "maysar/${var.environment}/payment"
  description             = "Payment gateway credentials"
  kms_key_id              = aws_kms_key.secrets.id
  recovery_window_in_days = 30

  tags = {
    Name        = "maysar-${var.environment}-payment-secrets"
    Environment = var.environment
  }
}

resource "aws_secretsmanager_secret" "external_services" {
  name                    = "maysar/${var.environment}/external"
  description             = "External service credentials (SMS, email, etc.)"
  kms_key_id              = aws_kms_key.secrets.id
  recovery_window_in_days = 30

  tags = {
    Name        = "maysar-${var.environment}-external-secrets"
    Environment = var.environment
  }
}

# Secret versions with initial values (to be updated via CI/CD)
resource "aws_secretsmanager_secret_version" "database_credentials" {
  secret_id = aws_secretsmanager_secret.database_credentials.id
  secret_string = jsonencode({
    auth_db_url     = "placeholder"
    order_db_url    = "placeholder"
    payment_db_url  = "placeholder"
    analytics_db_url = "placeholder"
  })
}

resource "aws_secretsmanager_secret_version" "jwt_secrets" {
  secret_id = aws_secretsmanager_secret.jwt_secrets.id
  secret_string = jsonencode({
    jwt_secret         = "placeholder-change-in-production"
    jwt_refresh_secret = "placeholder-change-in-production"
    admin_jwt_secret   = "placeholder-change-in-production"
  })
}

resource "aws_secretsmanager_secret_version" "payment_credentials" {
  secret_id = aws_secretsmanager_secret.payment_credentials.id
  secret_string = jsonencode({
    pesapal_consumer_key    = "placeholder"
    pesapal_consumer_secret = "placeholder"
    stripe_publishable_key  = "placeholder"
    stripe_secret_key       = "placeholder"
  })
}

resource "aws_secretsmanager_secret_version" "external_services" {
  secret_id = aws_secretsmanager_secret.external_services.id
  secret_string = jsonencode({
    smtp_username = "placeholder"
    smtp_password = "placeholder"
    sms_api_key   = "placeholder"
    cdn_secret    = "placeholder"
  })
}

# IAM Policy for accessing secrets
resource "aws_iam_policy" "secrets_access" {
  name        = "maysar-${var.environment}-secrets-access"
  description = "IAM policy for accessing Maysar secrets"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue",
          "secretsmanager:DescribeSecret"
        ]
        Resource = [
          aws_secretsmanager_secret.database_credentials.arn,
          aws_secretsmanager_secret.jwt_secrets.arn,
          aws_secretsmanager_secret.payment_credentials.arn,
          aws_secretsmanager_secret.external_services.arn
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "kms:Decrypt",
          "kms:DescribeKey"
        ]
        Resource = aws_kms_key.secrets.arn
      }
    ]
  })
}

# Certificate Authority for mTLS
resource "aws_acm_certificate" "ca" {
  private_key      = tls_private_key.ca.private_key_pem
  certificate_body = tls_self_signed_cert.ca.cert_pem

  tags = {
    Name = "maysar-${var.environment}-ca"
  }

  lifecycle {
    create_before_destroy = true
  }
}

# Private key for Certificate Authority
resource "tls_private_key" "ca" {
  algorithm = "RSA"
  rsa_bits  = 4096
}

# Self-signed CA certificate
resource "tls_self_signed_cert" "ca" {
  private_key_pem = tls_private_key.ca.private_key_pem

  subject {
    common_name  = "Maysar ${var.environment} CA"
    organization = "Maysar"
  }

  validity_period_hours = 87600 # 10 years

  allowed_uses = [
    "cert_signing",
    "crl_signing"
  ]

  is_ca_certificate = true
}

# Store CA certificate in Secrets Manager
resource "aws_secretsmanager_secret" "ca_certificate" {
  name                    = "maysar/${var.environment}/ca"
  description             = "Certificate Authority certificate and key"
  kms_key_id              = aws_kms_key.secrets.id
  recovery_window_in_days = 30

  tags = {
    Name        = "maysar-${var.environment}-ca-secrets"
    Environment = var.environment
  }
}

resource "aws_secretsmanager_secret_version" "ca_certificate" {
  secret_id = aws_secretsmanager_secret.ca_certificate.id
  secret_string = jsonencode({
    ca_certificate = tls_self_signed_cert.ca.cert_pem
    ca_private_key = tls_private_key.ca.private_key_pem
  })
}
