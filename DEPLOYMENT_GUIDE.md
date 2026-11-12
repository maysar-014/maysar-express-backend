# Maysar Express Backend — Deployment Guide

**Document ID:** MAYSAR-DEPLOY-001  
**Version:** 1.0  
**Status:** Production-Ready  
**Owner:** Maysar Engineering  
**Applies to:** Development, Staging, Production

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Prerequisites](#2-prerequisites)
3. [Environment Configuration](#3-environment-configuration)
4. [Infrastructure Provisioning](#4-infrastructure-provisioning)
5. [Docker Compose Deployment](#5-docker-compose-deployment)
6. [Database Setup](#6-database-setup)
7. [Cache & Search Setup](#7-cache--search-setup)
8. [Object Storage Setup](#8-object-storage-setup)
9. [Backup System Setup](#9-backup-system-setup)
10. [Monitoring & Observability](#10-monitoring--observability)
11. [CI/CD Pipeline](#11-ci-cd-pipeline)
12. [Deployment Procedures](#12-deployment-procedures)
13. [Post-Deployment Verification](#13-post-deployment-verification)
14. [Security Checklist](#14-security-checklist)
15. [Troubleshooting](#15-troubleshooting)
16. [Maintenance Schedule](#16-maintenance-schedule)

---

## 1. System Overview

Maysar Express Backend is a Node.js/TypeScript monolithic API serving an enterprise e-commerce platform. It is deployed via Docker Compose across three environment tiers.

| Environment | Purpose | Compose Files | Infrastructure |
|-------------|---------|---------------|----------------|
| Development | Local development & testing | `docker-compose.yml` | Docker Desktop / local |
| Staging | Pre-production validation | `docker-compose.yml` + `docker-compose.staging.yml` | OCI or self-hosted |
| Production | Live customer traffic | `docker-compose.yml` + `docker-compose.prod.yml` | OCI via Terraform |

### Core Services

| Service | Image | Port | Purpose |
|---------|-------|------|---------|
| maysar-backend | `maysar-dtn:latest` | 3000 | Main Express API |
| postgres | `postgres:15` | 5432 | Primary relational database |
| redis | `redis:7-alpine` | 6379 | Cache and session store |
| meilisearch | `getmeili/meilisearch:latest` | 7700 | Full-text search |
| mailpit | `axllent/mailpit:latest` | 1025, 8025 | SMTP testing |
| prometheus | `prom/prometheus:latest` | 9090 | Metrics collection |
| jaeger | `jaegertracing/all-in-one:latest` | 16686 | Distributed tracing |
| minio | `minio/minio:latest` | 9000 | S3-compatible object storage |
| postgres-backup | `postgres:15-alpine` | — | Scheduled database backups |
| redis-backup | `redis:7-alpine` | — | Scheduled Redis backups |

---

## 2. Prerequisites

### Host Requirements

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| CPU | 2 vCPUs | 4+ vCPUs |
| Memory | 4 GB | 8+ GB |
| Disk | 50 GB SSD | 100+ GB SSD |
| Docker | 20.10+ | 24+ |
| Docker Compose | 2.0+ | 2.20+ |
| Node.js | 18+ | 20+ |
| npm | 8+ | 10+ |

### Required Tools

Verify these are installed:

```bash
which docker docker-compose node npm git openssl
```

### Network Ports

| Service | Port | Access |
|---------|------|--------|
| maysar-backend | 3000 | Public (behind load balancer in prod) |
| PostgreSQL | 5432 | Internal only |
| Redis | 6379 | Internal only |
| Meilisearch | 7700 | Internal only |
| MinIO | 9000 | Internal only |
| Prometheus | 9090 | Internal/admin only |
| Jaeger | 16686 | Internal/admin only |
| Mailpit | 1025, 8025 | Dev/staging only |

---

## 3. Environment Configuration

### Environment Files

| File | Purpose |
|------|---------|
| `.env.example` | Template with all variables (no secrets) |
| `.env` | Development local overrides |
| `.env.staging` | Staging environment values |
| `.env.production` | Production environment values |

### Required Secrets

These must never be committed to Git. Inject via secrets manager or CI secrets:

| Variable | Description |
|----------|-------------|
| `POSTGRES_PASSWORD` | PostgreSQL superuser password |
| `JWT_SECRET` | JWT signing secret |
| `ENCRYPTION_KEY` | Application encryption key |
| `PII_ENCRYPTION_KEY` | PII field encryption key |
| `REDIS_PASSWORD` | Redis access password |
| `MEILI_MASTER_KEY` | Meilisearch master key |
| `SMTP_PASS` | Email SMTP password |
| `AFRICASTALKING_API_KEY` | SMS provider API key |
| `PAYMENT_SELCOM_*_API_KEY` | Payment gateway keys |
| `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` | AWS/S3 credentials |
| `BACKUP_ENCRYPTION_KEY` | Backup encryption key |

### Generate Encryption Key

```bash
openssl rand -base64 32
```

Copy the output into `BACKUP_ENCRYPTION_KEY` in your `.env` file.

### Create `.env`

```bash
cp .env.example .env
```

Edit `.env` and replace every `[SECRETS MANAGER]` placeholder with an actual value.

---

## 4. Infrastructure Provisioning

Maysar Express Backend is infrastructure-agnostic. You can deploy on any cloud provider, VPS, or bare metal that supports Docker Compose. Choose the option that fits your region and budget.

### 4.1 Supported Deployment Targets

| Option | Best For | Notes |
|--------|----------|-------|
| **Any VPS** (Hetzner, DigitalOcean, Linode, Vultr, etc.) | Small to medium production | Cheapest, simplest, full control |
| **AWS EC2** | AWS ecosystem | Use ECS, EC2, or Lightsail |
| **Azure VM** | Azure ecosystem | Use Azure Container Instances or VMs |
| **GCP Compute Engine** | GCP ecosystem | Use GKE or VMs |
| **Oracle Cloud** | Free tier ARM instances | If signup works in your region |
| **Self-hosted / Bare Metal** | Maximum control | Requires manual network/firewall setup |

### 4.2 Minimum Server Requirements

| Component | Minimum | Recommended (Production) |
|-----------|---------|--------------------------|
| CPU | 2 vCPUs | 4+ vCPUs |
| Memory | 4 GB | 8+ GB |
| Disk | 50 GB SSD | 100+ GB SSD |
| Docker | 20.10+ | 24+ |
| Docker Compose | 2.0+ | 2.20+ |

### 4.3 Server Preparation (Any Provider)

On your target server, install Docker and Docker Compose:

```bash
# Ubuntu/Debian
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose plugin (v2)
sudo apt-get update
sudo apt-get install -y docker-compose-plugin

# Verify
docker --version
docker compose version
```

### 4.4 Server Network Requirements

Open these ports on your server firewall:

| Port | Service | Access |
|------|---------|--------|
| 80 | HTTP (reverse proxy) | Public |
| 443 | HTTPS (reverse proxy) | Public |
| 3000 | maysar-backend | Public (or behind LB) |
| 5432 | PostgreSQL | Internal only |
| 6379 | Redis | Internal only |
| 7700 | Meilisearch | Internal only |
| 9000 | MinIO (dev) | Internal only |
| 9090 | Prometheus | Admin/internal only |

### 4.5 Example: Hetzner Cloud (Recommended Alternative to OCI)

If OCI signup is unavailable in your region, Hetzner Cloud is a reliable, low-cost alternative with ARM instances:

```bash
# Create a server (CX31 or CX41 recommended)
hcloud server create --name maysar-prod --type cx41 --image ubuntu-22.04 --location fsn1 --ssh-key <your-key>

# SSH in
ssh root@<server-ip>

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
```

### 4.6 Example: AWS EC2

```bash
# Launch an EC2 instance (t3.medium or larger)
# Ubuntu 22.04 LTS
# Security group: open 80, 443, 3000 (public); 5432, 6379, 7700 (VPC only)

# Connect and install Docker
sudo apt-get update
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
sudo usermod -aG docker $USER
```

### 4.7 Terraform (Optional)

If you prefer Terraform, the `infra/terraform/` directory contains OCI modules. You can adapt these to any provider by replacing the OCI provider with AWS, Azure, GCP, or Hetzner providers. Terraform is optional — Docker Compose works without it.

---

## 5. Docker Compose Deployment

### Development

```bash
cp .env.example .env
# Edit .env with local values

npm run infra:up
npx prisma generate
npx prisma migrate dev
npm run seed:dev-users
npm run dev

# Or start everything with Docker
docker compose up -d --build
```

### Staging

```bash
cp .env.staging.example .env.staging
# Edit .env.staging with staging values

npm run staging:preflight

docker compose --env-file .env.staging -f docker-compose.yml -f docker-compose.staging.yml up -d --build

npx prisma migrate deploy
npm run seed:staging
```

### Production

```bash
cp .env.production.example .env.production
# Edit .env.production with production values (ALL secrets required)

npm run production:preflight

docker compose --env-file .env.production -f docker-compose.yml -f docker-compose.prod.yml up -d --build

npx prisma migrate deploy
```

---

## 6. Database Setup

### Prisma Migrations

```bash
npx prisma generate
npx prisma migrate dev --name migration_name      # development
npx prisma migrate deploy                          # staging / production
npx prisma migrate reset                           # development only, destroys data
```

### Least-Privilege Database Roles

Create database roles using the SQL file in `config/database/least-privilege-roles.sql`. Run as PostgreSQL superuser:

```bash
psql -h <host> -p <port> -U postgres -d maysar -f config/database/least-privilege-roles.sql
```

**Roles created:**
- `maysar_app` — SELECT, INSERT, UPDATE, DELETE on tables; USAGE on sequences; no DDL
- `maysar_backup` — SELECT on tables; read-only for backups
- `maysar_monitor` — SELECT on `pg_stat_activity` and `pg_database`; health checks only

Update `DATABASE_URL` to use `maysar_app` instead of `postgres`:

```ini
DATABASE_URL=postgresql://maysar_app:<maysar_app_password>@postgres:5432/maysar?schema=public
```

---

## 7. Backup System Setup

Maysar includes automated backup for PostgreSQL and Redis. Backups are encrypted client-side and stored on volumes independent from live data.

### Backup Components

| Component | Method | Frequency | Retention |
|-----------|--------|-----------|-----------|
| PostgreSQL logical dump | `pg_dump -Fc` | Hourly | 7 days (dev), 30 days (prod) |
| PostgreSQL physical backup | pgBackRest base + WAL archive | Hourly | 30 days |
| Redis RDB snapshot | `BGSAVE` + gzip | Hourly | 7 days |
| Offsite storage | S3-compatible (STANDARD_IA) | Hourly | Configurable |

### Backup Configuration

Set these variables in `.env` (or `.env.staging` / `.env.production`):

```ini
POSTGRES_BACKUP_RETENTION_DAYS=7
REDIS_BACKUP_RETENTION_DAYS=7
BACKUP_S3_BUCKET=                          # Optional: S3 bucket for offsite storage
BACKUP_ENCRYPTION_KEY=                     # Required: generate with openssl rand -base64 32
AWS_ACCESS_KEY_ID=                         # Required if using S3
AWS_SECRET_ACCESS_KEY=                     # Required if using S3
AWS_DEFAULT_REGION=us-east-1
```

### Generate Encryption Key

```bash
openssl rand -base64 32
```

Copy the output into `BACKUP_ENCRYPTION_KEY` in your `.env` file.

### Verify pgBackRest Configuration

The file `config/pgbackrest.conf` configures physical backups and WAL archiving. Ensure it is mounted in the `postgres` service:

```yaml
# docker-compose.prod.yml, postgres service:
volumes:
  - ./config/pgbackrest.conf:/etc/pgbackrest.conf:ro
  - wal_archive:/var/lib/postgresql/wal_archive
```

And mounted in the `postgres-backup` service:

```yaml
# docker-compose.prod.yml, postgres-backup service:
volumes:
  - pgbackrest_repo:/var/lib/pgbackrest:rw
```

### First Backup and Restore Test

```bash
# Run a manual backup
PGPASSWORD=<backup_password> \
ENCRYPTION_KEY=<backup_encryption_key> \
sh scripts/backup/postgres-backup.sh

# Verify the backup is restorable
ENCRYPTION_KEY=<backup_encryption_key> \
sh scripts/backup/postgres-restore-verify.sh /backups/postgres/<latest-backup-file>
```

Detailed backup procedures are documented in `BACKUP_SETUP_INSTRUCTIONS.md`.

---

## 8. Cache & Search Setup

### Redis

Redis is used for caching and session storage. It requires a password configured via `REDIS_PASSWORD`.

**Verify Redis is running:**
```bash
redis-cli -h localhost -p 6379 -a <REDIS_PASSWORD> ping
# Should return: PONG
```

### Meilisearch

Meilisearch provides full-text search. It requires a master key configured via `MEILI_MASTER_KEY`.

**Verify Meilisearch is running:**
```bash
curl -f http://localhost:7700/health
# Should return: {"status":"available"}
```

### Search Index Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `SEARCH_PROVIDER` | Search backend | `meilisearch` |
| `MEILISEARCH_HOST` | Meilisearch host | `meilisearch` |
| `MEILISEARCH_PORT` | Meilisearch port | `7700` |
| `MEILISEARCH_PROTOCOL` | Protocol | `http` |
| `MEILISEARCH_INDEX_NAME` | Default index name | `catalog` |

---

## 9. Object Storage Setup

### Development (MinIO)

MinIO provides S3-compatible object storage locally. It is included in `docker-compose.yml`.

**Verify MinIO is running:**
```bash
curl -f http://localhost:9000/minio/health/live
```

**MinIO Console:** http://localhost:9001

Credentials: `MINIO_ROOT_USER` / `MINIO_ROOT_PASSWORD` from `.env`.

### Staging & Production (AWS S3)

For staging and production, configure AWS S3 credentials:

```ini
S3_ENDPOINT=                              # Leave empty for AWS S3
S3_PUBLIC_ENDPOINT=                       # Browser/CDN-reachable URL
S3_REGION=us-east-1
S3_ACCESS_KEY_ID=                         # From secrets manager
S3_SECRET_ACCESS_KEY=                     # From secrets manager
S3_BUCKET_CHAT_MEDIA=chat-media
S3_BUCKET_PRODUCT_MEDIA=product-media
S3_FORCE_PATH_STYLE=false                 # false for AWS S3, true for MinIO
```

**Create required buckets:**
```bash
aws s3 mb s3://chat-media --region us-east-1
aws s3 mb s3://product-media --region us-east-1
```

### Media Upload Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `STORAGE_BUCKET` | Default bucket name | `maysar-files` |
| `MAX_FILE_SIZE` | Max upload size in bytes | `10485760` (10 MB) |

---

## 10. Monitoring & Observability

### Prometheus Configuration

Metrics are scraped from:
- `maysar-backend:3000` — Application metrics (`/metrics` endpoint)
- `payment-service:3001` — Payment service metrics

Alert rules are defined in `infra/prometheus/alert-rules.yml`:

| Alert | Condition | Severity |
|-------|-----------|----------|
| `PaymentFailureRateHigh` | Failed payment rate > 5% | Critical |
| `PaymentReconciliationDrift` | Reconciliation metric absent | Warning |
| `DBConnectionPoolExhausted` | DB errors > 10 | Critical |
| `PodRestartSurge` | > 3 restarts in 15 min | Warning |
| `HTTPErrorRateHigh` | 5xx rate > 2% | Warning |
| `BackupFailure` | Backup success == 0 for 10m | Critical |
| `BackupDiskUsageHigh` | Backup disk free < 20% | Warning |
| `RestoreVerificationStale` | No successful verify in 7 days | Critical |

### Tracing

Distributed tracing via Jaeger:
- Endpoint: `http://jaeger:14268/api/traces`
- Service name: `maysar-monolith`
- OpenTelemetry OTLP endpoint: `http://jaeger:4318`

### Health Checks

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Basic application health |
| `/api/health/ready` | GET | Readiness probe (DB, Redis, Meilisearch) |
| `/api/health/live` | GET | Liveness probe |

### Metrics Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `METRICS_ENABLED` | Enable metrics endpoint | `true` |
| `LOG_LEVEL` | Application log level | `info` |
| `LOG_FORMAT` | Log output format | `json` |
| `SENTRY_DSN` | Error tracking DSN | (from secrets manager) |

---

## 11. CI/CD Pipeline

### GitHub Actions Workflows

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| `ci.yml` | PR/push to dev/staging/prod | Quality gates (lint, tests, typecheck) |
| `deploy-staging.yml` | CI success on staging | Deploy to staging environment |
| `deploy-production.yml` | Push to prod branch | Deploy to production environment |
| `event-validation.yml` | — | Event validation |
| `secrets-scan.yml` | — | Secret leakage scanning |

### CI Quality Gates

1. **Checkout** — Get source code
2. **Setup Node.js** — Version 20 with npm cache
3. **Install dependencies** — `npm ci`
4. **Generate Prisma client** — `npx prisma generate`
5. **Lint** — `npm run lint` (non-blocking on staging)
6. **Tests** — Contract tests, integration tests, constitution audits

### Deployment Flow

```
Code Push → CI Quality Gates → (staging: Deploy Staging) → (prod: Deploy Production)
                                                        ↓
                                               Health Check Verification
```

### Required CI Secrets

| Secret | Description |
|--------|-------------|
| `ENV_FILE` | Base64-encoded `.env.staging` or `.env.production` contents |
| `SSH_PRIVATE_KEY` | SSH key for deployment host |
| `SSH_HOST` | Deployment host address |
| `SSH_PORT` | SSH port (default: 22) |
| `SSH_USER` | SSH username |
| `DEPLOY_PATH` | Deployment path on host |
| `HEALTHCHECK_URL` | Production health check URL |
| `DOCKER_USERNAME` | Docker registry username |
| `OCI_*` | Oracle Cloud Infrastructure credentials |

---

## 12. Deployment Procedures

### Local Development

```bash
# 1. Clone repository
git clone https://github.com/maysar-014/maysar-express-backend.git
cd maysar-express-backend

# 2. Install dependencies
npm ci

# 3. Create environment file
cp .env.example .env
# Edit .env with local values

# 4. Start infrastructure
npm run infra:up

# 5. Generate Prisma client and run migrations
npx prisma generate
npx prisma migrate dev

# 6. Seed data (optional)
npm run seed:dev-users

# 7. Start application
npm run dev
```

### Staging Deployment (Manual)

```bash
# 1. Prepare environment
cp .env.staging.example .env.staging
# Edit with staging values

# 2. Run preflight
npm run staging:preflight

# 3. Deploy
docker compose --env-file .env.staging -f docker-compose.yml -f docker-compose.staging.yml up -d --build

# 4. Run migrations
npx prisma migrate deploy

# 5. Seed staging data
npm run seed:staging

# 6. Verify health
curl -f http://<staging-host>:3000/api/health
```

### Production Deployment (Manual)

```bash
# 1. Prepare environment
cp .env.production.example .env.production
# Edit with production values (ALL secrets required)

# 2. Run preflight
npm run production:preflight

# 3. Deploy
docker compose --env-file .env.production -f docker-compose.yml -f docker-compose.prod.yml up -d --build

# 4. Run migrations
npx prisma migrate deploy

# 5. Verify health
curl -f http://<prod-host>:3000/api/health
```

### Remote Deployment (via SSH)

Used by CI/CD for staging and production:

```bash
bash scripts/deploy/remote-compose-deploy.sh <environment>
```

---

## 13. Post-Deployment Verification

After any deployment, verify all services:

```bash
# 1. Application health
curl -f http://<host>:3000/api/health

# 2. Database connectivity
PGPASSWORD=<password> psql -h <host> -p <port> -U <user> -d <db> -c "SELECT 1;"

# 3. Redis connectivity
redis-cli -h <host> -p <port> -a <password> ping

# 4. Meilisearch health
curl -f http://<host>:7700/health

# 5. MinIO health (dev)
curl -f http://<host>:9000/minio/health/live

# 6. Backup service health
docker compose logs postgres-backup | tail -20

# 7. Run backup verification (weekly)
ENCRYPTION_KEY=<key> sh scripts/backup/postgres-restore-verify.sh <backup-file>
```

**Deployment is complete only when all health checks pass.**

---

## 14. Security Checklist

| Item | Description | Status |
|------|-------------|--------|
| No secrets in Git | Verify `.env`, `.env.*` are in `.gitignore` | [ ] |
| Least-privilege DB roles | Application uses `maysar_app`, not `postgres` | [ ] |
| Encryption keys in secrets manager | `BACKUP_ENCRYPTION_KEY`, `PII_ENCRYPTION_KEY`, etc. | [ ] |
| JWT secret is strong | Minimum 32 random bytes | [ ] |
| Payment keys are environment-scoped | Sandbox ≠ Live credentials | [ ] |
| Container security | `no-new-privileges:true`, `cap_drop: ALL` | [ ] |
| Network segmentation | Database not exposed to public internet | [ ] |
| Backup encryption | Client-side AES-256-CBC + PBKDF2 | [ ] |
| Backup key custody | Keys stored separately from backups | [ ] |

---

## 15. Troubleshooting

| Problem | Likely Cause | Solution |
|---------|--------------|----------|
| Container won't start | Missing environment variable | Check `.env` for required values |
| Database connection refused | PostgreSQL not healthy | Check `docker compose logs postgres` |
| Redis connection refused | Wrong password | Verify `REDIS_PASSWORD` matches |
| Migration fails | Schema conflict | Check `prisma/schema.prisma` vs migration history |
| Backup fails | Missing pgbackrest or openssl | Install dependencies |
| S3 upload fails | Wrong credentials or bucket | Verify AWS credentials and bucket name |
| High memory usage | Node heap too small | Adjust `NODE_OPTIONS` `--max-old-space-size` |
| Payment in sandbox when live expected | `PAYMENT_*_MODE` set to `sandbox` | Change to `live` with live credentials |
| Meilisearch not responding | Master key mismatch | Verify `MEILI_MASTER_KEY` matches on both sides |
| MinIO upload fails | Access key/secret mismatch | Verify `MINIO_ROOT_USER` and `MINIO_ROOT_PASSWORD` |

---

## 16. Maintenance Schedule

| Frequency | Task | Owner |
|-----------|------|-------|
| **Daily** | Verify backup success, check alerts | On-call engineer |
| **Weekly** | Automated restore verification (cron) | System |
| **Quarterly** | Full restore drill, measure RPO/RTO | Engineering team |
| **Every 90 days** | Rotate encryption keys, review passwords | Security engineer |
| **Annually** | Review retention policy, disaster recovery plan | Engineering lead |

---

## 17. Related Documents

| Document | Purpose |
|----------|---------|
| `MAYSAR_INFRASTRUCTURE_CONSTITUTION.md` | Governing engineering principles and standards |
| `MAYSAR_BACKUP_GAP_ANALYSIS.md` | Gap analysis and remediation roadmap |
| `BACKUP_SETUP_INSTRUCTIONS.md` | Step-by-step backup system setup (8 phases) |
| `BACKUP_SYSTEM_GUIDE.md` | Complete operational reference for backup system |
| `config/database/least-privilege-roles.sql` | Database role definitions |
| `config/database/operations-runbook.md` | Daily operations and incident response |
| `config/database/restore-drill-runbook.md` | Quarterly restore drill procedure |
| `config/pgbackrest.conf` | pgBackRest configuration |
| `.env.example` | Environment variable template |
| `docker-compose.yml` | Development service definitions |
| `docker-compose.prod.yml` | Production service definitions |
| `docker-compose.staging.yml` | Staging service overrides |
| `prisma/schema.prisma` | Database schema definition |
| `infra/terraform/` | OCI infrastructure as code |

---

**End of Document**

*This guide is a living document. Update it whenever infrastructure, deployment procedures, or environment variables change.*
