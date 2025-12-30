# Helm Services Module for Maysar Microservices

# Auth Service Helm Release
resource "helm_release" "auth_service" {
  name       = "auth-service"
  repository = var.helm_repo_url
  chart      = "auth-service"
  namespace  = "maysar"
  create_namespace = true

  values = [
    yamlencode({
      image = {
        repository = var.auth_service_image
        tag        = var.auth_service_tag
        pullPolicy = "IfNotPresent"
      }

      serviceAccount = {
        create = true
        name   = "auth-service"
        annotations = {
          "eks.amazonaws.com/role-arn" = var.auth_service_role_arn
        }
      }

      env = {
        NODE_ENV              = var.environment
        DATABASE_URL          = var.auth_db_endpoint
        JWT_SECRET            = var.jwt_secret
        REDIS_URL             = var.redis_endpoint
        KAFKA_BROKERS         = var.kafka_brokers
        AWS_REGION            = var.aws_region
      }

      service = {
        type = "ClusterIP"
        port = 3000
      }

      resources = {
        requests = {
          cpu    = "100m"
          memory = "256Mi"
        }
        limits = {
          cpu    = "500m"
          memory = "1Gi"
        }
      }

      autoscaling = {
        enabled      = true
        minReplicas  = 2
        maxReplicas  = 10
        targetCPUUtilizationPercentage = 70
        targetMemoryUtilizationPercentage = 80
      }

      ingress = {
        enabled = true
        annotations = {
          "kubernetes.io/ingress.class" = "alb"
          "alb.ingress.kubernetes.io/scheme" = "internet-facing"
          "alb.ingress.kubernetes.io/target-type" = "ip"
        }
        hosts = [
          {
            host = "auth.api.${var.domain_name}"
            paths = [
              {
                path     = "/"
                pathType = "Prefix"
              }
            ]
          }
        ]
      }

      monitoring = {
        prometheus = {
          enabled = true
        }
        grafana = {
          enabled = true
        }
      }
    })
  ]
}

# Order Service Helm Release
resource "helm_release" "order_service" {
  name       = "order-service"
  repository = var.helm_repo_url
  chart      = "order-service"
  namespace  = "maysar"

  values = [
    yamlencode({
      image = {
        repository = var.order_service_image
        tag        = var.order_service_tag
        pullPolicy = "IfNotPresent"
      }

      serviceAccount = {
        create = true
        name   = "order-service"
        annotations = {
          "eks.amazonaws.com/role-arn" = var.order_service_role_arn
        }
      }

      env = {
        NODE_ENV              = var.environment
        DATABASE_URL          = var.order_db_endpoint
        REDIS_URL             = var.redis_endpoint
        KAFKA_BROKERS         = var.kafka_brokers
        AWS_REGION            = var.aws_region
        PAYMENT_SERVICE_URL   = "http://payment-service.maysar.svc.cluster.local:3000"
        INVENTORY_SERVICE_URL = "http://inventory-service.maysar.svc.cluster.local:3000"
      }

      service = {
        type = "ClusterIP"
        port = 3000
      }

      resources = {
        requests = {
          cpu    = "200m"
          memory = "512Mi"
        }
        limits = {
          cpu    = "1000m"
          memory = "2Gi"
        }
      }

      autoscaling = {
        enabled      = true
        minReplicas  = 3
        maxReplicas  = 15
        targetCPUUtilizationPercentage = 70
        targetMemoryUtilizationPercentage = 80
      }

      ingress = {
        enabled = true
        annotations = {
          "kubernetes.io/ingress.class" = "alb"
          "alb.ingress.kubernetes.io/scheme" = "internet-facing"
          "alb.ingress.kubernetes.io/target-type" = "ip"
        }
        hosts = [
          {
            host = "orders.api.${var.domain_name}"
            paths = [
              {
                path     = "/"
                pathType = "Prefix"
              }
            ]
          }
        ]
      }

      monitoring = {
        prometheus = {
          enabled = true
        }
        grafana = {
          enabled = true
        }
      }
    })
  ]

  depends_on = [helm_release.auth_service]
}

