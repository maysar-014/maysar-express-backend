# Secrets Management Runbook

## Overview

This document defines how secrets are classified, stored, and injected across all deployment environments. **Never commit secrets to version control.**

---

## 1. Secret Classification

| Variable | Purpose | Classification | Usage Location |
|----------|---------|----------------|----------------|
| `POSTGRES_USER` | PostgreSQL username | `[SECRETS MANAGER]` | `docker-compose.prod.yml`, K8s |
| `POSTGRES_PASSWORD` | PostgreSQL password | `[SECRETS MANAGER]` | `docker-compose.prod.yml`, K8s |
| `POSTGRES_DB` | Database name | `[ENV VAR]` | `docker-compose.prod.yml`, K8s |
| `REDIS_PASSWORD` | Redis AUTH password | `[SECRETS MANAGER]` | `docker-compose.prod.yml`, K8s |
| `JWT_SECRET` | JWT signing key | `[SECRETS MANAGER]` | Application runtime |
| `USER_SERVICE_JWT_SECRET` | User service JWT key | `[SECRETS MANAGER]` | Application runtime |
| `AUTH_SERVICE_SESSION_SECRET` | Session encryption key | `[SECRETS MANAGER]` | Application runtime |
| `PESAPAL_CONSUMER_KEY` | Pesapal API key | `[SECRETS MANAGER]` | Payment service |
| `PESAPAL_CONSUMER_SECRET` | Pesapal API secret | `[SECRETS MANAGER]` | Payment service |
| `PII_ENCRYPTION_KEY` | PII encryption key (32-byte hex) | `[SECRETS MANAGER]` | Application runtime |
| `PII_HMAC_SECRET` | PII HMAC secret | `[SECRETS MANAGER]` | Application runtime |
| `STRIPE_SECRET_KEY` | Stripe API secret | `[SECRETS MANAGER]` | Payment service |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signature | `[SECRETS MANAGER]` | Payment service |
| `AWS_ACCESS_KEY_ID` | AWS S3 backup credentials | `[SECRETS MANAGER]` | Backup containers |
| `AWS_SECRET_ACCESS_KEY` | AWS S3 secret | `[SECRETS MANAGER]` | Backup containers |
| `AWS_DEFAULT_REGION` | AWS region | `[ENV VAR]` | Backup containers |
| `BACKUP_S3_BUCKET` | S3 bucket name | `[ENV VAR]` | Backup containers |
| `JAEGER_ENDPOINT` | Jaeger trace collector URL | `[ENV VAR]` | Application runtime |
| `METRICS_ENABLED` | Enable Prometheus metrics | `[ENV VAR]` | Application runtime |
| `SERVICE_NAME` | Service identifier | `[ENV VAR]` | Application runtime |
| `SERVICE_VERSION` | Application version | `[ENV VAR]` | Application runtime |
| `DOCKER_USERNAME` | Docker Hub username | `[SECRETS MANAGER - CI only]` | `.github/workflows/ci.yml` |
| `OCI_USER_OCID` | OCI user identifier | `[SECRETS MANAGER - CI only]` | `.github/workflows/ci.yml` |
| `OCI_FINGERPRINT` | OCI API key fingerprint | `[SECRETS MANAGER - CI only]` | `.github/workflows/ci.yml` |
| `OCI_TENANCY_OCID` | OCI tenancy identifier | `[SECRETS MANAGER - CI only]` | `.github/workflows/ci.yml` |
| `OCI_PRIVATE_KEY` | OCI API private key | `[SECRETS MANAGER - CI only]` | `.github/workflows/ci.yml` |
| `OKE_CLUSTER_OCID` | OKE cluster identifier | `[SECRETS MANAGER - CI only]` | `.github/workflows/ci.yml` |

---

## 2. Local Development

### Setup

1. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```

2. Fill in development values in `.env`. Use non-production secrets for local testing.

3. Verify `.env` is in `.gitignore`:
   ```bash
   grep "^\.env$" .gitignore
   ```

### Running Locally

```bash
npm run dev
```

The application loads `.env` via `dotenv` at startup.

---

## 3. Docker Compose Production

### Secret Injection

The `docker-compose.prod.yml` file (lines 8–16, 149–185) references secrets via environment variable substitution:

```yaml
services:
  postgres:
    environment:
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB}
```

### Deployment

1. Create a `.env.production` file on the deployment host (never commit this file):
   ```bash
   POSTGRES_USER=prod_user
   POSTGRES_PASSWORD=<from OCI Vault>
   POSTGRES_DB=maysar_prod
   REDIS_PASSWORD=<from OCI Vault>
   AWS_ACCESS_KEY_ID=<from OCI Vault>
   AWS_SECRET_ACCESS_KEY=<from OCI Vault>
   # ... other secrets
   ```

2. Fetch secrets from OCI Vault in your deploy script:
   ```bash
   oci secrets secret-bundle get --secret-id <OCID> --query 'data."secret-bundle-content".content' --raw-output | base64 -d > .env.production
   ```

3. Start services with the environment file:
   ```bash
   docker-compose -f docker-compose.prod.yml --env-file .env.production up -d
   ```

**Alternative (Docker Swarm):** Use `docker secret create` and reference secrets in the compose file via `secrets:` blocks.

---

## 4. Kubernetes (OKE)

### Current State

The file `infra/k8s/maysar-backend/configmap.yaml` contains a `Secret` manifest with **placeholder values**. These are for local development only.

### Production Secret Injection

**Option A: OCI Vault + ExternalSecrets (Recommended)**

1. Store secrets in OCI Vault and note the OCID for each secret.

2. Install the [OCI Secrets Store CSI Driver](https://github.com/oracle/oci-secrets-store-csi-driver-provider) or [External Secrets Operator](https://external-secrets.io/).

3. Replace the `Secret` manifest in `configmap.yaml` with an `ExternalSecret` resource:
   ```yaml
   apiVersion: external-secrets.io/v1beta1
   kind: ExternalSecret
   metadata:
     name: maysar-backend-secrets
     namespace: maysar-backend
   spec:
     secretStoreRef:
       name: oci-vault-store
       kind: SecretStore
     target:
       name: maysar-backend-secrets
     data:
       - secretKey: DATABASE_URL
         remoteRef:
           key: <OCI_VAULT_SECRET_OCID>
       - secretKey: JWT_SECRET
         remoteRef:
           key: <OCI_VAULT_SECRET_OCID>
   ```

4. The ExternalSecrets controller fetches secrets at pod start and creates the Kubernetes `Secret` automatically.

**Option B: kubectl create secret (CI/CD)**

In `.github/workflows/ci.yml` deploy step, inject secrets from GitHub Actions secrets:

```yaml
- name: 🔐 Create Kubernetes secrets
  run: |
    kubectl create secret generic maysar-backend-secrets \
      --from-literal=DATABASE_URL="${{ secrets.DATABASE_URL }}" \
      --from-literal=REDIS_URL="${{ secrets.REDIS_URL }}" \
      --from-literal=JWT_SECRET="${{ secrets.JWT_SECRET }}" \
      --namespace maysar-backend \
      --dry-run=client -o yaml | kubectl apply -f -
```

This keeps secrets out of the repository and injects them at deploy time.

---

## 5. CI/CD Secrets (GitHub Actions)

### Required Secrets

Add these in **GitHub → Settings → Secrets and Variables → Actions**:

| Secret Name | Description | Used In |
|-------------|-------------|---------|
| `DOCKER_USERNAME` | Docker Hub username | `docker-build-monolith`, `docker-build-admin` |
| `DOCKER_PASSWORD` | Docker Hub password | `docker-build-monolith`, `docker-build-admin` |
| `OCI_USER_OCID` | OCI user OCID | `deploy-staging` |
| `OCI_FINGERPRINT` | OCI API key fingerprint | `deploy-staging` |
| `OCI_TENANCY_OCID` | OCI tenancy OCID | `deploy-staging` |
| `OCI_PRIVATE_KEY` | OCI API private key (PEM format) | `deploy-staging` |
| `OKE_CLUSTER_OCID` | OKE cluster OCID | `deploy-staging` |
| `DATABASE_URL` | Production database URL | `deploy-staging` (for kubectl secret) |
| `REDIS_URL` | Production Redis URL | `deploy-staging` (for kubectl secret) |
| `JWT_SECRET` | Production JWT secret | `deploy-staging` (for kubectl secret) |

### Workflow References

See `.github/workflows/ci.yml`:
- Lines 407–413: Docker Hub login
- Lines 497–503: OCI credentials configuration
- Line 511: OKE cluster kubeconfig setup

---

## 6. Secret Rotation

### Database Password

1. Generate new password in OCI Vault.
2. Update application secret (ExternalSecret or kubectl).
3. Update database user password:
   ```sql
   ALTER USER maysar_user WITH PASSWORD '<new_password>';
   ```
4. Rolling restart pods to pick up new secret.

### JWT Secret

1. Generate new secret: `openssl rand -hex 32`
2. Update OCI Vault secret.
3. Deploy new secret to K8s.
4. Rolling restart application pods.
5. **Note:** Existing tokens will be invalidated; users must re-authenticate.

### Pesapal Keys

1. Rotate keys in Pesapal dashboard.
2. Update OCI Vault secrets.
3. Deploy to K8s and restart payment service pods.

### Emergency Rotation

For compromised secrets, follow the incident playbook: `docs/incident-playbook.md`.

---

## 7. Verification

### Check Secret Presence (K8s)

```bash
kubectl get secret maysar-backend-secrets -n maysar-backend -o yaml
```

### Verify Secret Injection (Pod)

```bash
kubectl exec -it <pod-name> -n maysar-backend -- env | grep JWT_SECRET
```

### Audit Secret Access

Review OCI Vault audit logs for secret access events.

---

## 8. Security Best Practices

- **Never commit secrets** to version control.
- Use `.gitignore` to exclude `.env` files.
- Rotate secrets every 90 days.
- Use separate secrets for each environment (dev, staging, prod).
- Limit secret access via OCI IAM policies.
- Enable audit logging for all secret access.
- Use automated secret scanning (see `.github/workflows/secrets-scan.yml`).

---

**End of Runbook**
