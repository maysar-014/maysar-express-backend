# Maysar Express Backend — Production Deployment Guide

**Document ID:** MAYSAR-DEPLOY-002  
**Version:** 2.0  
**Status:** Production-Ready  
**Owner:** Maysar Engineering  
**Applies to:** Production deployment of Maysar Express Backend  
**Classification:** Internal — Engineering Operations

---

## Table of Contents

1. [Overview](#1-overview)
2. [Architecture Overview](#2-architecture-overview)
3. [Infrastructure Provisioning](#3-infrastructure-provisioning)
4. [Environment Configuration](#4-environment-configuration)
5. [Docker Compose Production Deployment](#5-docker-compose-production-deployment)
6. [Reverse Proxy & TLS Termination](#6-reverse-proxy--tls-termination)
7. [Process Management (systemd)](#7-process-management-systemd)
8. [Database Setup](#8-database-setup)
9. [Cache & Search Setup](#9-cache--search-setup)
10. [Object Storage Setup](#10-object-storage-setup)
11. [Backup System Setup](#11-backup-system-setup)
12. [Monitoring & Observability](#12-monitoring--observability)
13. [CI/CD Pipeline](#13-ci-cd-pipeline)
14. [Deployment Procedures](#14-deployment-procedures)
15. [Post-Deployment Verification](#15-post-deployment-verification)
16. [Security Checklist](#16-security-checklist)
17. [Troubleshooting](#17-troubleshooting)
18. [Maintenance Schedule](#18-maintenance-schedule)
19. [Related Documents](#19-related-documents)

---

## 1. Overview

Maysar Express Backend is a Node.js/TypeScript monolithic API serving an enterprise e-commerce platform. This guide covers production deployment from infrastructure provisioning through application deployment, monitoring, and operational procedures.

### Supported Environments

| Environment | Purpose | Compose File |
|-------------|---------|-------------|
| Development | Local development & testing | `docker-compose.yml` |
| Staging | Pre-production validation | `docker-compose.yml` + `docker-compose.staging.yml` |
| Production | Live customer traffic | `docker-compose.yml` + `docker-compose.prod.yml` |

---

## 2. Architecture Overview

```
┌─────────────────┐      ┌──────────────────┐      ┌─────────────────┐
│   Client (HTTPS)│─────▶│   Nginx Proxy    │─────▶│   Maysar Backend│
│                 │      │   (Port 80/443)  │      │   (Port 3000)   │
└─────────────────┘      └──────────────────┘      └─────────────────┘
                                               │
                                               ▼
                    ┌─────────────────┐      ┌─────────────────┐
                    │   PostgreSQL    │      │     Redis       │
                    │   (Port 5432)   │      │   (Port 6379)   │
                    └─────────────────┘      └─────────────────┘
                                               │
                                               ▼
                    ┌─────────────────┐      ┌─────────────────┐
                    │   Meilisearch   │      │     MinIO       │
                    │   (Port 7700)   │      │   (Port 9000)   │
                    └─────────────────┘      └─────────────────┘
```

---

## 3. Infrastructure Provisioning

Maysar is infrastructure-agnostic. Deploy on any VPS, cloud provider, or bare metal that supports Docker Compose.

### Minimum Server Requirements

| Component | Minimum | Recommended (Production) |
|-----------|---------|--------------------------|
| CPU | 2 vCPUs | 4+ vCPUs |
| Memory | 4 GB | 8+ GB |
| Disk | 50 GB SSD | 100+ GB SSD |
| Docker | 20.10+ | 24+ |
| Docker Compose | 2.0+ | 2.20+ |
| Node.js | 18+ | 20+ |
| npm | 8+ | 10+ |

### Required Tools

```bash
which docker docker-compose node npm git openssl
```

### Network Ports

| Service | Port | Protocol | Access |
|---------|------|----------|--------|
| maysar-backend | 3000 | HTTP | Internal (behind Nginx) |
| Nginx | 80/443 | HTTP/HTTPS | Public |
| PostgreSQL | 5432 | TCP | Internal only |
| Redis | 6379 | TCP | Internal only |
| Meilisearch | 7700 | HTTP | Internal only |
| MinIO | 9000 | HTTP | Internal only |
| Prometheus | 9090 | HTTP | Internal/admin only |

---

## 4. Environment Configuration

### Environment Files

| File | Purpose | Contains Secrets? |
|------|---------|-------------------|
| `.env.example` | Template with all variables | No (placeholders only) |
| `.env` | Development local overrides | Yes — never commit |
| `.env.staging` | Staging environment values | Yes — CI secret only |
| `.env.production` | Production environment values | Yes — CI secret only |

### Creating `.env.production`

```bash
cp .env.example .env.production
# Edit .env.production with production values (ALL secrets required)
```

### Required Secrets (Never Commit to Git)

| Variable | Description | Source |
|----------|-------------|--------|
| `POSTGRES_PASSWORD` | PostgreSQL superuser password | Secrets Manager |
| `JWT_SECRET` | JWT signing secret | Secrets Manager |
| `ENCRYPTION_KEY` | Application encryption key (32 bytes) | Secrets Manager |
| `PII_ENCRYPTION_KEY` | PII field encryption key | Secrets Manager |
| `REDIS_PASSWORD` | Redis access password | Secrets Manager |
| `MEILI_MASTER_KEY` | Meilisearch master key | Secrets Manager |
| `SMTP_PASS` | Email SMTP password | Secrets Manager |
| `SMS_API_KEY` | SMS provider API key | Secrets Manager |
| `PAYMENT_API_KEY` | Payment gateway keys | Secrets Manager |
| `S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY` | S3-compatible storage credentials | Secrets Manager |
| `BACKUP_ENCRYPTION_KEY` | Backup encryption key | Secrets Manager |
| `MAP_API_KEY` / `MAP_API_KEY` | Map API keys | Secrets Manager |
| `PUSH_ENCRYPTION_KEY` | Push notification key | Secrets Manager |
| `SENTRY_DSN` | Error tracking DSN | Secrets Manager |

### Generate Encryption Keys

```bash
# Backup encryption key
openssl rand -base64 32

# JWT secret
openssl rand -base64 32

# PII encryption key
openssl rand -base64 32
```

---

## 5. Docker Compose Production Deployment

### Production Deployment Commands

```bash
# 1. Copy production environment template
cp .env.production.example .env.production

# 2. Edit .env.production with production values (ALL secrets required)
nano .env.production

# 3. Run preflight checks
npm run production:preflight

# 4. Deploy with Docker Compose
docker compose --env-file .env.production -f docker-compose.yml -f docker-compose.prod.yml up -d --build

# 5. Run database migrations
npx prisma migrate deploy

# 6. Verify health
curl -f http://localhost:3000/api/health
```

### Docker Compose Production Services

| Service | Image | Port | Purpose |
|---------|-------|------|---------|
| maysar-backend | Custom build | 3000 | Main Express API |
| postgres | postgres:15 | 5432 | Primary database |
| redis | redis:7-alpine | 6379 | Cache and session store |
| meilisearch | getmeili/meilisearch:latest | 7700 | Full-text search |
| object-storage | minio/minio:latest | 9000 | Object storage |
| postgres-backup | postgres:15-alpine | — | Scheduled backups |
| redis-backup | redis:7-alpine | — | Scheduled Redis backups |
| prometheus | prom/prometheus:latest | 9090 | Metrics collection |
| jaeger | jaegertracing/all-in-one:latest | 16686 | Distributed tracing |

---

## 6. Reverse Proxy & TLS Termination (Nginx)

### Nginx Configuration

Create `docker-compose.prod.yml` with nginx service:

```yaml
  nginx:
    image: nginx:1.25-alpine
    restart: unless-stopped
    depends_on:
      maysar-backend:
        condition: service_healthy
    networks:
      - maysar-network
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./config/nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./config/nginx/conf.d:/etc/nginx/conf.d:ro
      - ./certbot/conf:/etc/letsencrypt:ro
      - ./certbot/www:/var/www/certbot:ro
    deploy:
      resources:
        limits:
          cpus: '0.5'
          memory: 256M
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:80/health"]
      interval: 30s
      timeout: 5s
      retries: 3
```

### Nginx Configuration (`config/nginx/nginx.conf`)

```nginx
user nginx;
worker_processes auto;
error_log /var/log/nginx/error.log warn;
pid /var/run/nginx.pid;

events {
    worker_connections 1024;
    use epoll;
    multi_accept on;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for"';

    access_log /var/log/nginx/access.log main;

    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;
    server_tokens off;

    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_buffers 16 8k;
    gzip_http_version 1.1;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

    include /etc/nginx/conf.d/*.conf;
}
```

**`config/nginx/conf.d/maysar.conf`:**

```nginx
# Rate limiting zones
limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
limit_req_zone $binary_remote_addr zone=auth:10m rate=5r/m;

# Upstream to Maysar backend
upstream maysar_backend {
    server maysar-backend:3000;
    keepalive 32;
}

# HTTP → HTTPS redirect
server {
    listen 80;
    server_name _;
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }
    location / {
        return 301 https://$host$request_uri;
    }
}

# HTTPS server
server {
    listen 443 ssl http2;
    server_name _;

    # SSL configuration (certbot-managed)
    ssl_certificate /etc/letsencrypt/live/maysar.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/maysar.example.com/privkey.pem;
    ssl_trusted_certificate /etc/letsencrypt/live/maysar.example.com/chain.pem;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;
    ssl_ciphers 'ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256';
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 1d;
    ssl_session_tickets off;

    # HSTS
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;

    # Security headers
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Content-Security-Policy "default-src 'self'; img-src 'self' data: https:; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self' wss:; font-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none';" always;

    # API routes
    location /api/ {
        proxy_pass http://maysar_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 60s;
        proxy_connect_timeout 10s;
        proxy_send_timeout 60s;
        limit_req zone=api burst=20 nodelay;
    }

    # Auth endpoints - stricter rate limiting
    location /api/auth/ {
        proxy_pass http://maysar_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 60s;
        proxy_connect_timeout 10s;
        proxy_send_timeout 60s;
        limit_req zone=auth burst=5 nodelay;
    }

    # Health check (no rate limit)
    location /health {
        proxy_pass http://maysar_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        access_log off;
    }

    # Static assets
    location /assets/ {
        proxy_pass http://maysar_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_valid 200 1d;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }

    # Deny access to hidden files
    location ~ /\.(?!well-known) {
        deny all;
    }

    # Deny access to sensitive files
    location ~ \.(env|git|sql|sql.gz|sql.gz.enc|bak|log)$ {
        deny all;
    }
}
```

---

## 7. Process Management (systemd)

### Systemd Service Unit

Create `/etc/systemd/system/maysar-backend.service`:

```ini
[Unit]
Description=Maysar Express Backend
After=network.target postgresql.service redis.service meilisearch.service
Requires=postgresql.service redis.service meilisearch.service

[Service]
Type=simple
User=maysar
Group=maysar
WorkingDirectory=/opt/maysar
EnvironmentFile=/opt/maysar/.env.production
ExecStart=/usr/bin/node dist/main.js
ExecReload=/bin/kill -HUP $MAINPID
ExecStop=/bin/kill -TERM $MAINPID
Restart=always
RestartSec=5
StartLimitInterval=0
RestartSec=10

# Security
NoNewPrivileges=true
ProtectSystem=full
ProtectHome=true
PrivateTmp=true
ReadWritePaths=/opt/maysar/logs /opt/maysar/uploads
CapabilityBoundingSet=
AmbientCapabilities=
MemoryDenyWriteExecute=true

# Resource limits
LimitNOFILE=65536
LimitNPROC=32768

[Install]
WantedBy=multi-user.target
```

### Systemd Service for Backup

```ini
# /etc/systemd/system/maysar-backup.service
[Unit]
Description=Maysar Backup Service
After=postgresql.service redis.service
Requires=postgresql.service redis.service

[Service]
Type=oneshot
User=maysar-backup
Group=maysar-backup
EnvironmentFile=/opt/maysar/.env.production
ExecStart=/opt/maysar/scripts/backup/postgres-backup.sh

[Install]
WantedBy=multi-user.target
```

```ini
# /etc/systemd/system/maysar-backup.timer
[Unit]
Description=Maysar Backup Timer

[Timer]
OnCalendar=hourly
Persistent=true

[Install]
WantedBy=timers.target
```

### Enable Services

```bash
# Enable and start services
systemctl daemon-reload
systemctl enable maysar-backend
systemctl start maysar-backend
systemctl enable maysar-backup.timer
systemctl start maysar-backup.timer
```

---

## 8. Database Setup

### Prisma Migrations

```bash
# Generate Prisma client
npx prisma generate

# Apply migrations to production
npx prisma migrate deploy

# Verify schema
npx prisma validate
```

### Least-Privilege Database Roles

Create roles using `config/database/least-privilege-roles.sql`:

```bash
psql -h <host> -p <port> -U postgres -d maysar -f config/database/least-privilege-roles.sql
```

Update `DATABASE_URL` to use `maysar_app`:

```ini
DATABASE_URL=postgresql://maysar_app:<maysar_app_password>@postgres:5432/maysar?schema=public
```

---

## 8a. Seed Data & Configuration (Required Before First Order)

> **This section is mandatory.** The application will start and serve requests without these seeds, but several critical features will silently degrade or be entirely non-functional. Run every seed in the order listed below after `prisma migrate deploy`.

All seed scripts are idempotent: re-running them is safe and will not create duplicates.

---

### Seed Execution Order

```bash
# Run all required seeds in this exact order after migrations complete.
# Any seed marked REQUIRED must complete successfully before accepting live orders.

# ── 1. Delivery Pricing Configuration ────────────────────────────────────────
# REQUIRED. Seeds Logistics_PricingConfig v2 (strategy-aware pricing model).
# Without this, POST /api/logistics/v1/quote returns 500 (no active config).
# Also sets payment processing rates (mobileMoneyProcessingRatePct,
# cardProcessingRatePct, codProcessingRatePct) for financial feasibility.
npx tsx scripts/seed-pricing-config.ts

# ── 2. Vehicle & Tariff ───────────────────────────────────────────────────────
# REQUIRED. Seeds the standard Dar es Salaam motorcycle vehicle and its
# operating tariff. Without this, all delivery quotes use the interim
# 11-stage pipeline with mock driver compensation rates, and the
# FinancialFeasibilityEngine classifies every delivery as UNVERIFIED.
# This also activates Enabler_Earning qualification on OrderDelivered.
npx tsx scripts/seed-vehicle-tariff.ts

# ── 3. Product Categories & Attributes ───────────────────────────────────────
# REQUIRED. Seeds catalog_categories and catalog_category_attributes.
# Without this, sellers cannot create products (category FK constraint).
npx tsx scripts/seed-category-attributes.ts

# ── 4. Training Modules (Courier Certification) ───────────────────────────────
# REQUIRED for courier operations. Seeds training modules required for
# courier certification gating. Without this, the training/certification
# lifecycle (LC-26) cannot complete and couriers may be blocked.
npx tsx scripts/seed-training.ts

# ── 5. Test/Seed Users ────────────────────────────────────────────────────────
# REQUIRED for staging; OPTIONAL for production (use real user registration).
# Seeds the four seeded test accounts (admin, buyer, seller, courier) used
# by the lifecycle verification script and Playwright E2E tests.
# DO NOT run in production unless you intentionally want test accounts.
# Production: skip this step and register real users through the API.
npx tsx scripts/seed-dev-users.ts       # development only
# npx tsx scripts/seed-e2e-users.ts    # for E2E test environments only

# ── 6. Sample Products (Staging/Development only) ────────────────────────────
# OPTIONAL (staging/dev only). Seeds sample products for testing checkout.
# DO NOT run in production.
# npx tsx scripts/seed-products.ts
# npx tsx scripts/seed-seller-business.ts
```

---

### Seed Script Reference

| Script | Required? | Env | Description |
|--------|-----------|-----|-------------|
| `seed-pricing-config.ts` | **REQUIRED** | All | Delivery pricing config v2 — without this, quotes fail |
| `seed-vehicle-tariff.ts` | **REQUIRED** | All | Motorcycle vehicle + tariff v1 — activates real driver compensation and feasibility gate |
| `seed-category-attributes.ts` | **REQUIRED** | All | Product category hierarchy and attribute definitions |
| `seed-training.ts` | **REQUIRED** | All | Courier training modules for certification gating |
| `seed-dev-users.ts` | REQUIRED (dev/staging) | Dev, Staging | Test accounts for lifecycle verification and E2E tests |
| `seed-e2e-users.ts` | OPTIONAL | E2E envs | Additional E2E test users (Playwright) |
| `seed-playwright-wallets.ts` | OPTIONAL | E2E envs | Pre-funds test wallets for Playwright test suites |
| `seed-products.ts` | OPTIONAL | Dev, Staging | Sample product catalog for testing |
| `seed-seller-business.ts` | OPTIONAL | Dev, Staging | Sample seller business registrations |
| `seed-cod-trust-scores.ts` | OPTIONAL | Dev, Staging | Seed initial COD trust scores for test buyers |
---

### What breaks without each required seed

| Missing seed | Symptom |
|-------------|---------|
| `seed-pricing-config.ts` | `POST /api/logistics/v1/quote` → 500 (`No active pricing config found`) |
| `seed-vehicle-tariff.ts` | Quotes succeed but classify as `UNVERIFIED`; `Enabler_Earning` stays at `ATTRIBUTED` permanently; monthly economics report cannot distinguish profitable from loss-making deliveries |
| `seed-category-attributes.ts` | `POST /api/catalog/v1/products` → 400 (`categoryId FK violation`) |
| `seed-training.ts` | Courier training lifecycle (LC-26) returns empty module list; couriers cannot complete certification |

---

### Post-Seed Verification

After running all required seeds, verify the critical data exists:

```bash
# 1. Active pricing config
curl -s http://localhost:3000/api/logistics/v1/quote \
  -X POST \
  -H "Authorization: Bearer <buyer_token>" \
  -H "Content-Type: application/json" \
  -d '{"originLat":-6.8197,"originLng":39.2805,"originAddress":"Kariakoo","destinationLat":-6.8,"destinationLng":39.25,"destinationAddress":"Mikocheni","packageWeightKg":1}' \
  | python -m json.tool
# Expect: { "data": { "status": "ACTIVE", "deliveryFee": >0 } }

# 2. Vehicle tariff active (three-engine pipeline)
# A quote with a VehicleTariff active will have breakdown.engineVersion = "three-engine-v1"
# and breakdown.feasibility.classification will be PROFITABLE, BREAK_EVEN, or SUBSIDIZED
# (never UNVERIFIED for the payment cost component).

# 3. Categories exist
curl -s http://localhost:3000/api/catalog/v1/categories \
  -H "Authorization: Bearer <buyer_token>" \
  | python -m json.tool
# Expect: array of category objects

# 4. Run lifecycle verification script
node scripts/verification/run-lifecycle-checks.mjs
# Expect: 191 passed, 0 failed, 100% pass rate

# 5. Verify delivery economics report endpoint (MYS-DEL-001 Article 38)
# Replace <admin_token> with a valid admin JWT
YEAR=$(date +%Y); MONTH=$(date +%-m)
curl -s "http://localhost:3000/api/logistics/api/v1/admin/delivery-economics/monthly-report?year=${YEAR}&month=${MONTH}" \
  -H "Authorization: Bearer <admin_token>" \
  | python -m json.tool
# Expect: { "data": { "isPreLaunch": true, "dataLimitations": [...], "correctiveActions": [...] } }
# "isPreLaunch: true" is correct on first deployment — it means no ledger data yet.
# After the first order is delivered, re-run to see real metrics.
```

---

### Pricing Configuration Update (Post-Launch)

To update delivery pricing after launch (rate changes, new corridors):

```bash
# Edit scripts/seed-pricing-config.ts with new rates
# Then run — it performs updateMany on the existing v2 config
npx tsx scripts/seed-pricing-config.ts
# Note: this bumps the config in-place; the version number stays at 2.
# To create a new version (v3), change `version: 2` to `version: 3` in the script.
```

To update vehicle tariff rates (driver cost changes):

```bash
# Edit scripts/seed-vehicle-tariff.ts with new rates
# A new run will create Tariff v2 (the script auto-increments version)
# and deactivate the previous version.
npx tsx scripts/seed-vehicle-tariff.ts
# Old version is kept read-only for historical order reproducibility.
```

---

---

## 9. Cache & Search Setup

### Redis

Redis is used for caching and session storage. Requires `REDIS_PASSWORD`.

**Verify Redis is running:**
```bash
redis-cli -h localhost -p 6379 -a <REDIS_PASSWORD> ping
# Should return: PONG
```

### Meilisearch

Meilisearch provides full-text search. Requires `MEILI_MASTER_KEY`.

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

## 10. Object Storage Setup

### Development (S3-compatible object storage)

S3-compatible object storage is included in `docker-compose.yml`.

**Verify MinIO is running:**
```bash
curl -f http://localhost:9000/minio/health/live
```

**Object Storage Console:** http://localhost:9001

Credentials: `S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY` from `.env`.

### Staging & Production (S3-compatible object storage)

Configure S3-compatible storage credentials:

```ini
S3_ENDPOINT=                              # Leave empty for S3-compatible storage
S3_PUBLIC_ENDPOINT=                       # Browser/CDN-reachable URL
S3_REGION=<your-region>
S3_ACCESS_KEY_ID=                         # From secrets manager
S3_SECRET_ACCESS_KEY=                     # From secrets manager
S3_BUCKET_CHAT_MEDIA=<chat-media-bucket>
S3_BUCKET_PRODUCT_MEDIA=<product-media-bucket>
S3_FORCE_PATH_STYLE=false                 # false for S3-compatible, true for MinIO-compatible
```

**Create required buckets:**

```bash
# Create buckets using your S3-compatible provider CLI:
# Example: s3cmd mb s3://chat-media (or equivalent CLI for your provider)
```

### Media Upload Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `STORAGE_BUCKET` | Default bucket name | `maysar-files` |
| `MAX_FILE_SIZE` | Max upload size in bytes | `10485760` (10 MB) |

---

## 11. Backup System Setup

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
S3_ACCESS_KEY_ID=                         # Required if using S3
S3_SECRET_ACCESS_KEY=                     # Required if using S3
S3_REGION=<your-region>
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

### Run First Backup and Restore Test

```bash
# Run a manual backup
PGPASSWORD=<backup_password> \
ENCRYPTION_KEY=<backup_encryption_key> \
sh scripts/backup/postgres-backup.sh

# Verify the backup is restorable
ENCRYPTION_KEY=<backup_encryption_key> \
sh scripts/backup/postgres-restore-verify.sh /backups/postgres/<latest-backup-file>
```

Detailed backup procedures are documented in `BACKUP_SETUP_INSTRUCTIONS.md` and `BACKUP_SYSTEM_GUIDE.md`.

---

## 12. Monitoring & Observability

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
| `RestoreVerificationStale` | No successful verification in 7 days | Critical |

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

## 13. CI/CD Pipeline

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
| `S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY` | Object storage credentials |

---

## 14. Deployment Procedures

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

# 6. Run required seeds (see Section 8a for full details)
npx tsx scripts/seed-pricing-config.ts       # delivery pricing + payment rates
npx tsx scripts/seed-vehicle-tariff.ts       # driver tariff
npx tsx scripts/seed-category-attributes.ts  # product categories
npx tsx scripts/seed-training.ts             # courier training modules
npx tsx scripts/seed-dev-users.ts            # test accounts (dev only)

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

# 5. Run required seeds (see Section 8a for full details)
npx tsx scripts/seed-pricing-config.ts    # REQUIRED: delivery pricing + payment rates
npx tsx scripts/seed-vehicle-tariff.ts    # REQUIRED: driver tariff, activates feasibility gate
npx tsx scripts/seed-category-attributes.ts  # REQUIRED: product categories
npx tsx scripts/seed-training.ts              # REQUIRED: courier training modules

# 6. Verify health
curl -f http://<prod-host>:3000/api/health

# 7. Run lifecycle verification
node scripts/verification/run-lifecycle-checks.mjs

# 8. Verify backup system
# Refer to BACKUP_SETUP_INSTRUCTIONS.md Phase 8 checklist
```

### Remote Deployment (via SSH)

Used by CI/CD for staging and production:

```bash
# The remote deploy script
bash scripts/deploy/remote-compose-deploy.sh <environment>
```

---

## 15. Post-Deployment Verification

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
ENCRYPTION_KEY=<key> sh scripts/backup/postgres-restore-verify.sh <backup_file>
```

**Deployment is complete only when all health checks pass.**

---

## 16. Security Checklist

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

## 17. Troubleshooting

| Problem | Likely Cause | Solution |
|---------|--------------|----------|
| Container won't start | Missing environment variable | Check `.env` for required values |
| Database connection refused | PostgreSQL not healthy | Check `docker compose logs postgres` |
| Redis connection refused | Wrong password | Verify `REDIS_PASSWORD` matches |
| Migration fails | Schema conflict | Check `prisma/schema.prisma` vs migration history |
| Backup fails | Missing pgbackrest or openssl | Install dependencies |
| S3 upload fails | Wrong credentials or bucket | Verify S3 credentials and bucket name |
| High memory usage | Node heap too small | Adjust `NODE_OPTIONS` `--max-old-space-size` |
| Payment in sandbox when live expected | `PAYMENT_*_MODE` set to `sandbox` | Change to `live` with live credentials |
| Meilisearch not responding | Master key mismatch | Verify `MEILI_MASTER_KEY` matches on both sides |
| Object storage upload fails | Access key/secret mismatch | Verify `S3_ACCESS_KEY_ID` and `S3_SECRET_ACCESS_KEY` |

---

## 18. Maintenance Schedule

| Frequency | Task | Owner |
|-----------|------|-------|
| **Daily** | Verify backup success, check alerts | On-call engineer |
| **Weekly** | Automated restore verification (cron) | System |
| **Quarterly** | Full restore drill, measure RPO/RTO | Engineering team |
| **Every 90 days** | Rotate encryption keys, review passwords | Security engineer |
| **Annually** | Review retention policy, disaster recovery plan | Engineering lead |

---

## 19. Related Documents

| Document | Purpose |
|----------|---------|
| `MAYSAR_INFRASTRUCTURE_CONSTITUTION.md` | Governing engineering principles and standards |
| `MAYSAR_DATABASE_PERFORMANCE_CONSTITUTION.md` | Database indexing and performance governance (MYS-DB-001) |
| `MAYSAR_DELIVERY_ECONOMICS_CONSTITUTION.md` | Delivery pricing, driver compensation and financial governance (MYS-DEL-001) |
| `MAYSAR_BACKUP_GAP_ANALYSIS.md` | Gap analysis and remediation roadmap |
| `BACKUP_SETUP_INSTRUCTIONS.md` | Step-by-step backup system setup (8 phases) |
| `BACKUP_SYSTEM_GUIDE.md` | Complete operational reference for backup system |
| `config/database/least-privilege-roles.sql` | Database role definitions |
| `config/database/operations-runbook.md` | Daily operations and incident response |
| `config/database/restore-drill-runbook.md` | Quarterly restore drill procedure |
| `config/database/pgbackrest.conf` | pgBackRest configuration |
| `.env.example` | Environment variable template |
| `docker-compose.yml` | Development service definitions |
| `docker-compose.prod.yml` | Production service definitions |
| `docker-compose.staging.yml` | Staging service overrides |
| `prisma/schema.prisma` | Database schema definition |
| `infra/terraform/` | Infrastructure as Code (provider-agnostic) |
| **Migrations (run with `prisma migrate deploy`)** | |
| `prisma/migrations/20261118000000_checkout_table_names/` | Renames Checkout_* tables to snake_case — requires coordinated app + DB deployment |
| `prisma/migrations/20261118010000_delivery_economics_gaps/` | Adds `outcomeCode` to `logistics_deliveries`; payment processing rate columns to `logistics_pricing_configs`; creates `logistics_merchant_delivery_policies` and `logistics_authorized_subsidies` tables |
| **Seed Scripts** | |
| `scripts/seed-pricing-config.ts` | Delivery pricing config v2 — REQUIRED |
| `scripts/seed-vehicle-tariff.ts` | Motorcycle vehicle tariff v1 — REQUIRED |
| `scripts/seed-category-attributes.ts` | Product category hierarchy — REQUIRED |
| `scripts/seed-training.ts` | Courier training modules — REQUIRED |
| `scripts/seed-dev-users.ts` | Test accounts — dev/staging only |
| `scripts/seed-products.ts` | Sample product catalog — dev/staging only |
| **Verification** | |
| `scripts/verification/run-lifecycle-checks.mjs` | 35-lifecycle end-to-end verification script |
| `docs/verification/lifecycle-results.json` | Latest lifecycle verification run results |
| `docs/constitutions/DB_PERFORMANCE_AUDIT.md` | Database performance audit findings and remediation roadmap |

---

**End of Document**

*This guide is a living document. Update it whenever infrastructure, deployment procedures, or environment variables change.*
