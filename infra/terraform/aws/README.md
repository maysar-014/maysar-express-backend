# AWS Production Terraform

This stack provisions a production-ready AWS environment for the Maysar backend without disturbing the existing OCI infrastructure under `infra/terraform/`.

## What It Creates

- VPC with public and private subnets across two availability zones
- Internet gateway, NAT gateways, and route tables
- Public Application Load Balancer
- ECS Fargate cluster for:
  - the backend API
  - a dedicated internal Meilisearch service
- RDS PostgreSQL with Multi-AZ support
- ElastiCache Redis replication group with TLS and auth token
- EFS for persistent Meilisearch indexes
- S3 buckets for application object storage and backups
- Secrets Manager secret containing runtime application secrets
- ECR repository for the backend image
- Route53 and ACM integration when a custom domain is provided
- CloudWatch log groups and baseline infrastructure alarms via SNS

## Assumptions

- The backend image is built from the repository root `Dockerfile`.
- Production runs on ECS Fargate, not directly on EC2 or Docker Compose.
- Meilisearch runs as its own internal ECS service so the API can scale horizontally.
- Application document storage is backed by S3 through the task role.
- Runtime secrets are injected from AWS Secrets Manager.

## Quick Start

1. Copy the example variables file:

```bash
cd infra/terraform/aws
cp terraform.tfvars.example terraform.tfvars
```

2. Fill in:

- `custom_domain_name`
- `route53_zone_id`
- `app_image` or plan to push to the generated ECR repository
- PaymentGateway production credentials
- any optional overrides you want for sizing or secrets

3. Configure remote state:

```bash
terraform init -backend-config=backend.hcl.example
```

You will typically create a real `backend.hcl` outside version control using the same keys as `backend.hcl.example`.

4. Plan and apply:

```bash
terraform plan -var-file=terraform.tfvars
terraform apply -var-file=terraform.tfvars
```

## Deploying The App Image

If you do not set `app_image`, Terraform creates an ECR repository and assumes the backend service should use `:latest`.

Example push flow:

```bash
aws ecr get-login-password --region us-east-1 \
  | docker login --username AWS --password-stdin <ACCOUNT>.dkr.ecr.us-east-1.amazonaws.com

docker build -t maysar-prod .
docker tag maysar-prod:latest <ACCOUNT>.dkr.ecr.us-east-1.amazonaws.com/maysar-production-app:latest
docker push <ACCOUNT>.dkr.ecr.us-east-1.amazonaws.com/maysar-production-app:latest
```

Then force a new ECS deployment or run `terraform apply` again if the image reference changed.

## Important Outputs

- `app_url`
- `ecr_repository_url`
- `rds_endpoint`
- `redis_primary_endpoint`
- `app_bucket_name`
- `runtime_secret_arn`

## Notes

- This stack intentionally leaves CI/CD choice open. You can deploy images from GitHub Actions, CodeBuild, or another pipeline.
- The stack generates secure defaults for JWT, session, Redis, database, Meilisearch, and PII secrets unless you override them.
- For stricter security, add WAF, Shield Advanced, and a dedicated KMS key layer as a follow-up.
