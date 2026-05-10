resource "random_password" "db_password" {
  length           = 32
  special          = true
  override_special = "!@#%^*-_=+"
}

resource "random_password" "redis_auth_token" {
  length           = 48
  special          = false
}

resource "random_password" "jwt_secret" {
  length           = 48
  special          = true
  override_special = "!@#%^*-_=+"
}

resource "random_password" "user_service_jwt_secret" {
  length           = 48
  special          = true
  override_special = "!@#%^*-_=+"
}

resource "random_password" "auth_service_session_secret" {
  length           = 48
  special          = true
  override_special = "!@#%^*-_=+"
}

resource "random_password" "meili_master_key" {
  length           = 40
  special          = false
}

resource "random_password" "pii_hmac_secret" {
  length           = 64
  special          = true
  override_special = "!@#%^*-_=+"
}

resource "random_id" "pii_encryption_key" {
  byte_length = 32
}

resource "aws_ecr_repository" "app" {
  name                 = "${local.name_prefix}-app"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }
}

module "network" {
  source = "./modules/network"

  name_prefix               = local.name_prefix
  vpc_cidr                  = var.vpc_cidr
  availability_zones        = var.availability_zones
  public_subnet_cidrs       = var.public_subnet_cidrs
  private_subnet_cidrs      = var.private_subnet_cidrs
  enable_single_nat_gateway = var.enable_single_nat_gateway
  tags                      = local.tags
}

