output "general_key_arn" {
  description = "General purpose KMS key ARN"
  value       = aws_kms_key.general.arn
}

output "general_key_id" {
  description = "General purpose KMS key ID"
  value       = aws_kms_key.general.key_id
}

output "general_key_alias" {
  description = "General purpose KMS key alias"
  value       = aws_kms_alias.general.name
}

output "audit_key_arn" {
  description = "Audit logging KMS key ARN"
  value       = aws_kms_key.audit.arn
}

output "audit_key_id" {
  description = "Audit logging KMS key ID"
  value       = aws_kms_key.audit.key_id
}

output "audit_key_alias" {
  description = "Audit logging KMS key alias"
  value       = aws_kms_alias.audit.name
}

output "backup_key_arn" {
  description = "Backup encryption KMS key ARN"
  value       = aws_kms_key.backup.arn
}

output "backup_key_id" {
  description = "Backup encryption KMS key ID"
  value       = aws_kms_key.backup.key_id
}

output "backup_key_alias" {
  description = "Backup encryption KMS key alias"
  value       = aws_kms_alias.backup.name
}

output "all_key_arns" {
  description = "Map of all KMS key ARNs"
  value = {
    general = aws_kms_key.general.arn
    audit   = aws_kms_key.audit.arn
    backup  = aws_kms_key.backup.arn
  }
}

output "all_key_ids" {
  description = "Map of all KMS key IDs"
  value = {
    general = aws_kms_key.general.key_id
    audit   = aws_kms_key.audit.key_id
    backup  = aws_kms_key.backup.key_id
  }
}

output "access_policy_arn" {
  description = "IAM policy ARN for KMS access"
  value       = aws_iam_policy.kms_access.arn
}
