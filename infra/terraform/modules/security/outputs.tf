output "vpc_flow_logs_group" {
  description = "CloudWatch log group for VPC Flow Logs"
  value       = aws_cloudwatch_log_group.vpc_flow_logs.name
}

output "security_nacl_id" {
  description = "Secure Network ACL ID"
  value       = aws_network_acl.secure.id
}

output "bastion_security_group_id" {
  description = "Bastion security group ID"
  value       = aws_security_group.bastion.id
}

output "config_recorder_name" {
  description = "AWS Config recorder name"
  value       = aws_config_configuration_recorder.main.name
}

output "config_logs_bucket" {
  description = "S3 bucket for Config logs"
  value       = aws_s3_bucket.config_logs.bucket
}

output "shield_protection_id" {
  description = "AWS Shield protection ID"
  value       = var.enable_shield ? aws_shield_protection.alb[0].id : null
}

output "waf_web_acl_arn" {
  description = "WAF Web ACL ARN"
  value       = var.enable_waf ? aws_wafv2_web_acl.cloudfront[0].arn : null
}

output "guardduty_detector_id" {
  description = "GuardDuty detector ID"
  value       = var.enable_guardduty ? aws_guardduty_detector.main[0].id : null
}

output "security_hub_account_arn" {
  description = "Security Hub account ARN"
  value       = var.enable_security_hub ? aws_securityhub_account.main[0].id : null
}

output "session_logs_bucket" {
  description = "S3 bucket for Session Manager logs"
  value       = aws_s3_bucket.session_logs.bucket
}

output "session_logs_group" {
  description = "CloudWatch log group for Session Manager logs"
  value       = aws_cloudwatch_log_group.session_logs.name
}

output "security_alerts_topic_arn" {
  description = "SNS topic ARN for security alerts"
  value       = aws_sns_topic.security_alerts.arn
}

output "private_ca_arn" {
  description = "Private CA ARN"
  value       = var.enable_private_ca ? aws_acmpca_certificate_authority.internal[0].arn : null
}
