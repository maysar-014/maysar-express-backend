output "codecommit_repository_url" {
  description = "CodeCommit repository clone URL"
  value       = aws_codecommit_repository.maysar.clone_url_http
}

output "codecommit_repository_arn" {
  description = "CodeCommit repository ARN"
  value       = aws_codecommit_repository.maysar.arn
}

output "ecr_repositories" {
  description = "ECR repository URLs"
  value = {
    for k, v in aws_ecr_repository.services : k => v.repository_url
  }
}

output "codepipeline_arns" {
  description = "CodePipeline ARNs"
  value = {
    for k, v in aws_codepipeline.services : k => v.arn
  }
}

output "codebuild_projects" {
  description = "CodeBuild project names"
  value = {
    for k, v in aws_codebuild_project.services : k => v.name
  }
}

output "pipeline_artifacts_bucket" {
  description = "S3 bucket for pipeline artifacts"
  value       = aws_s3_bucket.pipeline_artifacts.bucket
}

output "feature_flags_application_id" {
  description = "AppConfig application ID for feature flags"
  value       = aws_appconfig_application.maysar.id
}

output "feature_flags_config_profile_id" {
  description = "AppConfig configuration profile ID"
  value       = aws_appconfig_configuration_profile.feature_flags.id
}

output "cicd_alerts_topic_arn" {
  description = "SNS topic ARN for CI/CD alerts"
  value       = aws_sns_topic.cicd_alerts.arn
}

output "rollback_lambda_arn" {
  description = "Rollback Lambda function ARN"
  value       = aws_lambda_function.rollback.arn
}
