# CI/CD Pipeline Module for Maysar

# CodeCommit Repository
resource "aws_codecommit_repository" "maysar" {
  repository_name = "maysar-backend"
  description     = "Maysar e-commerce backend repository"

  tags = {
    Name = "maysar-backend-repo"
  }
}

# ECR Repositories
resource "aws_ecr_repository" "services" {
  for_each = toset([
    "auth-service",
    "order-service",
    "payment-service",
    "seller-service",
    "catalog-service",
    "notification-service",
    "admin-service",
    "analytics-service",
    "cdn-service"
  ])

  name                 = "maysar/${each.key}"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  encryption_configuration {
    encryption_type = "KMS"
    kms_key         = var.kms_key_arn
  }

  tags = {
    Name = "maysar-${each.key}"
  }
}

# CodeBuild Projects
resource "aws_codebuild_project" "services" {
  for_each = toset([
    "auth-service",
    "order-service",
    "payment-service",
    "seller-service",
    "catalog-service",
    "notification-service",
    "admin-service",
    "analytics-service",
    "cdn-service"
  ])

  name          = "maysar-${each.key}-build"
  description   = "Build project for ${each.key}"
  build_timeout = "10"
  service_role  = aws_iam_role.codebuild.arn

  artifacts {
    type = "NO_ARTIFACTS"
  }

  cache {
    type  = "LOCAL"
    modes = ["LOCAL_DOCKER_LAYER_CACHE", "LOCAL_SOURCE_CACHE"]
  }

  environment {
    compute_type                = "BUILD_GENERAL1_SMALL"
    image                       = "aws/codebuild/amazonlinux2-x86_64-standard:3.0"
    type                        = "LINUX_CONTAINER"
    image_pull_credentials_type = "CODEBUILD"
    privileged_mode             = true

    environment_variable {
      name  = "SERVICE_NAME"
      value = each.key
    }

    environment_variable {
      name  = "AWS_REGION"
      value = var.aws_region
    }

    environment_variable {
      name  = "ECR_REPOSITORY_URI"
      value = aws_ecr_repository.services[each.key].repository_url
    }
  }

  source {
    type      = "CODECOMMIT"
    location  = aws_codecommit_repository.maysar.clone_url_http
    buildspec = "services/${each.key}/buildspec.yml"
  }

  logs_config {
    cloudwatch_logs {
      group_name  = "/aws/codebuild/maysar-${each.key}"
      stream_name = "build-log"
    }
  }

  tags = {
    Name = "maysar-${each.key}-build"
  }
}

# CodePipeline for each service
resource "aws_codepipeline" "services" {
  for_each = toset([
    "auth-service",
    "order-service",
    "payment-service",
    "seller-service",
    "catalog-service",
    "notification-service",
    "admin-service",
    "analytics-service",
    "cdn-service"
  ])

  name     = "maysar-${each.key}-pipeline"
  role_arn = aws_iam_role.codepipeline.arn

  artifact_store {
    location = aws_s3_bucket.pipeline_artifacts.bucket
    type     = "S3"

    encryption_key {
      id   = var.kms_key_arn
      type = "KMS"
    }
  }

  stage {
    name = "Source"

    action {
      name             = "Source"
      category         = "Source"
      owner            = "AWS"
      provider         = "CodeCommit"
      version          = "1"
      output_artifacts = ["source_output"]

      configuration = {
        RepositoryName       = aws_codecommit_repository.maysar.repository_name
        BranchName          = "main"
        PollForSourceChanges = "false"
      }
    }
  }

  stage {
    name = "Build"

    action {
      name             = "Build"
      category         = "Build"
      owner            = "AWS"
      provider         = "CodeBuild"
      input_artifacts  = ["source_output"]
      output_artifacts = ["build_output"]
      version          = "1"

      configuration = {
        ProjectName = aws_codebuild_project.services[each.key].name
      }
    }
  }

  stage {
    name = "Test"

    action {
      name            = "Test"
      category        = "Test"
      owner           = "AWS"
      provider        = "CodeBuild"
      input_artifacts = ["build_output"]
      version         = "1"

      configuration = {
        ProjectName = aws_codebuild_project.test[each.key].name
      }
    }
  }

  stage {
    name = "Security-Scan"

    action {
      name            = "Security-Scan"
      category        = "Test"
      owner           = "AWS"
      provider        = "CodeBuild"
      input_artifacts = ["build_output"]
      version         = "1"

      configuration = {
        ProjectName = aws_codebuild_project.security[each.key].name
      }
    }
  }

  stage {
    name = "Deploy-Staging"

    action {
      name            = "Deploy-Staging"
      category        = "Deploy"
      owner           = "AWS"
      provider        = "EKS"
      input_artifacts = ["build_output"]
      version         = "1"

      configuration = {
        ClusterName = "maysar-staging"
        ConfigFile  = "services/${each.key}/k8s/staging/deployment.yaml"
      }
    }
  }

  stage {
    name = "Integration-Test"

    action {
      name            = "Integration-Test"
      category        = "Test"
      owner           = "AWS"
      provider        = "CodeBuild"
      input_artifacts = ["build_output"]
      version         = "1"

      configuration = {
        ProjectName = aws_codebuild_project.integration[each.key].name
      }
    }
  }

  stage {
    name = "Approval"

    action {
      name     = "Manual-Approval"
      category = "Approval"
      owner    = "AWS"
      provider = "Manual"
      version  = "1"

      configuration = {
        CustomData = "🚀 Approve deployment to production for ${each.key}\n\n✅ All tests passed\n✅ Security scan completed\n✅ Integration tests successful\n\n📊 View metrics: https://grafana.${var.domain_name}/d/maysar-service-health"
        ExternalEntityLink = "https://grafana.${var.domain_name}/d/maysar-service-health"
      }
    }
  }

  stage {
    name = "Deploy-Production"

    action {
      name            = "Deploy-Production"
      category        = "Deploy"
      owner           = "AWS"
      provider        = "EKS"
      input_artifacts = ["build_output"]
      version         = "1"

      configuration = {
        ClusterName = "maysar-production"
        ConfigFile  = "services/${each.key}/k8s/production/deployment.yaml"
      }
    }
  }

  tags = {
    Name = "maysar-${each.key}-pipeline"
  }
}

