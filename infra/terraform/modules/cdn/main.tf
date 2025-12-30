# S3 + CloudFront CDN Module with Signed URLs for Maysar

# S3 Bucket for media storage
resource "aws_s3_bucket" "media" {
  bucket = "maysar-${var.environment}-media"

  tags = {
    Name = "maysar-${var.environment}-media"
  }
}

# S3 Bucket versioning
resource "aws_s3_bucket_versioning" "media" {
  bucket = aws_s3_bucket.media.id
  versioning_configuration {
    status = "Enabled"
  }
}

# S3 Bucket server-side encryption
resource "aws_s3_bucket_server_side_encryption_configuration" "media" {
  bucket = aws_s3_bucket.media.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
    bucket_key_enabled = true
  }
}

# S3 Bucket public access block (for security)
resource "aws_s3_bucket_public_access_block" "media" {
  bucket = aws_s3_bucket.media.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# CloudFront Origin Access Identity
resource "aws_cloudfront_origin_access_identity" "media" {
  comment = "OAI for Maysar ${var.environment} media bucket"
}

# S3 Bucket policy for CloudFront access
resource "aws_s3_bucket_policy" "media" {
  bucket = aws_s3_bucket.media.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "AllowCloudFrontAccess"
        Effect    = "Allow"
        Principal = {
          AWS = aws_cloudfront_origin_access_identity.media.iam_arn
        }
        Action   = "s3:GetObject"
        Resource = "${aws_s3_bucket.media.arn}/*"
      }
    ]
  })
}

# CloudFront Distribution
resource "aws_cloudfront_distribution" "media" {
  origin {
    domain_name = aws_s3_bucket.media.bucket_regional_domain_name
    origin_id   = "maysar-${var.environment}-media"

    s3_origin_config {
      origin_access_identity = aws_cloudfront_origin_access_identity.media.cloudfront_access_identity_path
    }
  }

  enabled             = true
  is_ipv6_enabled     = true
  default_root_object = ""
  comment             = "Maysar ${var.environment} Media CDN"

  # Custom domain configuration
  aliases = var.domain_name != "" ? ["media.${var.domain_name}"] : []

  # Default cache behavior
  default_cache_behavior {
    allowed_methods  = ["GET", "HEAD", "OPTIONS"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "maysar-${var.environment}-media"

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 86400  # 24 hours
    max_ttl                = 31536000 # 1 year

    # Enable signed URLs
    trusted_signers = [var.aws_account_id]
  }

  # Price class (optimize costs)
  price_class = "PriceClass_100" # Use only US, Canada, Europe

  # Enable IPv6
  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  # SSL/TLS configuration
  viewer_certificate {
    cloudfront_default_certificate = var.domain_name == "" ? true : false

    acm_certificate_arn      = var.domain_name != "" ? aws_acm_certificate.media[0].arn : null
    ssl_support_method       = var.domain_name != "" ? "sni-only" : null
    minimum_protocol_version = var.domain_name != "" ? "TLSv1.2_2021" : null
  }

  # Custom error pages
  custom_error_response {
    error_code         = 403
    response_code      = 403
    response_page_path = "/403.html"
    error_caching_min_ttl = 300
  }

  custom_error_response {
    error_code         = 404
    response_code      = 404
    response_page_path = "/404.html"
    error_caching_min_ttl = 300
  }

  # WAF integration (optional)
  web_acl_id = var.enable_waf ? aws_wafv2_web_acl.media[0].id : null

  tags = {
    Name = "maysar-${var.environment}-media-cdn"
  }
}

# ACM Certificate for custom domain (conditional)
resource "aws_acm_certificate" "media" {
  count = var.domain_name != "" ? 1 : 0

  domain_name       = "media.${var.domain_name}"
  validation_method = "DNS"

  subject_alternative_names = [
    "*.media.${var.domain_name}"
  ]

  tags = {
    Name = "maysar-${var.environment}-media-cert"
  }

  lifecycle {
    create_before_destroy = true
  }
}

# WAF Web ACL for media CDN (optional)
resource "aws_wafv2_web_acl" "media" {
  count = var.enable_waf ? 1 : 0

  name        = "maysar-${var.environment}-media-waf"
  description = "WAF for Maysar media CDN"
  scope       = "CLOUDFRONT"

  default_action {
    allow {}
  }

  # Rate limiting rule
  rule {
    name     = "RateLimit"
    priority = 1

    action {
      block {}
    }

    statement {
      rate_based_statement {
        limit              = 10000 # requests per 5 minutes
        aggregate_key_type = "IP"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name               = "RateLimit"
      sampled_requests_enabled  = true
    }
  }

  # IP reputation rule
  rule {
    name     = "AWSManagedRulesAmazonIpReputationList"
    priority = 2

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesAmazonIpReputationList"
        vendor_name = "AWS"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name               = "AWSManagedRulesAmazonIpReputationList"
      sampled_requests_enabled  = true
    }
  }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name               = "MediaWAF"
    sampled_requests_enabled  = true
  }
}

