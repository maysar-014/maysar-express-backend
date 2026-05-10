locals {
  name_prefix = "${var.project_name}-${var.environment}"

  tags = merge(
    {
      Project     = var.project_name
      Environment = var.environment
      ManagedBy   = "terraform"
      Stack       = "aws-production"
    },
    var.tags
  )

  app_image = var.app_image != null && trim(var.app_image) != ""
    ? var.app_image
    : "${aws_ecr_repository.app.repository_url}:latest"

  base_url = var.custom_domain_name != null && trim(var.custom_domain_name) != ""
    ? "https://${var.custom_domain_name}"
    : ""

  jwt_secret                 = var.jwt_secret != null && trim(var.jwt_secret) != "" ? var.jwt_secret : random_password.jwt_secret.result
  user_service_jwt_secret    = var.user_service_jwt_secret != null && trim(var.user_service_jwt_secret) != "" ? var.user_service_jwt_secret : random_password.user_service_jwt_secret.result
  auth_service_session_secret = var.auth_service_session_secret != null && trim(var.auth_service_session_secret) != "" ? var.auth_service_session_secret : random_password.auth_service_session_secret.result
  meili_master_key           = var.meili_master_key != null && trim(var.meili_master_key) != "" ? var.meili_master_key : random_password.meili_master_key.result
  pii_encryption_key         = var.pii_encryption_key != null && trim(var.pii_encryption_key) != "" ? var.pii_encryption_key : random_id.pii_encryption_key.hex
  pii_hmac_secret            = var.pii_hmac_secret != null && trim(var.pii_hmac_secret) != "" ? var.pii_hmac_secret : random_password.pii_hmac_secret.result

  database_url = format(
    "postgresql://%s:%s@%s:%s/%s?schema=public&sslmode=require",
    var.db_username,
    random_password.db_password.result,
    module.data.db_endpoint,
    module.data.db_port,
    var.db_name
  )

  redis_url = format(
    "rediss://default:%s@%s:%s",
    random_password.redis_auth_token.result,
    module.data.redis_primary_endpoint,
    module.data.redis_port
  )
}
