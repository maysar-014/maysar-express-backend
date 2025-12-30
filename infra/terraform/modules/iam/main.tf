# IAM Module for Maysar Infrastructure

# IAM Role for EKS Service Accounts (IRSA)
resource "aws_iam_role" "eks_service_account" {
  for_each = var.service_accounts

  name = "maysar-${var.environment}-${each.key}-sa-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Federated = var.eks_oidc_provider_arn
        }
        Action = "sts:AssumeRoleWithWebIdentity"
        Condition = {
          StringEquals = {
            "${replace(var.eks_oidc_provider_arn, "/^(.*provider/)/", "")}:sub": "system:serviceaccount:${each.value.namespace}:${each.key}"
          }
        }
      }
    ]
  })

  tags = {
    Name = "maysar-${var.environment}-${each.key}-sa-role"
  }
}

# Attach policies to service account roles
resource "aws_iam_role_policy_attachment" "eks_service_account_policies" {
  for_each = local.service_account_policy_attachments

  role       = aws_iam_role.eks_service_account[each.value.service_account].name
  policy_arn = each.value.policy_arn

  depends_on = [aws_iam_role.eks_service_account]
}

# IAM Role for API Gateway
resource "aws_iam_role" "api_gateway" {
  name = "maysar-${var.environment}-api-gateway-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "apigateway.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "api_gateway_cloudwatch" {
  role       = aws_iam_role.api_gateway.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonAPIGatewayPushToCloudWatchLogs"
}

# IAM Role for CloudWatch Events/EventBridge
resource "aws_iam_role" "eventbridge" {
  name = "maysar-${var.environment}-eventbridge-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "events.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "eventbridge_kinesis" {
  role       = aws_iam_role.eventbridge.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonKinesisFullAccess"
}

# IAM Role for Lambda functions
resource "aws_iam_role" "lambda" {
  name = "maysar-${var.environment}-lambda-role"

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

resource "aws_iam_role_policy_attachment" "lambda_basic" {
  role       = aws_iam_role.lambda.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy_attachment" "lambda_vpc" {
  role       = aws_iam_role.lambda.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole"
}

# IAM Role for CodeBuild
resource "aws_iam_role" "codebuild" {
  name = "maysar-${var.environment}-codebuild-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "codebuild.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "codebuild" {
  role       = aws_iam_role.codebuild.name
  policy_arn = "arn:aws:iam::aws:policy/AWSCodeBuildAdminAccess"
}

# IAM Role for CodePipeline
resource "aws_iam_role" "codepipeline" {
  name = "maysar-${var.environment}-codepipeline-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "codepipeline.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "codepipeline" {
  role       = aws_iam_role.codepipeline.name
  policy_arn = "arn:aws:iam::aws:policy/AWSCodePipeline_FullAccess"
}

# IAM Role for ECS Tasks
resource "aws_iam_role" "ecs_task_execution" {
  name = "maysar-${var.environment}-ecs-task-execution-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "ecs_task_execution" {
  role       = aws_iam_role.ecs_task_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

resource "aws_iam_role" "ecs_task" {
  name = "maysar-${var.environment}-ecs-task-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
      }
    ]
  })
}

# Custom IAM Policies for Service-Specific Access

# Auth Service Policy
resource "aws_iam_policy" "auth_service" {
  name        = "maysar-${var.environment}-auth-service-policy"
  description = "IAM policy for auth service"

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
          "arn:aws:secretsmanager:${var.aws_region}:${var.aws_account_id}:secret:maysar/${var.environment}/jwt-*",
          "arn:aws:secretsmanager:${var.aws_region}:${var.aws_account_id}:secret:maysar/${var.environment}/database-*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "kms:Decrypt",
          "kms:DescribeKey"
        ]
        Resource = "arn:aws:kms:${var.aws_region}:${var.aws_account_id}:key/*"
      },
      {
        Effect = "Allow"
        Action = [
          "rds:DescribeDBClusters",
          "rds:DescribeDBInstances"
        ]
        Resource = "arn:aws:rds:${var.aws_region}:${var.aws_account_id}:cluster:maysar-${var.environment}-cluster"
      }
    ]
  })
}

# Payment Service Policy
resource "aws_iam_policy" "payment_service" {
  name        = "maysar-${var.environment}-payment-service-policy"
  description = "IAM policy for payment service"

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
          "arn:aws:secretsmanager:${var.aws_region}:${var.aws_account_id}:secret:maysar/${var.environment}/payment-*",
          "arn:aws:secretsmanager:${var.aws_region}:${var.aws_account_id}:secret:maysar/${var.environment}/database-*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "kms:Decrypt",
          "kms:DescribeKey",
          "kms:GenerateDataKey",
          "kms:Encrypt"
        ]
        Resource = "arn:aws:kms:${var.aws_region}:${var.aws_account_id}:key/*"
      },
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject"
        ]
        Resource = "arn:aws:s3:::maysar-${var.environment}-media/*"
      },
      {
        Effect = "Allow"
        Action = [
          "cloudfront:CreateInvalidation"
        ]
        Resource = "arn:aws:cloudfront::${var.aws_account_id}:distribution/*"
      }
    ]
  })
}

