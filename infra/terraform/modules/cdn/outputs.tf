output "cdn_domain" {
  description = "CloudFront distribution domain name"
  value       = aws_cloudfront_distribution.media.domain_name
}

output "cdn_distribution_id" {
  description = "CloudFront distribution ID"
  value       = aws_cloudfront_distribution.media.id
}

output "s3_bucket_name" {
  description = "S3 bucket name for media storage"
  value       = aws_s3_bucket.media.bucket
}

output "s3_bucket_arn" {
  description = "S3 bucket ARN"
  value       = aws_s3_bucket.media.arn
}

output "signed_urls_policy_arn" {
  description = "IAM policy ARN for generating signed URLs"
  value       = aws_iam_policy.cdn_signed_urls.arn
}

output "cdn_arn" {
  description = "CloudFront distribution ARN"
  value       = aws_cloudfront_distribution.media.arn
}

output "origin_access_identity" {
  description = "CloudFront origin access identity"
  value       = aws_cloudfront_origin_access_identity.media.iam_arn
}

output "custom_domain" {
  description = "Custom domain for media CDN"
  value       = var.domain_name != "" ? "media.${var.domain_name}" : null
}
