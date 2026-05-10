locals {
  create_custom_domain = var.custom_domain_name != null
    && trim(var.custom_domain_name) != ""
    && var.route53_zone_id != null
    && trim(var.route53_zone_id) != ""

  service_discovery_namespace = "${replace(var.name_prefix, "-", "")}.internal"
  runtime_base_url            = var.base_url != null && trim(var.base_url) != "" ? var.base_url : "http://${aws_lb.this.dns_name}"
}

resource "aws_cloudwatch_log_group" "app" {
  name              = "/ecs/${var.name_prefix}/app"
  retention_in_days = var.cloudwatch_retention_days
}

resource "aws_cloudwatch_log_group" "meilisearch" {
  name              = "/ecs/${var.name_prefix}/meilisearch"
  retention_in_days = var.cloudwatch_retention_days
}

resource "aws_ecs_cluster" "this" {
  name = "${var.name_prefix}-cluster"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }
}

resource "aws_iam_role" "execution" {
  name = "${var.name_prefix}-ecs-execution-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17",
    Statement = [
      {
        Effect = "Allow",
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        },
        Action = "sts:AssumeRole"
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "execution" {
  role       = aws_iam_role.execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

resource "aws_iam_role_policy" "execution_secrets" {
  name = "${var.name_prefix}-ecs-execution-secrets"
  role = aws_iam_role.execution.id

  policy = jsonencode({
    Version = "2012-10-17",
    Statement = [
      {
        Effect = "Allow",
        Action = [
          "secretsmanager:GetSecretValue",
          "kms:Decrypt"
        ],
        Resource = [var.app_secret_arn]
      }
    ]
  })
}

resource "aws_iam_role" "task" {
  name = "${var.name_prefix}-ecs-task-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17",
    Statement = [
      {
        Effect = "Allow",
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        },
        Action = "sts:AssumeRole"
      }
    ]
  })
}

resource "aws_iam_role_policy" "task_s3" {
  name = "${var.name_prefix}-task-s3"
  role = aws_iam_role.task.id

  policy = jsonencode({
    Version = "2012-10-17",
    Statement = [
      {
        Effect = "Allow",
        Action = [
          "s3:ListBucket"
        ],
        Resource = [var.app_bucket_arn]
      },
      {
        Effect = "Allow",
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject"
        ],
        Resource = ["${var.app_bucket_arn}/*"]
      }
    ]
  })
}

resource "aws_iam_role_policy" "task_efs" {
  name = "${var.name_prefix}-task-efs"
  role = aws_iam_role.task.id

  policy = jsonencode({
    Version = "2012-10-17",
    Statement = [
      {
        Effect = "Allow",
        Action = [
          "elasticfilesystem:ClientMount",
          "elasticfilesystem:ClientWrite",
          "elasticfilesystem:DescribeMountTargets"
        ],
        Resource = "*"
      }
    ]
  })
}

resource "aws_service_discovery_private_dns_namespace" "this" {
  name = local.service_discovery_namespace
  vpc  = var.vpc_id
}

resource "aws_service_discovery_service" "meilisearch" {
  name = "meilisearch"

  dns_config {
    namespace_id = aws_service_discovery_private_dns_namespace.this.id

    dns_records {
      ttl  = 10
      type = "A"
    }
  }

  health_check_custom_config {
    failure_threshold = 1
  }
}

resource "aws_lb" "this" {
  name               = "${var.name_prefix}-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [var.alb_security_group_id]
  subnets            = var.public_subnet_ids
}

resource "aws_lb_target_group" "app" {
  name        = "${substr(var.name_prefix, 0, 20)}-app-tg"
  port        = var.app_port
  protocol    = "HTTP"
  target_type = "ip"
  vpc_id      = var.vpc_id

  health_check {
    enabled             = true
    path                = var.health_check_path
    healthy_threshold   = 2
    unhealthy_threshold = 3
    interval            = 30
    timeout             = 5
    matcher             = "200-399"
  }
}