# Payment Service Helm Release
resource "helm_release" "payment_service" {
  name       = "payment-service"
  repository = var.helm_repo_url
  chart      = "payment-service"
  namespace  = "maysar"

  values = [
    yamlencode({
      image = {
        repository = var.payment_service_image
        tag        = var.payment_service_tag
        pullPolicy = "IfNotPresent"
      }

      serviceAccount = {
        create = true
        name   = "payment-service"
        annotations = {
          "eks.amazonaws.com/role-arn" = var.payment_service_role_arn
        }
      }

      env = {
        NODE_ENV              = var.environment
        DATABASE_URL          = var.payment_db_endpoint
        REDIS_URL             = var.redis_endpoint
        KAFKA_BROKERS         = var.kafka_brokers
        AWS_REGION            = var.aws_region
        PESAPAL_CONSUMER_KEY  = var.pesapal_consumer_key
        PESAPAL_CONSUMER_SECRET = var.pesapal_consumer_secret
        CDN_DOMAIN            = var.cdn_domain
        WALLET_SERVICE_URL    = "http://wallet-service.maysar.svc.cluster.local:3000"
      }

      service = {
        type = "ClusterIP"
        port = 3000
      }

      resources = {
        requests = {
          cpu    = "300m"
          memory = "768Mi"
        }
        limits = {
          cpu    = "1500m"
          memory = "3Gi"
        }
      }

      autoscaling = {
        enabled      = true
        minReplicas  = 3
        maxReplicas  = 20
        targetCPUUtilizationPercentage = 70
        targetMemoryUtilizationPercentage = 80
      }

      ingress = {
        enabled = true
        annotations = {
          "kubernetes.io/ingress.class" = "alb"
          "alb.ingress.kubernetes.io/scheme" = "internet-facing"
          "alb.ingress.kubernetes.io/target-type" = "ip"
        }
        hosts = [
          {
            host = "payments.api.${var.domain_name}"
            paths = [
              {
                path     = "/"
                pathType = "Prefix"
              }
            ]
          }
        ]
      }

      monitoring = {
        prometheus = {
          enabled = true
        }
        grafana = {
          enabled = true
        }
      }

      securityContext = {
        runAsNonRoot = true
        runAsUser    = 101
        runAsGroup   = 101
        fsGroup      = 101
      }
    })
  ]

  depends_on = [helm_release.order_service]
}

# Seller Service Helm Release
resource "helm_release" "seller_service" {
  name       = "seller-service"
  repository = var.helm_repo_url
  chart      = "seller-service"
  namespace  = "maysar"

  values = [
    yamlencode({
      image = {
        repository = var.seller_service_image
        tag        = var.seller_service_tag
        pullPolicy = "IfNotPresent"
      }

      serviceAccount = {
        create = true
        name   = "seller-service"
        annotations = {
          "eks.amazonaws.com/role-arn" = var.seller_service_role_arn
        }
      }

      env = {
        NODE_ENV              = var.environment
        DATABASE_URL          = var.seller_db_endpoint
        REDIS_URL             = var.redis_endpoint
        KAFKA_BROKERS         = var.kafka_brokers
        AWS_REGION            = var.aws_region
        CDN_DOMAIN            = var.cdn_domain
      }

      service = {
        type = "ClusterIP"
        port = 3000
      }

      resources = {
        requests = {
          cpu    = "150m"
          memory = "384Mi"
        }
        limits = {
          cpu    = "750m"
          memory = "1.5Gi"
        }
      }

      autoscaling = {
        enabled      = true
        minReplicas  = 2
        maxReplicas  = 8
        targetCPUUtilizationPercentage = 70
        targetMemoryUtilizationPercentage = 80
      }

      ingress = {
        enabled = true
        annotations = {
          "kubernetes.io/ingress.class" = "alb"
          "alb.ingress.kubernetes.io/scheme" = "internet-facing"
          "alb.ingress.kubernetes.io/target-type" = "ip"
        }
        hosts = [
          {
            host = "sellers.api.${var.domain_name}"
            paths = [
              {
                path     = "/"
                pathType = "Prefix"
              }
            ]
          }
        ]
      }

      monitoring = {
        prometheus = {
          enabled = true
        }
        grafana = {
          enabled = true
        }
      }
    })
  ]

  depends_on = [helm_release.auth_service]
}