# CloudWatch Alarms for CDN monitoring
resource "aws_cloudwatch_metric_alarm" "cdn_5xx_errors" {
  alarm_name          = "maysar-${var.environment}-cdn-5xx-errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "5xxErrorRate"
  namespace           = "AWS/CloudFront"
  period              = "300"
  statistic           = "Average"
  threshold           = "5"
  alarm_description   = "This metric monitors 5xx error rate for media CDN"
  alarm_actions       = [] # Add SNS topic ARN for notifications

  dimensions = {
    DistributionId = aws_cloudfront_distribution.media.id
    Region         = "Global"
  }
}

# IAM Policy for generating signed URLs
resource "aws_iam_policy" "cdn_signed_urls" {
  name        = "maysar-${var.environment}-cdn-signed-urls"
  description = "IAM policy for generating CloudFront signed URLs"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "cloudfront:GetDistribution",
          "cloudfront:CreateInvalidation"
        ]
        Resource = aws_cloudfront_distribution.media.arn
      }
    ]
  })
}

# Lambda@Edge function for URL signing (optional advanced setup)
resource "aws_lambda_function" "url_signer" {
  count = var.enable_url_signing ? 1 : 0

  filename         = data.archive_file.url_signer[0].output_path
  function_name    = "maysar-${var.environment}-url-signer"
  role            = aws_iam_role.url_signer[0].iam_arn
  handler         = "index.handler"
  runtime         = "nodejs18.x"
  publish         = true

  # Environment variables for signing
  environment {
    variables = {
      CLOUDFRONT_DISTRIBUTION_ID = aws_cloudfront_distribution.media.id
      PRIVATE_KEY_ID            = aws_cloudfront_public_key.url_signing[0].id
    }
  }
}

# CloudFront Public Key for signed URLs
resource "aws_cloudfront_public_key" "url_signing" {
  count = var.enable_url_signing ? 1 : 0

  name        = "maysar-${var.environment}-url-signing-key"
  encoded_key = tls_private_key.url_signing[0].public_key_pem
}

# Private key for URL signing
resource "tls_private_key" "url_signing" {
  count = var.enable_url_signing ? 1 : 0

  algorithm = "RSA"
  rsa_bits  = 2048
}

# IAM Role for Lambda@Edge
resource "aws_iam_role" "url_signer" {
  count = var.enable_url_signing ? 1 : 0

  name = "maysar-${var.environment}-url-signer-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = [
            "lambda.amazonaws.com",
            "edgelambda.amazonaws.com"
          ]
        }
      }
    ]
  })
}

# Archive file for Lambda (placeholder)
data "archive_file" "url_signer" {
  count = var.enable_url_signing ? 1 : 0

  type        = "zip"
  output_path = "/tmp/url-signer.zip"

  source {
    content  = <<EOF
exports.handler = async (event) => {
  // URL signing logic would go here
  return {
    statusCode: 200,
    body: JSON.stringify({ message: 'URL signing endpoint' })
  };
};
EOF
    filename = "index.js"
  }
}

# Route 53 record for custom domain (conditional)
resource "aws_route53_record" "media" {
  count = var.domain_name != "" ? 1 : 0

  zone_id = data.aws_route53_zone.main[0].zone_id
  name    = "media.${var.domain_name}"
  type    = "CNAME"
  ttl     = 300
  records = [aws_cloudfront_distribution.media.domain_name]
}

# Data source for Route 53 zone
data "aws_route53_zone" "main" {
  count = var.domain_name != "" ? 1 : 0

  name = var.domain_name
}