resource "aws_acm_certificate" "this" {
  count = local.create_custom_domain ? 1 : 0

  domain_name       = var.custom_domain_name
  validation_method = "DNS"

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_route53_record" "certificate_validation" {
  for_each = local.create_custom_domain ? {
    for dvo in aws_acm_certificate.this[0].domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  } : {}

  zone_id = var.route53_zone_id
  name    = each.value.name
  type    = each.value.type
  ttl     = 60
  records = [each.value.record]
}

resource "aws_acm_certificate_validation" "this" {
  count = local.create_custom_domain ? 1 : 0

  certificate_arn         = aws_acm_certificate.this[0].arn
  validation_record_fqdns = [for record in aws_route53_record.certificate_validation : record.fqdn]
}

resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.this.arn
  port              = 80
  protocol          = "HTTP"

  dynamic "default_action" {
    for_each = local.create_custom_domain ? [1] : []

    content {
      type = "redirect"

      redirect {
        port        = "443"
        protocol    = "HTTPS"
        status_code = "HTTP_301"
      }
    }
  }

  dynamic "default_action" {
    for_each = local.create_custom_domain ? [] : [1]

    content {
      type             = "forward"
      target_group_arn = aws_lb_target_group.app.arn
    }
  }
}

resource "aws_lb_listener" "https" {
  count = local.create_custom_domain ? 1 : 0

  load_balancer_arn = aws_lb.this.arn
  port              = 443
  protocol          = "HTTPS"
  certificate_arn   = aws_acm_certificate_validation.this[0].certificate_arn
  ssl_policy        = "ELBSecurityPolicy-TLS13-1-2-2021-06"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.app.arn
  }
}

resource "aws_route53_record" "app" {
  count = local.create_custom_domain ? 1 : 0

  zone_id = var.route53_zone_id
  name    = var.custom_domain_name
  type    = "A"

  alias {
    name                   = aws_lb.this.dns_name
    zone_id                = aws_lb.this.zone_id
    evaluate_target_health = true
  }
}

resource "aws_ecs_task_definition" "meilisearch" {
  family                   = "${var.name_prefix}-meilisearch"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = "512"
  memory                   = "1024"
  execution_role_arn       = aws_iam_role.execution.arn
  task_role_arn            = aws_iam_role.task.arn

  volume {
    name = "meili-data"

    efs_volume_configuration {
      file_system_id          = var.meilisearch_efs_id
      transit_encryption      = "ENABLED"
      transit_encryption_port = 2999

      authorization_config {
        access_point_id = var.meilisearch_access_point_id
        iam             = "ENABLED"
      }
    }
  }

  container_definitions = jsonencode([
    {
      name      = "meilisearch"
      image     = var.meilisearch_image
      essential = true
      portMappings = [
        {
          containerPort = 7700
          hostPort      = 7700
          protocol      = "tcp"
        }
      ]
      mountPoints = [
        {
          sourceVolume  = "meili-data"
          containerPath = "/meili_data"
          readOnly      = false
        }
      ]
      environment = [
        {
          name  = "MEILI_ENV"
          value = "production"
        }
      ]
      secrets = [
        {
          name      = "MEILI_MASTER_KEY"
          valueFrom = "${var.app_secret_arn}:MEILI_MASTER_KEY::"
        }
      ]
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          awslogs-group         = aws_cloudwatch_log_group.meilisearch.name
          awslogs-region        = var.aws_region
          awslogs-stream-prefix = "ecs"
        }
      }
    }
  ])
}

resource "aws_ecs_service" "meilisearch" {
  name                               = "${var.name_prefix}-meilisearch"
  cluster                            = aws_ecs_cluster.this.id
  task_definition                    = aws_ecs_task_definition.meilisearch.arn
  desired_count                      = 1
  launch_type                        = "FARGATE"
  platform_version                   = "LATEST"
  enable_execute_command             = true
  deployment_minimum_healthy_percent = 100
  deployment_maximum_percent         = 200

  network_configuration {
    subnets          = var.private_subnet_ids
    security_groups  = [var.meilisearch_security_group_id]
    assign_public_ip = false
  }

  service_registries {
    registry_arn = aws_service_discovery_service.meilisearch.arn
  }
}