# Test CodeBuild Projects
resource "aws_codebuild_project" "test" {
  for_each = toset([
    "auth-service",
    "order-service",
    "payment-service",
    "seller-service",
    "catalog-service",
    "notification-service",
    "admin-service",
    "analytics-service",
    "cdn-service"
  ])

  name          = "maysar-${each.key}-test"
  description   = "Test project for ${each.key}"
  build_timeout = "15"
  service_role  = aws_iam_role.codebuild.arn

  artifacts {
    type = "NO_ARTIFACTS"
  }

  environment {
    compute_type                = "BUILD_GENERAL1_SMALL"
    image                       = "aws/codebuild/amazonlinux2-x86_64-standard:3.0"
    type                        = "LINUX_CONTAINER"
    image_pull_credentials_type = "CODEBUILD"

    environment_variable {
      name  = "SERVICE_NAME"
      value = each.key
    }

    environment_variable {
      name  = "TEST_ENV"
      value = "ci"
    }
  }

  source {
    type      = "CODECOMMIT"
    location  = aws_codecommit_repository.maysar.clone_url_http
    buildspec = "services/${each.key}/buildspec-test.yml"
  }

  tags = {
    Name = "maysar-${each.key}-test"
  }
}

# Security Scan CodeBuild Projects
resource "aws_codebuild_project" "security" {
  for_each = toset([
    "auth-service",
    "order-service",
    "payment-service",
    "seller-service",
    "catalog-service",
    "notification-service",
    "admin-service",
    "analytics-service",
    "cdn-service"
  ])

  name          = "maysar-${each.key}-security"
  description   = "Security scan project for ${each.key}"
  build_timeout = "20"
  service_role  = aws_iam_role.codebuild.arn

  artifacts {
    type = "NO_ARTIFACTS"
  }

  environment {
    compute_type                = "BUILD_GENERAL1_SMALL"
    image                       = "aws/codebuild/amazonlinux2-x86_64-standard:3.0"
    type                        = "LINUX_CONTAINER"
    image_pull_credentials_type = "CODEBUILD"
    privileged_mode             = true

    environment_variable {
      name  = "SERVICE_NAME"
      value = each.key
    }
  }

  source {
    type      = "CODECOMMIT"
    location  = aws_codecommit_repository.maysar.clone_url_http
    buildspec = "services/${each.key}/buildspec-security.yml"
  }

  tags = {
    Name = "maysar-${each.key}-security"
  }
}

# Integration Test CodeBuild Projects
resource "aws_codebuild_project" "integration" {
  for_each = toset([
    "auth-service",
    "order-service",
    "payment-service",
    "seller-service",
    "catalog-service",
    "notification-service",
    "admin-service",
    "analytics-service",
    "cdn-service"
  ])

  name          = "maysar-${each.key}-integration"
  description   = "Integration test project for ${each.key}"
  build_timeout = "30"
  service_role  = aws_iam_role.codebuild.arn

  artifacts {
    type = "NO_ARTIFACTS"
  }

  environment {
    compute_type                = "BUILD_GENERAL1_MEDIUM"
    image                       = "aws/codebuild/amazonlinux2-x86_64-standard:3.0"
    type                        = "LINUX_CONTAINER"
    image_pull_credentials_type = "CODEBUILD"

    environment_variable {
      name  = "SERVICE_NAME"
      value = each.key
    }

    environment_variable {
      name  = "TEST_ENV"
      value = "staging"
    }

    environment_variable {
      name  = "STAGING_URL"
      value = "https://api.staging.${var.domain_name}"
    }
  }

  source {
    type      = "CODECOMMIT"
    location  = aws_codecommit_repository.maysar.clone_url_http
    buildspec = "services/${each.key}/buildspec-integration.yml"
  }

  tags = {
    Name = "maysar-${each.key}-integration"
  }
}