resource "aws_security_group" "alb" {
  name        = "${local.name_prefix}-alb-sg"
  description = "Public ingress to the application load balancer"
  vpc_id      = module.network.vpc_id

  ingress {
    description = "HTTP"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = var.allowed_ingress_cidrs
  }

  ingress {
    description = "HTTPS"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = var.allowed_ingress_cidrs
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_security_group" "app" {
  name        = "${local.name_prefix}-app-sg"
  description = "Backend ECS service security group"
  vpc_id      = module.network.vpc_id

  ingress {
    description     = "ALB to app"
    from_port       = var.app_port
    to_port         = var.app_port
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_security_group" "meilisearch" {
  name        = "${local.name_prefix}-meili-sg"
  description = "Internal ECS service security group for Meilisearch"
  vpc_id      = module.network.vpc_id

  ingress {
    description     = "App to Meilisearch"
    from_port       = 7700
    to_port         = 7700
    protocol        = "tcp"
    security_groups = [aws_security_group.app.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_security_group" "db" {
  name        = "${local.name_prefix}-db-sg"
  description = "RDS PostgreSQL ingress from the backend service"
  vpc_id      = module.network.vpc_id

  ingress {
    description     = "App to PostgreSQL"
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.app.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_security_group" "redis" {
  name        = "${local.name_prefix}-redis-sg"
  description = "ElastiCache Redis ingress from the backend service"
  vpc_id      = module.network.vpc_id

  ingress {
    description     = "App to Redis"
    from_port       = 6379
    to_port         = 6379
    protocol        = "tcp"
    security_groups = [aws_security_group.app.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_security_group" "efs" {
  name        = "${local.name_prefix}-efs-sg"
  description = "EFS ingress from the Meilisearch ECS service"
  vpc_id      = module.network.vpc_id

  ingress {
    description     = "Meilisearch to EFS"
    from_port       = 2049
    to_port         = 2049
    protocol        = "tcp"
    security_groups = [aws_security_group.meilisearch.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

module "data" {
  source = "./modules/data"

  name_prefix              = local.name_prefix
  private_subnet_ids       = module.network.private_subnet_ids
  db_security_group_id     = aws_security_group.db.id
  redis_security_group_id  = aws_security_group.redis.id
  efs_security_group_id    = aws_security_group.efs.id
  db_name                  = var.db_name
  db_username              = var.db_username
  db_password              = random_password.db_password.result
  db_engine_version        = var.db_engine_version
  db_instance_class        = var.db_instance_class
  db_allocated_storage     = var.db_allocated_storage
  db_max_allocated_storage = var.db_max_allocated_storage
  db_backup_retention_days = var.db_backup_retention_days
  db_multi_az              = var.db_multi_az
  redis_node_type          = var.redis_node_type
  redis_engine_version     = var.redis_engine_version
  redis_auth_token         = random_password.redis_auth_token.result
  redis_num_cache_clusters = var.redis_num_cache_clusters
  tags                     = local.tags
}

resource "aws_secretsmanager_secret" "app_runtime" {
  name                    = "${local.name_prefix}/app-runtime"
  description             = "Runtime configuration for the ${local.name_prefix} backend and internal services"
  recovery_window_in_days = 7
}

resource "aws_secretsmanager_secret_version" "app_runtime" {
  secret_id = aws_secretsmanager_secret.app_runtime.id

  secret_string = jsonencode({
    DATABASE_URL                = local.database_url
    REDIS_URL                   = local.redis_url
    POSTGRES_USER               = var.db_username
    POSTGRES_PASSWORD           = random_password.db_password.result
    POSTGRES_DB                 = var.db_name
    REDIS_PASSWORD              = random_password.redis_auth_token.result
    JWT_SECRET                  = local.jwt_secret
    USER_SERVICE_JWT_SECRET     = local.user_service_jwt_secret
    AUTH_SERVICE_SESSION_SECRET = local.auth_service_session_secret
    PESAPAL_CONSUMER_KEY        = var.pesapal_consumer_key
    PESAPAL_CONSUMER_SECRET     = var.pesapal_consumer_secret
    PESAPAL_IPN_ID              = var.pesapal_ipn_id
    PII_ENCRYPTION_KEY          = local.pii_encryption_key
    PII_HMAC_SECRET             = local.pii_hmac_secret
    MEILI_MASTER_KEY            = local.meili_master_key
    MEILISEARCH_API_KEY         = local.meili_master_key
    GOOGLE_OAUTH_CLIENT_ID      = var.google_oauth_client_id
    GOOGLE_OAUTH_CLIENT_SECRET  = var.google_oauth_client_secret
    SMTP_USER                   = var.smtp_user
    SMTP_PASS                   = var.smtp_pass
    SENTRY_DSN                  = var.sentry_dsn
  })
}

module "app" {
  source = "./modules/app"

  name_prefix                 = local.name_prefix
  vpc_id                      = module.network.vpc_id
  public_subnet_ids           = module.network.public_subnet_ids
  private_subnet_ids          = module.network.private_subnet_ids
  alb_security_group_id       = aws_security_group.alb.id
  app_security_group_id       = aws_security_group.app.id
  meilisearch_security_group_id = aws_security_group.meilisearch.id
  app_port                    = var.app_port
  health_check_path           = var.health_check_path
  app_cpu                     = var.app_cpu
  app_memory                  = var.app_memory
  app_desired_count           = var.app_desired_count
  app_min_capacity            = var.app_min_capacity
  app_max_capacity            = var.app_max_capacity
  app_image                   = local.app_image
  meilisearch_image           = var.meilisearch_image
  app_secret_arn              = aws_secretsmanager_secret.app_runtime.arn
  app_bucket_name             = module.data.app_bucket_name
  app_bucket_arn              = module.data.app_bucket_arn
  backup_bucket_name          = module.data.backup_bucket_name
  ecr_repository_url          = aws_ecr_repository.app.repository_url
  cloudwatch_retention_days   = 30
  custom_domain_name          = var.custom_domain_name
  route53_zone_id             = var.route53_zone_id
  meilisearch_efs_id          = module.data.meilisearch_efs_id
  meilisearch_access_point_id = module.data.meilisearch_access_point_id
  aws_region                  = var.aws_region
  base_url                    = local.base_url
  frontend_url                = var.frontend_url
  cors_origin                 = var.cors_origin
  service_version             = var.service_version
  log_level                   = var.log_level
  pesapal_url                 = var.pesapal_url
  meilisearch_index_name      = var.meilisearch_index_name
  meilisearch_request_timeout = var.meilisearch_request_timeout
  tags                        = local.tags
}

resource "aws_sns_topic" "alarms" {
  name = "${local.name_prefix}-alarms"
}

resource "aws_sns_topic_subscription" "email" {
  for_each = toset(var.alarm_email_endpoints)

  topic_arn = aws_sns_topic.alarms.arn
  protocol  = "email"
  endpoint  = each.value
}

resource "aws_cloudwatch_metric_alarm" "alb_target_5xx" {
  alarm_name          = "${local.name_prefix}-alb-target-5xx"
  alarm_description   = "ALB target 5xx responses detected"
  namespace           = "AWS/ApplicationELB"
  metric_name         = "HTTPCode_Target_5XX_Count"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  period              = 60
  statistic           = "Sum"
  threshold           = 5
  alarm_actions       = [aws_sns_topic.alarms.arn]
  ok_actions          = [aws_sns_topic.alarms.arn]

  dimensions = {
    LoadBalancer = module.app.load_balancer_arn_suffix
  }
}

resource "aws_cloudwatch_metric_alarm" "ecs_cpu_high" {
  alarm_name          = "${local.name_prefix}-ecs-cpu-high"
  alarm_description   = "Average ECS CPU usage is above 80%"
  namespace           = "AWS/ECS"
  metric_name         = "CPUUtilization"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  period              = 300
  statistic           = "Average"
  threshold           = 80
  alarm_actions       = [aws_sns_topic.alarms.arn]
  ok_actions          = [aws_sns_topic.alarms.arn]

  dimensions = {
    ClusterName = module.app.cluster_name
    ServiceName = module.app.app_service_name
  }
}

resource "aws_cloudwatch_metric_alarm" "rds_cpu_high" {
  alarm_name          = "${local.name_prefix}-rds-cpu-high"
  alarm_description   = "Average RDS CPU usage is above 80%"
  namespace           = "AWS/RDS"
  metric_name         = "CPUUtilization"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  period              = 300
  statistic           = "Average"
  threshold           = 80
  alarm_actions       = [aws_sns_topic.alarms.arn]
  ok_actions          = [aws_sns_topic.alarms.arn]

  dimensions = {
    DBInstanceIdentifier = module.data.db_instance_id
  }
}

resource "aws_cloudwatch_metric_alarm" "redis_cpu_high" {
  alarm_name          = "${local.name_prefix}-redis-cpu-high"
  alarm_description   = "Average ElastiCache engine CPU usage is above 80%"
  namespace           = "AWS/ElastiCache"
  metric_name         = "EngineCPUUtilization"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  period              = 300
  statistic           = "Average"
  threshold           = 80
  alarm_actions       = [aws_sns_topic.alarms.arn]
  ok_actions          = [aws_sns_topic.alarms.arn]

  dimensions = {
    ReplicationGroupId = module.data.redis_replication_group_id
  }
}