resource "aws_ecs_task_definition" "app" {
  family                   = "${var.name_prefix}-app"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = tostring(var.app_cpu)
  memory                   = tostring(var.app_memory)
  execution_role_arn       = aws_iam_role.execution.arn
  task_role_arn            = aws_iam_role.task.arn

  container_definitions = jsonencode([
    {
      name      = "app"
      image     = var.app_image
      essential = true
      portMappings = [
        {
          containerPort = var.app_port
          hostPort      = var.app_port
          protocol      = "tcp"
        }
      ]
      environment = [
        { name = "NODE_ENV", value = "production" },
        { name = "PORT", value = tostring(var.app_port) },
        { name = "BASE_URL", value = local.runtime_base_url },
        { name = "FRONTEND_URL", value = var.frontend_url },
        { name = "PESAPAL_URL", value = var.pesapal_url },
        { name = "SEARCH_PROVIDER", value = "meilisearch" },
        { name = "MEILISEARCH_HOST", value = "meilisearch.${aws_service_discovery_private_dns_namespace.this.name}" },
        { name = "MEILISEARCH_PORT", value = "7700" },
        { name = "MEILISEARCH_PROTOCOL", value = "http" },
        { name = "MEILISEARCH_INDEX_NAME", value = var.meilisearch_index_name },
        { name = "MEILISEARCH_REQUEST_TIMEOUT", value = tostring(var.meilisearch_request_timeout) },
        { name = "AWS_DEFAULT_REGION", value = var.aws_region },
        { name = "AWS_S3_BUCKET", value = var.app_bucket_name },
        { name = "STORAGE_BUCKET", value = var.app_bucket_name },
        { name = "BACKUP_S3_BUCKET", value = var.backup_bucket_name },
        { name = "CORS_ORIGIN", value = var.cors_origin },
        { name = "METRICS_ENABLED", value = "true" },
        { name = "SERVICE_NAME", value = "maysar-backend" },
        { name = "SERVICE_VERSION", value = var.service_version },
        { name = "LOG_LEVEL", value = var.log_level }
      ]
      secrets = [
        { name = "DATABASE_URL", valueFrom = "${var.app_secret_arn}:DATABASE_URL::" },
        { name = "REDIS_URL", valueFrom = "${var.app_secret_arn}:REDIS_URL::" },
        { name = "POSTGRES_USER", valueFrom = "${var.app_secret_arn}:POSTGRES_USER::" },
        { name = "POSTGRES_PASSWORD", valueFrom = "${var.app_secret_arn}:POSTGRES_PASSWORD::" },
        { name = "POSTGRES_DB", valueFrom = "${var.app_secret_arn}:POSTGRES_DB::" },
        { name = "REDIS_PASSWORD", valueFrom = "${var.app_secret_arn}:REDIS_PASSWORD::" },
        { name = "JWT_SECRET", valueFrom = "${var.app_secret_arn}:JWT_SECRET::" },
        { name = "USER_SERVICE_JWT_SECRET", valueFrom = "${var.app_secret_arn}:USER_SERVICE_JWT_SECRET::" },
        { name = "AUTH_SERVICE_SESSION_SECRET", valueFrom = "${var.app_secret_arn}:AUTH_SERVICE_SESSION_SECRET::" },
        { name = "PESAPAL_CONSUMER_KEY", valueFrom = "${var.app_secret_arn}:PESAPAL_CONSUMER_KEY::" },
        { name = "PESAPAL_CONSUMER_SECRET", valueFrom = "${var.app_secret_arn}:PESAPAL_CONSUMER_SECRET::" },
        { name = "PESAPAL_IPN_ID", valueFrom = "${var.app_secret_arn}:PESAPAL_IPN_ID::" },
        { name = "PII_ENCRYPTION_KEY", valueFrom = "${var.app_secret_arn}:PII_ENCRYPTION_KEY::" },
        { name = "PII_HMAC_SECRET", valueFrom = "${var.app_secret_arn}:PII_HMAC_SECRET::" },
        { name = "MEILI_MASTER_KEY", valueFrom = "${var.app_secret_arn}:MEILI_MASTER_KEY::" },
        { name = "MEILISEARCH_API_KEY", valueFrom = "${var.app_secret_arn}:MEILISEARCH_API_KEY::" },
        { name = "GOOGLE_OAUTH_CLIENT_ID", valueFrom = "${var.app_secret_arn}:GOOGLE_OAUTH_CLIENT_ID::" },
        { name = "GOOGLE_OAUTH_CLIENT_SECRET", valueFrom = "${var.app_secret_arn}:GOOGLE_OAUTH_CLIENT_SECRET::" },
        { name = "SMTP_USER", valueFrom = "${var.app_secret_arn}:SMTP_USER::" },
        { name = "SMTP_PASS", valueFrom = "${var.app_secret_arn}:SMTP_PASS::" },
        { name = "SENTRY_DSN", valueFrom = "${var.app_secret_arn}:SENTRY_DSN::" }
      ]
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          awslogs-group         = aws_cloudwatch_log_group.app.name
          awslogs-region        = var.aws_region
          awslogs-stream-prefix = "ecs"
        }
      }
      healthCheck = {
        command     = ["CMD-SHELL", "node -e \"const http=require('http');const req=http.get({host:'127.0.0.1',port:${var.app_port},path:'${var.health_check_path}',timeout:4000},res=>process.exit(res.statusCode===200?0:1));req.on('timeout',()=>req.destroy(new Error('timeout')));req.on('error',()=>process.exit(1));\""]
        interval    = 30
        timeout     = 5
        retries     = 3
        startPeriod = 45
      }
    }
  ])
}

