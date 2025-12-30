output "kms_key_arn" {
  description = "KMS key ARN for secrets encryption"
  value       = aws_kms_key.secrets.arn
}

output "kms_key_id" {
  description = "KMS key ID for secrets encryption"
  value       = aws_kms_key.secrets.key_id
}

output "secrets_policy_arn" {
  description = "IAM policy ARN for accessing secrets"
  value       = aws_iam_policy.secrets_access.arn
}

output "database_secrets_arn" {
  description = "Database secrets ARN"
  value       = aws_secretsmanager_secret.database_credentials.arn
}

output "jwt_secrets_arn" {
  description = "JWT secrets ARN"
  value       = aws_secretsmanager_secret.jwt_secrets.arn
}

output "payment_secrets_arn" {
  description = "Payment secrets ARN"
  value       = aws_secretsmanager_secret.payment_credentials.arn
}

output "external_secrets_arn" {
  description = "External services secrets ARN"
  value       = aws_secretsmanager_secret.external_services.arn
}

output "ca_certificate_arn" {
  description = "CA certificate secrets ARN"
  value       = aws_secretsmanager_secret.ca_certificate.arn
}

output "ca_certificate" {
  description = "CA certificate PEM"
  value       = tls_self_signed_cert.ca.cert_pem
  sensitive   = true
}

output "ca_private_key" {
  description = "CA private key PEM"
  value       = tls_private_key.ca.private_key_pem
  sensitive   = true
}
