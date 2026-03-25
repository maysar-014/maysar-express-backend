# Secrets Management Runbook

## Overview

This document defines how secrets are classified, stored, and injected across all deployment environments. **Never commit secrets to version control.**

---

## 1. Secret Classification

| Variable                      | Purpose                          | Classification                | Usage Location                 |
| ----------------------------- | -------------------------------- | ----------------------------- | ------------------------------ |
| `POSTGRES_USER`               | PostgreSQL username              | `[SECRETS MANAGER]`           | `docker-compose.prod.yml`, Orchestrator |
| `POSTGRES_PASSWORD`           | PostgreSQL password              | `[SECRETS MANAGER]`           | `docker-compose.prod.yml`, Orchestrator |
| `POSTGRES_DB`                 | Database name                    | `[ENV VAR]`                   | `docker-compose.prod.yml`, Orchestrator |
| `REDIS_PASSWORD`              | Redis AUTH password              | `[SECRETS MANAGER]`           | `docker-compose.prod.yml`, Orchestrator |
| `JWT_SECRET`                  | JWT signing key                  | `[SECRETS MANAGER]`           | Application runtime            |
| `USER_SERVICE_JWT_SECRET`     | User service JWT key             | `[SECRETS MANAGER]`           | Application runtime            |
| `AUTH_SERVICE_SESSION_SECRET` | Session encryption key           | `[SECRETS MANAGER]`           | Application runtime            |
| `PESAPAL_CONSUMER_KEY`        | Pesapal API key                  | `[SECRETS MANAGER]`           | Payment service                |
| `PESAPAL_CONSUMER_SECRET`     | Pesapal API secret               | `[SECRETS MANAGER]`           | Payment service                |
| `PII_ENCRYPTION_KEY`          | PII encryption key (32-byte hex) | `[SECRETS MANAGER]`           | Application runtime            |
| `PII_HMAC_SECRET`             | PII HMAC secret                  | `[SECRETS MANAGER]`           | Application runtime            |
| `PESAPAL_SECRET_KEY`           | Pesapal API secret                | `[SECRETS MANAGER]`           | Payment service                |
| `PESAPAL_WEBHOOK_SECRET`       | Pesapal webhook signature         | `[SECRETS MANAGER]`           | Payment service                |
| `AWS_ACCESS_KEY_ID`           | AWS S3 backup credentials        | `[SECRETS MANAGER]`           | Backup containers              |
| `AWS_SECRET_ACCESS_KEY`       | AWS S3 secret                    | `[SECRETS MANAGER]`           | Backup containers              |
| `AWS_DEFAULT_REGION`          | AWS region                       | `[ENV VAR]`                   | Backup containers              |
| `BACKUP_S3_BUCKET`            | S3 bucket name                   | `[ENV VAR]`                   | Backup containers              |
| `JAEGER_ENDPOINT`             | Jaeger trace collector URL       | `[ENV VAR]`                   | Application runtime            |
| `METRICS_ENABLED`             | Enable Prometheus metrics        | `[ENV VAR]`                   | Application runtime            |
| `SERVICE_NAME`                | Service identifier               | `[ENV VAR]`                   | Application runtime            |
| `SERVICE_VERSION`             | Application version              | `[ENV VAR]`                   | Application runtime            |
| `SSH_HOST`                    | Deployment host/IP               | `[SECRETS MANAGER - CI/CD]`   | `deploy-staging.yml`, `deploy-production.yml` |
| `SSH_PORT`                    | Deployment SSH port              | `[ENV VAR / SECRET]`          | `deploy-staging.yml`, `deploy-production.yml` |
| `SSH_USER`                    | Deployment SSH user              | `[SECRETS MANAGER - CI/CD]`   | `deploy-staging.yml`, `deploy-production.yml` |
| `SSH_PRIVATE_KEY`             | Deployment private key           | `[SECRETS MANAGER - CI/CD]`   | `deploy-staging.yml`, `deploy-production.yml` |
| `DEPLOY_PATH`                 | Deployment target directory      | `[ENV VAR / SECRET]`          | `deploy-staging.yml`, `deploy-production.yml` |
| `ENV_FILE`                    | Full environment file content    | `[SECRETS MANAGER - CI/CD]`   | `deploy-staging.yml`, `deploy-production.yml` |
| `HEALTHCHECK_URL`             | Post-deploy health endpoint      | `[ENV VAR / SECRET]`          | `deploy-staging.yml`, `deploy-production.yml` |

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

The `docker-compose.prod.yml` file (lines 8â€“16, 149â€“185) references secrets via environment variable substitution:

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

## 5. CI/CD Secrets (GitHub Actions)

### Required Secrets

Add these in **GitHub â†’ Settings â†’ Secrets and Variables â†’ Actions**:

| Secret Name        | Description                      | Used In                                       |
| ------------------ | -------------------------------- | --------------------------------------------- |
| `SSH_HOST` | Deployment server host/IP | `deploy-staging.yml`, `deploy-production.yml` |
| `SSH_PORT` | Deployment SSH port (optional, defaults to 22) | `deploy-staging.yml`, `deploy-production.yml` |
| `SSH_USER` | SSH login user | `deploy-staging.yml`, `deploy-production.yml` |
| `SSH_PRIVATE_KEY` | Private SSH key used by GitHub Actions | `deploy-staging.yml`, `deploy-production.yml` |
| `DEPLOY_PATH` | Absolute path where project is deployed on host | `deploy-staging.yml`, `deploy-production.yml` |
| `ENV_FILE` | Full env file content for target environment | `deploy-staging.yml`, `deploy-production.yml` |
| `HEALTHCHECK_URL` | Optional post-deploy health endpoint | `deploy-staging.yml`, `deploy-production.yml` |

### Workflow References

See `.github/workflows/ci.yml`:

- CI checks run for branch flow: `dev`, `staging`, `prod`
- Staging deployment workflow: `.github/workflows/deploy-staging.yml`
- Production deployment workflow: `.github/workflows/deploy-production.yml`

---

## 6. Secret Rotation

### Database Password

1. Generate new password in OCI Vault.
2. Update application secret (ExternalSecret or deployctl).
3. Update database user password:
   ```sql
   ALTER USER maysar_user WITH PASSWORD '<new_password>';
   ```
4. Rolling restart pods to pick up new secret.

### JWT Secret

1. Generate new secret: `openssl rand -hex 32`
2. Update OCI Vault secret.
3. Deploy new secret to Orchestrator.
4. Rolling restart application pods.
5. **Note:** Existing tokens will be invalidated; users must re-authenticate.

### Pesapal Keys

1. Rotate keys in Pesapal dashboard.
2. Update OCI Vault secrets.
3. Deploy to Orchestrator and restart payment service pods.

### Emergency Rotation

For compromised secrets, follow the incident playbook: `docs/incident-playbook.md`.

---

## 7. Verification

### Check Secret Presence (Orchestrator)

```bash
deployctl get secret maysar-backend-secrets -n maysar-backend -o yaml
```

### Verify Secret Injection (Pod)

```bash
deployctl exec -it <pod-name> -n maysar-backend -- env | grep JWT_SECRET
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
