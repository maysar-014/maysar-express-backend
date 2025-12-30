# Main Terraform configuration for Maysar infrastructure
# This sets up the complete cloud infrastructure for production deployment

terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.0"
    }
  }

  backend "s3" {
    bucket = "maysar-terraform-state"
    key    = "maysar-infrastructure.tfstate"
    region = "eu-west-1"
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "Maysar"
      Environment = var.environment
      ManagedBy   = "Terraform"
    }
  }
}

provider "helm" {
  kubernetes {
    host                   = module.eks.cluster_endpoint
    cluster_ca_certificate = base64decode(module.eks.cluster_certificate_authority_data)
    token                  = data.aws_eks_cluster_auth.cluster.token
  }
}

provider "kubernetes" {
  host                   = module.eks.cluster_endpoint
  cluster_ca_certificate = base64decode(module.eks.cluster_certificate_authority_data)
  token                  = data.aws_eks_cluster_auth.cluster.token
}

# Data sources
data "aws_caller_identity" "current" {}

data "aws_eks_cluster_auth" "cluster" {
  name = module.eks.cluster_name
}

# VPC Module
module "vpc" {
  source = "./modules/vpc"

  environment         = var.environment
  vpc_cidr           = var.vpc_cidr
  availability_zones = var.availability_zones
  private_subnets    = var.private_subnets
  public_subnets     = var.public_subnets
  database_subnets   = var.database_subnets
}

# EKS Cluster Module
module "eks" {
  source = "./modules/eks"

  environment          = var.environment
  cluster_version      = var.cluster_version
  vpc_id              = module.vpc.vpc_id
  private_subnets     = module.vpc.private_subnets
  node_groups         = var.node_groups
  enable_irsa         = true

  depends_on = [module.vpc]
}

# RDS PostgreSQL Module - Auth Service
module "rds_auth" {
  source = "./modules/rds"

  environment         = var.environment
  service_name        = "auth"
  vpc_id             = module.vpc.vpc_id
  database_subnets   = module.vpc.database_subnets
  instance_class     = var.db_instance_class
  allocated_storage  = var.db_allocated_storage
  engine_version     = var.postgres_version

  depends_on = [module.vpc]
}

# RDS PostgreSQL Module - Order Service
module "rds_order" {
  source = "./modules/rds"

  environment         = var.environment
  service_name        = "order"
  vpc_id             = module.vpc.vpc_id
  database_subnets   = module.vpc.database_subnets
  instance_class     = var.db_instance_class
  allocated_storage  = var.db_allocated_storage
  engine_version     = var.postgres_version

  depends_on = [module.vpc]
}

# RDS PostgreSQL Module - Payment Service
module "rds_payment" {
  source = "./modules/rds"

  environment         = var.environment
  service_name        = "payment"
  vpc_id             = module.vpc.vpc_id
  database_subnets   = module.vpc.database_subnets
  instance_class     = var.db_instance_class
  allocated_storage  = var.db_allocated_storage
  engine_version     = var.postgres_version

  depends_on = [module.vpc]
}

# Redis Cluster Module
module "redis" {
  source = "./modules/redis"

  environment       = var.environment
  vpc_id           = module.vpc.vpc_id
  private_subnets  = module.vpc.private_subnets
  node_type        = var.redis_node_type
  num_cache_nodes  = var.redis_num_cache_nodes

  depends_on = [module.vpc]
}

# Kafka (MSK) Cluster Module
module "kafka" {
  source = "./modules/kafka"

  environment            = var.environment
  vpc_id                = module.vpc.vpc_id
  vpc_cidr              = module.vpc.vpc_cidr
  private_subnets       = module.vpc.private_subnets
  kafka_version         = var.kafka_version
  number_of_broker_nodes = var.kafka_number_of_broker_nodes
  broker_instance_type  = var.kafka_broker_instance_type
  ebs_volume_size       = var.kafka_ebs_volume_size

  depends_on = [module.vpc]
}

# S3 + CloudFront CDN Module
module "cdn" {
  source = "./modules/cdn"

  environment    = var.environment
  domain_name    = var.domain_name
  aws_account_id = data.aws_caller_identity.current.account_id
  enable_waf     = var.enable_waf

  depends_on = [module.vpc]
}

# AWS Secrets Manager + KMS
module "secrets" {
  source = "./modules/secrets"

  environment = var.environment

  depends_on = [module.vpc]
}

# Application Load Balancer
module "alb" {
  source = "./modules/alb"

  environment     = var.environment
  vpc_id         = module.vpc.vpc_id
  public_subnets = module.vpc.public_subnets
  domain_name    = var.domain_name

  depends_on = [module.vpc]
}

# API Gateway (AWS API Gateway for external APIs)
module "api_gateway" {
  source = "./modules/api-gateway"

  environment  = var.environment
  domain_name = var.domain_name

  depends_on = [module.alb]
}

# Monitoring Stack (Prometheus + Grafana)
module "monitoring" {
  source = "./modules/monitoring"

  environment          = var.environment
  vpc_id              = module.vpc.vpc_id
  private_subnets     = module.vpc.private_subnets
  cluster_endpoint    = module.eks.cluster_endpoint
  cluster_name        = module.eks.cluster_name

  depends_on = [module.eks]
}

# Helm Charts for Services
module "helm_services" {
  source = "./modules/helm-services"

  environment         = var.environment
  cluster_name       = module.eks.cluster_name
  vpc_id             = module.vpc.vpc_id

  # Database endpoints
  auth_db_endpoint   = module.rds_auth.db_endpoint
  order_db_endpoint  = module.rds_order.db_endpoint
  payment_db_endpoint = module.rds_payment.db_endpoint

  # Redis endpoint
  redis_endpoint     = module.redis.redis_endpoint

  # CDN domain
  cdn_domain         = module.cdn.cdn_domain

  depends_on = [
    module.eks,
    module.rds_auth,
    module.rds_order,
    module.rds_payment,
    module.redis,
    module.cdn
  ]
}

# Outputs
output "vpc_id" {
  value = module.vpc.vpc_id
}

output "cluster_endpoint" {
  value = module.eks.cluster_endpoint
}

output "cluster_name" {
  value = module.eks.cluster_name
}

output "alb_dns_name" {
  value = module.alb.alb_dns_name
}

output "api_gateway_url" {
  value = module.api_gateway.api_gateway_url
}

output "cdn_domain" {
  value = module.cdn.cdn_domain
}