# S3 Bucket for Pipeline Artifacts
resource "aws_s3_bucket" "pipeline_artifacts" {
  bucket = "maysar-${var.environment}-pipeline-artifacts-${random_string.bucket_suffix.result}"

  tags = {
    Name = "maysar-${var.environment}-pipeline-artifacts"
  }
}

resource "random_string" "bucket_suffix" {
  length  = 8
  lower   = true
  upper   = false
  numeric = true
  special = false
}

# S3 Bucket versioning
resource "aws_s3_bucket_versioning" "pipeline_artifacts" {
  bucket = aws_s3_bucket.pipeline_artifacts.id
  versioning_configuration {
    status = "Enabled"
  }
}

# S3 Bucket encryption
resource "aws_s3_bucket_server_side_encryption_configuration" "pipeline_artifacts" {
  bucket = aws_s3_bucket.pipeline_artifacts.id

  rule {
    apply_server_side_encryption_by_default {
      kms_master_key_id = var.kms_key_arn
      sse_algorithm     = "aws:kms"
    }
    bucket_key_enabled = true
  }
}

# S3 Bucket lifecycle
resource "aws_s3_bucket_lifecycle_configuration" "pipeline_artifacts" {
  bucket = aws_s3_bucket.pipeline_artifacts.id

  rule {
    id     = "cleanup_old_artifacts"
    status = "Enabled"

    expiration {
      days = 30
    }

    noncurrent_version_expiration {
      noncurrent_days = 7
    }
  }
}

# IAM Roles and Policies
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

resource "aws_iam_role_policy_attachment" "codebuild_ecr" {
  role       = aws_iam_role.codebuild.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryPowerUser"
}

resource "aws_iam_role_policy_attachment" "codebuild_eks" {
  role       = aws_iam_role.codebuild.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKSClusterPolicy"
}

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

# CloudWatch Events for automatic pipeline triggers
resource "aws_cloudwatch_event_rule" "pipeline_trigger" {
  for_each = toset([
    "auth-service",
    "order-service",
    "payment-service",
    "seller-service",
    "catalog-service",
    "notification-service",
    "admin-service",
    "analytics-service",
    "cdn-service"
  ])

  name        = "maysar-${each.key}-pipeline-trigger"
  description = "Trigger pipeline on code changes for ${each.key}"

  event_pattern = jsonencode({
    source      = ["aws.codecommit"]
    detail-type = ["CodeCommit Repository State Change"]
    resources   = [aws_codecommit_repository.maysar.arn]
    detail = {
      event           = ["referenceCreated", "referenceUpdated"]
      referenceType   = ["branch"]
      referenceName   = ["main", "develop"]
      repositoryName  = [aws_codecommit_repository.maysar.repository_name]
    }
  })

  tags = {
    Name = "maysar-${each.key}-pipeline-trigger"
  }
}

resource "aws_cloudwatch_event_target" "pipeline_trigger" {
  for_each = toset([
    "auth-service",
    "order-service",
    "payment-service",
    "seller-service",
    "catalog-service",
    "notification-service",
    "admin-service",
    "analytics-service",
    "cdn-service"
  ])

  rule      = aws_cloudwatch_event_rule.pipeline_trigger[each.key].name
  arn       = aws_codepipeline.services[each.key].arn
  role_arn  = aws_iam_role.eventbridge_pipeline.arn
}

# IAM Role for EventBridge to trigger pipelines
resource "aws_iam_role" "eventbridge_pipeline" {
  name = "maysar-${var.environment}-eventbridge-pipeline-role"

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

resource "aws_iam_role_policy" "eventbridge_pipeline" {
  name = "maysar-${var.environment}-eventbridge-pipeline-policy"
  role = aws_iam_role.eventbridge_pipeline.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "codepipeline:StartPipelineExecution"
        ]
        Resource = [
          for service in ["auth-service", "order-service", "payment-service", "seller-service", "catalog-service", "notification-service", "admin-service", "analytics-service", "cdn-service"] :
          aws_codepipeline.services[service].arn
        ]
      }
    ]
  })
}