resource "aws_ecs_service" "app" {
  name                               = "${var.name_prefix}-app"
  cluster                            = aws_ecs_cluster.this.id
  task_definition                    = aws_ecs_task_definition.app.arn
  desired_count                      = var.app_desired_count
  launch_type                        = "FARGATE"
  platform_version                   = "LATEST"
  enable_execute_command             = true
  health_check_grace_period_seconds  = 120
  deployment_minimum_healthy_percent = 50
  deployment_maximum_percent         = 200

  network_configuration {
    subnets          = var.private_subnet_ids
    security_groups  = [var.app_security_group_id]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.app.arn
    container_name   = "app"
    container_port   = var.app_port
  }

  deployment_circuit_breaker {
    enable   = true
    rollback = true
  }

  depends_on = [
    aws_lb_listener.http,
    aws_ecs_service.meilisearch
  ]
}

resource "aws_appautoscaling_target" "app" {
  service_namespace  = "ecs"
  resource_id        = "service/${aws_ecs_cluster.this.name}/${aws_ecs_service.app.name}"
  scalable_dimension = "ecs:service:DesiredCount"
  min_capacity       = var.app_min_capacity
  max_capacity       = var.app_max_capacity
}

resource "aws_appautoscaling_policy" "cpu" {
  name               = "${var.name_prefix}-cpu-scaling"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.app.resource_id
  scalable_dimension = aws_appautoscaling_target.app.scalable_dimension
  service_namespace  = aws_appautoscaling_target.app.service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageCPUUtilization"
    }

    target_value       = 60
    scale_in_cooldown  = 120
    scale_out_cooldown = 60
  }
}

resource "aws_appautoscaling_policy" "memory" {
  name               = "${var.name_prefix}-memory-scaling"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.app.resource_id
  scalable_dimension = aws_appautoscaling_target.app.scalable_dimension
  service_namespace  = aws_appautoscaling_target.app.service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageMemoryUtilization"
    }

    target_value       = 70
    scale_in_cooldown  = 120
    scale_out_cooldown = 60
  }
}
