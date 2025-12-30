# Maysar Infrastructure Setup

This directory contains the complete infrastructure-as-code setup for deploying Maysar to production using Kubernetes, Terraform, and AWS.

## Architecture Overview

- **VPC**: Multi-AZ private VPC with public/private subnets
- **EKS**: Kubernetes cluster with auto-scaling node groups
- **RDS**: Separate PostgreSQL databases per service
- **Redis**: ElastiCache cluster for caching and sessions
- **S3 + CloudFront**: CDN for media assets
- **Secrets Manager**: Encrypted secrets storage
- **Istio**: Service mesh with automatic mTLS
- **Helm**: Application deployments

## Directory Structure

```
infra/
├── terraform/                    # Terraform infrastructure
│   ├── main.tf                  # Main infrastructure configuration
│   ├── variables.tf             # Global variables
│   └── modules/                 # Reusable Terraform modules
│       ├── vpc/                 # VPC, subnets, route tables
│       ├── eks/                 # EKS cluster and node groups
│       ├── rds/                 # RDS PostgreSQL instances
│       ├── redis/               # ElastiCache Redis cluster
│       ├── cdn/                 # S3 + CloudFront CDN
│       ├── secrets/             # AWS Secrets Manager + KMS
│       ├── alb/                 # Application Load Balancer
│       ├── api-gateway/         # AWS API Gateway
│       ├── monitoring/          # Prometheus + Grafana
│       └── helm-services/       # Helm chart deployments
└── k8s/                         # Kubernetes manifests
    ├── helm-charts/             # Helm charts for services
    │   └── api-gateway/         # API Gateway chart
    └── mtls/                    # mTLS configuration
        ├── istio-install.yaml   # Istio service mesh
        └── cert-issuer.yaml     # Certificate management
```

## Prerequisites

1. **AWS CLI** configured with appropriate permissions
2. **Terraform** v1.5+ installed
3. **kubectl** configured for EKS access
4. **Helm** v3.0+ installed
5. **istioctl** for Istio management

## Quick Start

### 1. Initialize Terraform

```bash
cd infra/terraform
terraform init
terraform plan -var-file=staging.tfvars
terraform apply -var-file=staging.tfvars
```

### 2. Configure kubectl

```bash
aws eks update-kubeconfig --name maysar-staging --region eu-west-1
```

### 3. Install Istio Service Mesh

```bash
# Install Istio operator
kubectl apply -f ../k8s/mtls/istio-install.yaml

# Wait for Istio to be ready
kubectl wait --for=condition=ready pod -l app=istiod -n istio-system

# Label namespace for automatic sidecar injection
kubectl label namespace default istio-injection=enabled
```

### 4. Install cert-manager

```bash
helm repo add jetstack https://charts.jetstack.io
helm repo update
helm install cert-manager jetstack/cert-manager \
  --namespace cert-manager \
  --create-namespace \
  --version v1.12.3 \
  --set installCRDs=true
```

### 5. Deploy Certificate Issuer

```bash
kubectl apply -f ../k8s/mtls/cert-issuer.yaml
```

### 6. Deploy API Gateway

```bash
# Add Helm repositories
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update

# Deploy API Gateway
helm install api-gateway ./helm-charts/api-gateway \
  --namespace default \
  --values ./helm-charts/api-gateway/values-staging.yaml
```

## Environment Configuration

Create environment-specific variable files:

### staging.tfvars
```hcl
environment     = "staging"
domain_name     = "staging.maysar.com"
vpc_cidr       = "10.1.0.0/16"
db_instance_class = "db.t3.micro"
redis_node_type = "cache.t3.micro"
```

### production.tfvars
```hcl
environment     = "prod"
domain_name     = "api.maysar.com"
vpc_cidr       = "10.0.0.0/16"
db_instance_class = "db.r6g.large"
redis_node_type = "cache.r6g.large"
```

## Secrets Management

### AWS Secrets Manager Structure

Secrets are organized by category:

- `maysar/{env}/database` - Database connection strings
- `maysar/{env}/jwt` - JWT signing secrets
- `maysar/{env}/payment` - Payment gateway credentials
- `maysar/{env}/external` - SMS, email, CDN credentials
- `maysar/{env}/ca` - Certificate Authority certificates

### Accessing Secrets in Applications

Use the AWS SDK or IRSA to access secrets:

```typescript
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

const client = new SecretsManagerClient({ region: 'eu-west-1' });
const response = await client.send(new GetSecretValueCommand({
  SecretId: 'maysar/prod/database'
}));
```

## mTLS Configuration

Automatic mTLS is enabled via Istio:

1. **Peer Authentication**: Forces mutual TLS between services
2. **Authorization Policies**: Controls service-to-service communication
3. **Destination Rules**: Configures load balancing and TLS settings

### Testing mTLS

```bash
# Check if mTLS is working
kubectl exec -it deployment/api-gateway -- curl -v https://auth-service:3000/health

# Should show TLS handshake in response
```

## Monitoring & Observability

### Prometheus + Grafana

```bash
# Access Grafana
kubectl port-forward svc/grafana 3000:80 -n monitoring

# Default credentials: admin/admin
```

### Service Mesh Observability

```bash
# Access Kiali dashboard
kubectl port-forward svc/kiali 20001:20001 -n istio-system

# Access Jaeger tracing
kubectl port-forward svc/tracing 16686:16686 -n istio-system
```

## Scaling Configuration

### Horizontal Pod Autoscaling

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: api-gateway-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api-gateway
  minReplicas: 3
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
```

### Cluster Autoscaling

EKS node groups automatically scale based on pod resource requests.

## Backup & Disaster Recovery

### Database Backups

- Automatic daily snapshots
- Point-in-time recovery enabled
- Cross-region backup replication

### Application Backups

- Helm release backups
- ConfigMap/Secret snapshots
- Persistent volume snapshots

## Security Considerations

1. **Network Security**: All traffic encrypted, VPC-only access
2. **Secret Management**: KMS encryption, regular rotation
3. **Access Control**: IRSA, least-privilege IAM roles
4. **Compliance**: SOC 2, PCI DSS compliant architecture

## Troubleshooting

### Common Issues

1. **Pod Security Context**: Ensure non-root user configuration
2. **Certificate Issues**: Check cert-manager logs
3. **Service Discovery**: Verify DNS and service annotations
4. **Resource Limits**: Monitor for OOM kills

### Logs and Debugging

```bash
# View Istio proxy logs
kubectl logs deployment/api-gateway -c istio-proxy

# Check certificate status
kubectl describe certificate api-gateway-tls

# View service mesh configuration
istioctl proxy-config routes deployment/api-gateway
```

## Next Steps

1. **CI/CD Pipeline**: Implement GitOps with ArgoCD
2. **Multi-Region**: Add cross-region failover
3. **Advanced Security**: Implement OPA Gatekeeper policies
4. **Cost Optimization**: Set up resource quotas and budgets