# CloudWatch Alarms for CI/CD monitoring
resource "aws_cloudwatch_metric_alarm" "pipeline_failures" {
  for_each = toset([
    "auth-service",
    "order-service",
    "payment-service",
    "seller-service",
    "catalog-service",
    "notification-service",
    "admin-service",
    "analytics-service",
    "cdn-service"
  ])

  alarm_name          = "maysar-${each.key}-pipeline-failure"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "1"
  metric_name         = "PipelineExecutionFailed"
  namespace           = "AWS/CodePipeline"
  period              = "300"
  statistic           = "Sum"
  threshold           = "0"
  alarm_description   = "Pipeline execution failed for ${each.key}"
  alarm_actions       = [aws_sns_topic.cicd_alerts.arn]

  dimensions = {
    PipelineName = aws_codepipeline.services[each.key].name
  }
}

resource "aws_cloudwatch_metric_alarm" "build_failures" {
  for_each = toset([
    "auth-service",
    "order-service",
    "payment-service",
    "seller-service",
    "catalog-service",
    "notification-service",
    "admin-service",
    "analytics-service",
    "cdn-service"
  ])

  alarm_name          = "maysar-${each.key}-build-failure"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "1"
  metric_name         = "FailedBuilds"
  namespace           = "AWS/CodeBuild"
  period              = "300"
  statistic           = "Sum"
  threshold           = "0"
  alarm_description   = "Build failed for ${each.key}"
  alarm_actions       = [aws_sns_topic.cicd_alerts.arn]

  dimensions = {
    ProjectName = aws_codebuild_project.services[each.key].name
  }
}

# SNS Topic for CI/CD alerts
resource "aws_sns_topic" "cicd_alerts" {
  name = "maysar-${var.environment}-cicd-alerts"

  tags = {
    Name = "maysar-${var.environment}-cicd-alerts"
  }
}

# Feature Flags with AWS AppConfig
resource "aws_appconfig_application" "maysar" {
  name        = "maysar-${var.environment}"
  description = "Maysar feature flags application"

  tags = {
    Name = "maysar-${var.environment}-feature-flags"
  }
}

resource "aws_appconfig_environment" "staging" {
  application_id = aws_appconfig_application.maysar.id
  name           = "staging"
  description    = "Staging environment for feature flags"

  tags = {
    Name = "maysar-staging-feature-flags"
  }
}

resource "aws_appconfig_environment" "production" {
  application_id = aws_appconfig_application.maysar.id
  name           = "production"
  description    = "Production environment for feature flags"

  tags = {
    Name = "maysar-production-feature-flags"
  }
}

resource "aws_appconfig_configuration_profile" "feature_flags" {
  application_id     = aws_appconfig_application.maysar.id
  name               = "feature-flags"
  description        = "Feature flags configuration"
  retrieval_role_arn = aws_iam_role.appconfig.arn

  tags = {
    Name = "maysar-feature-flags-config"
  }
}

# IAM Role for AppConfig
resource "aws_iam_role" "appconfig" {
  name = "maysar-${var.environment}-appconfig-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "appconfig.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "appconfig" {
  role       = aws_iam_role.appconfig.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSAppConfigRole"
}

# Rollback procedures with Lambda
resource "aws_lambda_function" "rollback" {
  filename         = data.archive_file.rollback.output_path
  function_name    = "maysar-${var.environment}-rollback"
  role            = aws_iam_role.rollback_lambda.arn
  handler         = "index.handler"
  runtime         = "nodejs18.x"
  timeout         = 300

  environment {
    variables = {
      CLUSTER_NAME = var.eks_cluster_name
      REGION       = var.aws_region
    }
  }
}

resource "aws_iam_role" "rollback_lambda" {
  name = "maysar-${var.environment}-rollback-lambda-role"

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

resource "aws_iam_role_policy" "rollback_lambda" {
  name = "maysar-${var.environment}-rollback-lambda-policy"
  role = aws_iam_role.rollback_lambda.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "eks:DescribeCluster",
          "eks:ListClusters"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "codepipeline:GetPipeline",
          "codepipeline:GetPipelineExecution",
          "codepipeline:StopPipelineExecution"
        ]
        Resource = "*"
      }
    ]
  })
}

data "archive_file" "rollback" {
  type        = "zip"
  output_path = "/tmp/rollback.zip"

  source {
    content  = <<-EOF
exports.handler = async (event) => {
  console.log('Rollback triggered:', JSON.stringify(event, null, 2));

  // Rollback logic would go here
  // - Stop current deployment
  // - Roll back to previous version
  // - Update feature flags
  // - Notify stakeholders

  return {
    statusCode: 200,
    body: JSON.stringify({ message: 'Rollback initiated' })
  };
};
EOF
    filename = "index.js"
  }
}