# Admin Service Policy
resource "aws_iam_policy" "admin_service" {
  name        = "maysar-${var.environment}-admin-service-policy"
  description = "IAM policy for admin service"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue",
          "secretsmanager:DescribeSecret"
        ]
        Resource = "arn:aws:secretsmanager:${var.aws_region}:${var.aws_account_id}:secret:maysar/${var.environment}/*"
      },
      {
        Effect = "Allow"
        Action = [
          "rds:DescribeDBClusters",
          "rds:DescribeDBInstances",
          "rds:DescribeDBSnapshots",
          "rds:CreateDBSnapshot",
          "rds:RestoreDBClusterFromSnapshot"
        ]
        Resource = "arn:aws:rds:${var.aws_region}:${var.aws_account_id}:cluster:maysar-${var.environment}-cluster"
      },
      {
        Effect = "Allow"
        Action = [
          "elasticache:DescribeReplicationGroups",
          "elasticache:DescribeCacheClusters"
        ]
        Resource = "arn:aws:elasticache:${var.aws_region}:${var.aws_account_id}:replicationgroup:maysar-${var.environment}-*"
      },
      {
        Effect = "Allow"
        Action = [
          "kafka:*"
        ]
        Resource = "arn:aws:kafka:${var.aws_region}:${var.aws_account_id}:cluster/maysar-${var.environment}/*"
      },
      {
        Effect = "Allow"
        Action = [
          "cloudwatch:GetMetricStatistics",
          "cloudwatch:ListMetrics",
          "cloudwatch:DescribeAlarms"
        ]
        Resource = "*"
      }
    ]
  })
}

# Analytics Service Policy
resource "aws_iam_policy" "analytics_service" {
  name        = "maysar-${var.environment}-analytics-service-policy"
  description = "IAM policy for analytics service"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject",
          "s3:ListBucket"
        ]
        Resource = [
          "arn:aws:s3:::maysar-${var.environment}-analytics-*",
          "arn:aws:s3:::maysar-${var.environment}-analytics-*/*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "athena:StartQueryExecution",
          "athena:GetQueryExecution",
          "athena:GetQueryResults"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "glue:GetDatabase",
          "glue:GetTable",
          "glue:GetPartitions"
        ]
        Resource = "*"
      }
    ]
  })
}

# CDN Service Policy
resource "aws_iam_policy" "cdn_service" {
  name        = "maysar-${var.environment}-cdn-service-policy"
  description = "IAM policy for CDN service"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject",
          "s3:ListBucket"
        ]
        Resource = [
          "arn:aws:s3:::maysar-${var.environment}-media",
          "arn:aws:s3:::maysar-${var.environment}-media/*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "cloudfront:CreateInvalidation",
          "cloudfront:GetDistribution",
          "cloudfront:ListDistributions"
        ]
        Resource = "arn:aws:cloudfront::${var.aws_account_id}:distribution/*"
      }
    ]
  })
}

# Attach service-specific policies to service account roles
resource "aws_iam_role_policy_attachment" "auth_service_policy" {
  role       = aws_iam_role.eks_service_account["auth-service"].name
  policy_arn = aws_iam_policy.auth_service.arn

  depends_on = [aws_iam_role.eks_service_account, aws_iam_policy.auth_service]
}

resource "aws_iam_role_policy_attachment" "payment_service_policy" {
  role       = aws_iam_role.eks_service_account["payment-service"].name
  policy_arn = aws_iam_policy.payment_service.arn

  depends_on = [aws_iam_role.eks_service_account, aws_iam_policy.payment_service]
}

resource "aws_iam_role_policy_attachment" "admin_service_policy" {
  role       = aws_iam_role.eks_service_account["admin-service"].name
  policy_arn = aws_iam_policy.admin_service.arn

  depends_on = [aws_iam_role.eks_service_account, aws_iam_policy.admin_service]
}

resource "aws_iam_role_policy_attachment" "analytics_service_policy" {
  role       = aws_iam_role.eks_service_account["analytics-service"].name
  policy_arn = aws_iam_policy.analytics_service.arn

  depends_on = [aws_iam_role.eks_service_account, aws_iam_policy.analytics_service]
}

resource "aws_iam_role_policy_attachment" "cdn_service_policy" {
  role       = aws_iam_role.eks_service_account["cdn-service"].name
  policy_arn = aws_iam_policy.cdn_service.arn

  depends_on = [aws_iam_role.eks_service_account, aws_iam_policy.cdn_service]
}

# Local values for policy attachments
locals {
  service_account_policy_attachments = flatten([
    for sa_key, sa_config in var.service_accounts : [
      for policy_arn in sa_config.additional_policies : {
        service_account = sa_key
        policy_arn      = policy_arn
      }
    ]
  ])
}
