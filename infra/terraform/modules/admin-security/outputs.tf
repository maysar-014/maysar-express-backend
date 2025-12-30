output "admin_user_arns" {
  description = "Admin user ARNs"
  value = {
    for k, v in aws_iam_user.admins : k => v.arn
  }
}

output "admin_mfa_device_arns" {
  description = "Admin MFA device ARNs"
  value = {
    for k, v in aws_iam_virtual_mfa_device.admins : k => v.arn
  }
}

output "admin_base_policy_arn" {
  description = "Admin base policy ARN"
  value       = aws_iam_policy.admin_base.arn
}

output "admin_financial_policy_arn" {
  description = "Admin financial policy ARN"
  value       = aws_iam_policy.admin_financial.arn
}

output "admin_compliance_policy_arn" {
  description = "Admin compliance policy ARN"
  value       = aws_iam_policy.admin_compliance.arn
}

output "mfa_enforcement_policy_arn" {
  description = "MFA enforcement policy ARN"
  value       = aws_iam_policy.mfa_enforcement.arn
}

output "admin_console_security_group_id" {
  description = "Admin console security group ID"
  value       = aws_security_group.admin_console.id
}

output "admin_console_instance_id" {
  description = "Admin console EC2 instance ID"
  value       = var.enable_admin_console ? aws_instance.admin_console[0].id : null
}

output "admin_audit_logs_bucket" {
  description = "S3 bucket for admin audit logs"
  value       = aws_s3_bucket.admin_audit_logs.bucket
}

output "financial_audit_logs_bucket" {
  description = "S3 bucket for financial audit logs"
  value       = aws_s3_bucket.financial_audit_logs.bucket
}

output "financial_approval_lambda_arn" {
  description = "Financial approval Lambda function ARN"
  value       = aws_lambda_function.financial_approval.arn
}

output "admin_security_alerts_topic_arn" {
  description = "SNS topic ARN for admin security alerts"
  value       = aws_sns_topic.admin_security_alerts.arn
}