# Catalog Service Helm Release
resource "helm_release" "catalog_service" {
  name       = "catalog-service"
  repository = var.helm_repo_url
  chart      = "catalog-service"
  namespace  = "maysar"

  values = [
    yamlencode({
      image = {
        repository = var.catalog_service_image
        tag        = var.catalog_service_tag
        pullPolicy = "IfNotPresent"
      }

      serviceAccount = {
        create = true
        name   = "catalog-service"
        annotations = {
          "eks.amazonaws.com/role-arn" = var.catalog_service_role_arn
        }
      }

      env = {
        NODE_ENV              = var.environment
        DATABASE_URL          = var.catalog_db_endpoint
        REDIS_URL             = var.redis_endpoint
        KAFKA_BROKERS         = var.kafka_brokers
        AWS_REGION            = var.aws_region
        CDN_DOMAIN            = var.cdn_domain
        SEARCH_SERVICE_URL    = "http://search-service.maysar.svc.cluster.local:3000"
      }

      service = {
        type = "ClusterIP"
        port = 3000
      }

      resources = {
        requests = {
          cpu    = "200m"
          memory = "512Mi"
        }
        limits = {
          cpu    = "1000m"
          memory = "2Gi"
        }
      }

      autoscaling = {
        enabled      = true
        minReplicas  = 3
        maxReplicas  = 12
        targetCPUUtilizationPercentage = 70
        targetMemoryUtilizationPercentage = 80
      }

      ingress = {
        enabled = true
        annotations = {
          "kubernetes.io/ingress.class" = "alb"
          "alb.ingress.kubernetes.io/scheme" = "internet-facing"
          "alb.ingress.kubernetes.io/target-type" = "ip"
        }
        hosts = [
          {
            host = "catalog.api.${var.domain_name}"
            paths = [
              {
                path     = "/"
                pathType = "Prefix"
              }
            ]
          }
        ]
      }

      monitoring = {
        prometheus = {
          enabled = true
        }
        grafana = {
          enabled = true
        }
      }
    })
  ]

  depends_on = [helm_release.auth_service]
}

# Notification Service Helm Release
resource "helm_release" "notification_service" {
  name       = "notification-service"
  repository = var.helm_repo_url
  chart      = "notification-service"
  namespace  = "maysar"

  values = [
    yamlencode({
      image = {
        repository = var.notification_service_image
        tag        = var.notification_service_tag
        pullPolicy = "IfNotPresent"
      }

      serviceAccount = {
        create = true
        name   = "notification-service"
        annotations = {
          "eks.amazonaws.com/role-arn" = var.notification_service_role_arn
        }
      }

      env = {
        NODE_ENV              = var.environment
        DATABASE_URL          = var.notification_db_endpoint
        REDIS_URL             = var.redis_endpoint
        KAFKA_BROKERS         = var.kafka_brokers
        AWS_REGION            = var.aws_region
        SMTP_USERNAME         = var.smtp_username
        SMTP_PASSWORD         = var.smtp_password
        SMS_API_KEY           = var.sms_api_key
      }

      service = {
        type = "ClusterIP"
        port = 3000
      }

      resources = {
        requests = {
          cpu    = "150m"
          memory = "384Mi"
        }
        limits = {
          cpu    = "750m"
          memory = "1.5Gi"
        }
      }

      autoscaling = {
        enabled      = true
        minReplicas  = 2
        maxReplicas  = 8
        targetCPUUtilizationPercentage = 70
        targetMemoryUtilizationPercentage = 80
      }

      ingress = {
        enabled = true
        annotations = {
          "kubernetes.io/ingress.class" = "alb"
          "alb.ingress.kubernetes.io/scheme" = "internet-facing"
          "alb.ingress.kubernetes.io/target-type" = "ip"
        }
        hosts = [
          {
            host = "notifications.api.${var.domain_name}"
            paths = [
              {
                path     = "/"
                pathType = "Prefix"
              }
            ]
          }
        ]
      }

      monitoring = {
        prometheus = {
          enabled = true
        }
        grafana = {
          enabled = true
        }
      }
    })
  ]

  depends_on = [helm_release.auth_service]
}

# Admin Service Helm Release
resource "helm_release" "admin_service" {
  name       = "admin-service"
  repository = var.helm_repo_url
  chart      = "admin-service"
  namespace  = "maysar"

  values = [
    yamlencode({
      image = {
        repository = var.admin_service_image
        tag        = var.admin_service_tag
        pullPolicy = "IfNotPresent"
      }

      serviceAccount = {
        create = true
        name   = "admin-service"
        annotations = {
          "eks.amazonaws.com/role-arn" = var.admin_service_role_arn
        }
      }

      env = {
        NODE_ENV              = var.environment
        DATABASE_URL          = var.admin_db_endpoint
        REDIS_URL             = var.redis_endpoint
        KAFKA_BROKERS         = var.kafka_brokers
        AWS_REGION            = var.aws_region
        JWT_SECRET            = var.admin_jwt_secret
      }

      service = {
        type = "ClusterIP"
        port = 3000
      }

      resources = {
        requests = {
          cpu    = "100m"
          memory = "256Mi"
        }
        limits = {
          cpu    = "500m"
          memory = "1Gi"
        }
      }

      autoscaling = {
        enabled      = true
        minReplicas  = 1
        maxReplicas  = 5
        targetCPUUtilizationPercentage = 70
        targetMemoryUtilizationPercentage = 80
      }

      ingress = {
        enabled = true
        annotations = {
          "kubernetes.io/ingress.class" = "alb"
          "alb.ingress.kubernetes.io/scheme" = "internet-facing"
          "alb.ingress.kubernetes.io/target-type" = "ip"
        }
        hosts = [
          {
            host = "admin.api.${var.domain_name}"
            paths = [
              {
                path     = "/"
                pathType = "Prefix"
              }
            ]
          }
        ]
      }

      monitoring = {
        prometheus = {
          enabled = true
        }
        grafana = {
          enabled = true
        }
      }
    })
  ]

  depends_on = [helm_release.auth_service]
}

# Analytics Service Helm Release
resource "helm_release" "analytics_service" {
  name       = "analytics-service"
  repository = var.helm_repo_url
  chart      = "analytics-service"
  namespace  = "maysar"

  values = [
    yamlencode({
      image = {
        repository = var.analytics_service_image
        tag        = var.analytics_service_tag
        pullPolicy = "IfNotPresent"
      }

      serviceAccount = {
        create = true
        name   = "analytics-service"
        annotations = {
          "eks.amazonaws.com/role-arn" = var.analytics_service_role_arn
        }
      }

      env = {
        NODE_ENV              = var.environment
        DATABASE_URL          = var.analytics_db_endpoint
        REDIS_URL             = var.redis_endpoint
        KAFKA_BROKERS         = var.kafka_brokers
        AWS_REGION            = var.aws_region
        ANALYTICS_BUCKET      = "maysar-${var.environment}-analytics"
      }

      service = {
        type = "ClusterIP"
        port = 3000
      }

      resources = {
        requests = {
          cpu    = "300m"
          memory = "768Mi"
        }
        limits = {
          cpu    = "1500m"
          memory = "3Gi"
        }
      }

      autoscaling = {
        enabled      = true
        minReplicas  = 2
        maxReplicas  = 8
        targetCPUUtilizationPercentage = 70
        targetMemoryUtilizationPercentage = 80
      }

      ingress = {
        enabled = true
        annotations = {
          "kubernetes.io/ingress.class" = "alb"
          "alb.ingress.kubernetes.io/scheme" = "internet-facing"
          "alb.ingress.kubernetes.io/target-type" = "ip"
        }
        hosts = [
          {
            host = "analytics.api.${var.domain_name}"
            paths = [
              {
                path     = "/"
                pathType = "Prefix"
              }
            ]
          }
        ]
      }

      monitoring = {
        prometheus = {
          enabled = true
        }
        grafana = {
          enabled = true
        }
      }
    })
  ]

  depends_on = [helm_release.auth_service]
}

# CDN Service Helm Release
resource "helm_release" "cdn_service" {
  name       = "cdn-service"
  repository = var.helm_repo_url
  chart      = "cdn-service"
  namespace  = "maysar"

  values = [
    yamlencode({
      image = {
        repository = var.cdn_service_image
        tag        = var.cdn_service_tag
        pullPolicy = "IfNotPresent"
      }

      serviceAccount = {
        create = true
        name   = "cdn-service"
        annotations = {
          "eks.amazonaws.com/role-arn" = var.cdn_service_role_arn
        }
      }

      env = {
        NODE_ENV              = var.environment
        AWS_REGION            = var.aws_region
        MEDIA_BUCKET          = "maysar-${var.environment}-media"
        CLOUDFRONT_DISTRIBUTION_ID = var.cloudfront_distribution_id
      }

      service = {
        type = "ClusterIP"
        port = 3000
      }

      resources = {
        requests = {
          cpu    = "100m"
          memory = "256Mi"
        }
        limits = {
          cpu    = "500m"
          memory = "1Gi"
        }
      }

      autoscaling = {
        enabled      = true
        minReplicas  = 2
        maxReplicas  = 6
        targetCPUUtilizationPercentage = 70
        targetMemoryUtilizationPercentage = 80
      }

      ingress = {
        enabled = true
        annotations = {
          "kubernetes.io/ingress.class" = "alb"
          "alb.ingress.kubernetes.io/scheme" = "internet-facing"
          "alb.ingress.kubernetes.io/target-type" = "ip"
        }
        hosts = [
          {
            host = "cdn.api.${var.domain_name}"
            paths = [
              {
                path     = "/"
                pathType = "Prefix"
              }
            ]
          }
        ]
      }

      monitoring = {
        prometheus = {
          enabled = true
        }
        grafana = {
          enabled = true
        }
      }
    })
  ]

  depends_on = [helm_release.auth_service]
}
