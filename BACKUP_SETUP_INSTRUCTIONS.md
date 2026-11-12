# Maysar Backup System — Setup Instructions

**Document ID:** MAYSAR-BACKUP-SETUP-001  
**Version:** 1.0  
**Status:** Production-Ready  
**Owner:** Maysar Engineering  
**Estimated time:** 2–4 hours (first-time setup)

---

## Purpose

Step-by-step instructions to set up Maysar's backup system from scratch. Covers encryption, least-privilege roles, WAL archiving, pgBackRest, restore scripts, monitoring, and optional S3 offsite storage.

**Prerequisite:** Read `MAYSAR_INFRASTRUCTURE_CONSTITUTION.md` first to understand the governing principles.

---

## Phase 1: Prerequisites Check

Run these on your deployment host (or inside the backup Docker container):

```bash
# PostgreSQL client tools
which pg_dump psql pg_restore

# OpenSSL
which openssl

# AWS CLI (required for S3 offsite storage)
which aws

# pgBackRest (required for physical backups + PITR)
which pgbackrest
```

**If anything is missing, install it before proceeding:**

| OS | Command |
|----|---------|
| Alpine (Docker) | `apk add --no-cache postgresql-client openssl aws-cli pgbackrest` |
| Ubuntu/Debian | `apt-get update && apt-get install -y postgresql-client openssl awscli pgbackrest` |
| macOS | `brew install postgresql openssl awscli pgbackrest` |

---

## Phase 2: Environment Variables

Add these to your `.env` file (never commit actual values to Git):

```ini
# ============================================================================
# BACKUP CONFIGURATION
# ============================================================================

# PostgreSQL backup settings
POSTGRES_BACKUP_RETENTION_DAYS=7
REDIS_BACKUP_RETENTION_DAYS=7
BACKUP_S3_BUCKET=                          # Set to your S3 bucket name (optional)
BACKUP_ENCRYPTION_KEY=                     # Generate with: openssl rand -base64 32
AWS_ACCESS_KEY_ID=                         # Required if S3_BUCKET is set
AWS_SECRET_ACCESS_KEY=                     # Required if S3_BUCKET is set
AWS_DEFAULT_REGION=us-east-1

# pgBackRest settings
PG_BACKREST_STANZA=maysar
PG_BACKREST_CONFIG=/etc/pgbackrest.conf

# Least-privilege database roles
MAYSAR_APP_USER=maysar_app
MAYSAR_APP_PASSWORD=                       # Generate strong password
MAYSAR_BACKUP_USER=maysar_backup
MAYSAR_BACKUP_PASSWORD=                    # Generate strong password
MAYSAR_MONITOR_USER=maysar_monitor
MAYSAR_MONITOR_PASSWORD=                   # Generate strong password

# Restore behavior
RESTORE_OVERWRITE=0                        # Set to 1 to allow overwriting existing DB
KEEP_RESTORE_TEST_DB=0                     # Set to 1 to preserve test DB after verify
```

**Generate encryption key:**
```bash
openssl rand -base64 32
# Copy the output into BACKUP_ENCRYPTION_KEY
```

**Generate database passwords:**
```bash
openssl rand -base64 24
# Use for each MAYSAR_*_PASSWORD variable
```

---

## Phase 3: Docker Compose Configuration

### 3.1 Verify `docker-compose.prod.yml` has backup services

Confirm these sections exist in your `docker-compose.prod.yml`:

**PostgreSQL service** — should include WAL archiving and wal_archive volume mount:

```yaml
  postgres:
    image: postgres:15
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - wal_archive:/var/lib/postgresql/wal_archive
      - ./config/pgbackrest.conf:/etc/pgbackrest.conf:ro
    command: >
      postgres
      -c shared_buffers=512MB
      -c max_connections=200
      -c work_mem=4MB
      -c archive_mode=on
      -c archive_command='cp %p /var/lib/postgresql/wal_archive/%f'
      -c archive_timeout=60
```

**Postgres backup service** — should include separate backup volume and verify cron:

```yaml
  postgres-backup:
    image: postgres:15-alpine
    volumes:
      - ./scripts/backup/postgres-backup.sh:/backup.sh:ro
      - ./scripts/backup/postgres-restore-verify.sh:/backup-verify.sh:ro
      - ./scripts/backup/postgres-restore-pitr.sh:/backup-pitr.sh:ro
      - postgres_backups:/backups
      - pgbackrest_repo:/var/lib/pgbackrest:rw
    environment:
      POSTGRES_HOST: postgres
      POSTGRES_DB: ${POSTGRES_DB:-maysar}
      POSTGRES_USER: ${MAYSAR_BACKUP_USER:-maysar_backup}
      PGPASSWORD: ${MAYSAR_BACKUP_PASSWORD:-change-me}
      BACKUP_DIR: /backups/postgres
      BACKUP_RETENTION_DAYS: ${POSTGRES_BACKUP_RETENTION_DAYS:-7}
      S3_BUCKET: ${BACKUP_S3_BUCKET:-}
      ENCRYPTION_KEY: ${BACKUP_ENCRYPTION_KEY:-}
      PG_BACKREST_STANZA: ${PG_BACKREST_STANZA:-maysar}
      PG_BACKREST_CONFIG: /etc/pgbackrest.conf
    entrypoint: >
      sh -c "apk add --no-cache aws-cli age openssl pgbackrest &&
             mkdir -p /var/lib/pgbackrest /var/log/pgbackrest &&
             chmod 750 /var/lib/pgbackrest /var/log/pgbackrest &&
             chmod +x /backup.sh /backup-verify.sh /backup-pitr.sh &&
             echo '0 * * * * /backup.sh >> /var/log/postgres-backup.log 2>&1' | crontab - &&
             echo '0 3 * * 0 /backup-verify.sh >> /var/log/postgres-verify.log 2>&1' | crontab - &&
             crond -f -l 2"
```

**Redis backup service** — should include separate backup volume:

```yaml
  redis-backup:
    image: redis:7-alpine
    volumes:
      - ./scripts/backup/redis-backup.sh:/backup.sh:ro
      - redis_data:/data:ro
      - redis_backups:/backups
    environment:
      REDIS_HOST: redis
      REDIS_PORT: 6379
      REDIS_PASSWORD: ${REDIS_PASSWORD:-redis}
      BACKUP_DIR: /backups/redis
      BACKUP_RETENTION_DAYS: ${REDIS_BACKUP_RETENTION_DAYS:-7}
      S3_BUCKET: ${BACKUP_S3_BUCKET:-}
      ENCRYPTION_KEY: ${BACKUP_ENCRYPTION_KEY:-}
    entrypoint: >
      sh -c "apk add --no-cache aws-cli age openssl &&
             chmod +x /backup.sh &&
             echo '0 * * * * /backup.sh >> /var/log/redis-backup.log 2>&1' | crontab - &&
             crond -f -l 2"
```

**Volumes section** — should include:

```yaml
volumes:
  postgres_data:
  redis_data:
  meili_data:
  postgres_backups:
  redis_backups:
  wal_archive:
  pgbackrest_repo:
```

### 3.2 Validate YAML

```bash
python -c "import yaml; yaml.safe_load(open('docker-compose.prod.yml')); print('YAML valid')"
```

---

## Phase 4: Create pgBackRest Configuration

### 4.1 Create the config directory

```bash
mkdir -p config
```

### 4.2 Create `config/pgbackrest.conf`

```ini
[global]
repo1-path=/var/lib/pgbackrest
repo1-retention-full=7
repo1-retention-diff=3
repo1-retention-archive=30
repo1-retention-archive-type=time
start-fast=y
process-max=4
log-path=/var/log/pgbackrest
log-level-console=info
log-level-file=detail

[global:archive-check]
y

[global:archive-push]
command='cp %p /var/lib/pgbackrest/archive/%f'

[maysar]
pg1-path=/var/lib/postgresql/data
pg1-socket-path=/var/run/postgresql

[maysar:backup]
type=full
compress-type=zstd
compress-level=3
checksum-page=y
backup-standby=y

[maysar:archive]
command='pgbackrest archive-push --stanza=maysar %p'
```

### 4.3 Mount in Docker Compose

Ensure this volume mount exists in your `postgres` service in `docker-compose.prod.yml`:

```yaml
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - wal_archive:/var/lib/postgresql/wal_archive
      - ./config/pgbackrest.conf:/etc/pgbackrest.conf:ro
```

And this mount in your `postgres-backup` service:

```yaml
    volumes:
      - pgbackrest_repo:/var/lib/pgbackrest:rw
```

---

## Phase 5: Configure Least-Privilege Database Roles

### 5.1 Create the SQL file

Create `config/database/least-privilege-roles.sql`:

```sql
-- Maysar Least-Privilege Database Roles
-- Run as a superuser (e.g., postgres) against the maysar database.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'maysar_app') THEN
    CREATE ROLE maysar_app LOGIN PASSWORD 'change-me';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'maysar_backup') THEN
    CREATE ROLE maysar_backup LOGIN PASSWORD 'change-me';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'maysar_monitor') THEN
    CREATE ROLE maysar_monitor LOGIN PASSWORD 'change-me';
  END IF;
END
$$;

GRANT CONNECT ON DATABASE maysar TO maysar_app;
GRANT CONNECT ON DATABASE maysar TO maysar_backup;
GRANT CONNECT ON DATABASE maysar TO maysar_monitor;

GRANT USAGE ON SCHEMA public TO maysar_app;
GRANT USAGE ON SCHEMA public TO maysar_backup;
GRANT USAGE ON SCHEMA public TO maysar_monitor;

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO maysar_app;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO maysar_backup;
GRANT SELECT ON pg_stat_activity TO maysar_monitor;
GRANT SELECT ON pg_database TO maysar_monitor;

GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO maysar_app;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO maysar_app;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT ON TABLES TO maysar_backup;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO maysar_app;

REVOKE CREATE ON SCHEMA public FROM maysar_app;
REVOKE CREATE ON SCHEMA public FROM maysar_backup;
REVOKE CREATE ON SCHEMA public FROM maysar_monitor;
```

### 5.2 Run the role creation script

```bash
psql -h <host> -p <port> -U postgres -d maysar -f config/database/least-privilege-roles.sql
```

### 5.3 Update your application's `DATABASE_URL`

Change from superuser to `maysar_app`:

```ini
# Before
DATABASE_URL=postgresql://postgres:password@postgres:5432/maysar

# After
DATABASE_URL=postgresql://maysar_app:<MAYSAR_APP_PASSWORD>@postgres:5432/maysar?schema=public
```

---

## Phase 6: First Backup & Restore Test

### 6.1 Create a backup directory

```bash
mkdir -p /tmp/drill_backups
```

### 6.2 Run your first PostgreSQL backup

```bash
POSTGRES_HOST=localhost \
POSTGRES_PORT=5433 \
POSTGRES_DB=maysar_dev \
POSTGRES_USER=maysar_backup \
PGPASSWORD=<MAYSAR_BACKUP_PASSWORD> \
BACKUP_DIR=/tmp/drill_backups \
BACKUP_RETENTION_DAYS=7 \
ENCRYPTION_KEY=<BACKUP_ENCRYPTION_KEY> \
sh scripts/backup/postgres-backup.sh
```

**Expected output:**
```
[2026-11-11T13:56:17Z] Starting PostgreSQL logical backup...
Creating SQL dump (custom format) for database 'maysar_dev' from host 'localhost'.
Encrypting logical backup file...
Logical backup completed: /tmp/drill_backups/maysar_maysar_dev_20261111T135617Z.sql.gz.enc
[2026-11-11T13:56:32Z] Starting PostgreSQL physical backup via pgBackRest...
WARNING: pgbackrest not found, skipping physical backup.
[2026-11-11T13:56:32Z] Applying retention policy...
Backup cycle finished. Total retained logical backups: 1
```

### 6.3 Verify the backup file exists and is encrypted

```bash
ls -lh /tmp/drill_backups/
file /tmp/drill_backups/*.enc
```

You should see a `.sql.gz.enc` file (encrypted).

### 6.4 Run a restore test into a new database

```bash
POSTGRES_HOST=localhost \
POSTGRES_PORT=5433 \
POSTGRES_USER=maysar_backup \
PGPASSWORD=<MAYSAR_BACKUP_PASSWORD> \
BACKUP_DIR=/tmp/drill_backups \
ENCRYPTION_KEY=<BACKUP_ENCRYPTION_KEY> \
RESTORE_OVERWRITE=1 \
sh scripts/backup/postgres-restore.sh \
  /tmp/drill_backups/maysar_maysar_dev_<timestamp>.sql.gz.enc \
  maysar_restore_test
```

### 6.5 Verify the restored database

```bash
# Check the database exists
psql -h localhost -p 5433 -U maysar_backup -d postgres -c \
  "SELECT 1 FROM pg_database WHERE datname = 'maysar_restore_test';"

# Check table count matches source
PGPASSWORD=<MAYSAR_BACKUP_PASSWORD> psql -h localhost -p 5433 -U maysar_backup -d maysar_restore_test -c \
  "SELECT count(*) FROM information_schema.tables WHERE table_schema='public';"
```

### 6.6 Clean up test database

```bash
PGPASSWORD=<MAYSAR_BACKUP_PASSWORD> psql -h localhost -p 5433 -U maysar_backup -d postgres -c \
  "DROP DATABASE IF EXISTS maysar_restore_test;"
```

---

## Phase 7: S3 Offsite Storage (Optional)

### 7.1 Create an S3 bucket

```bash
aws s3 mb s3://maysar-backups-prod --region us-east-1
```

### 7.2 Set credentials

```bash
export AWS_ACCESS_KEY_ID=<your-access-key>
export AWS_SECRET_ACCESS_KEY=<your-secret-key>
export AWS_DEFAULT_REGION=us-east-1
export BACKUP_S3_BUCKET=maysar-backups-prod
```

### 7.3 Run a backup with S3 upload

```bash
POSTGRES_HOST=localhost \
POSTGRES_PORT=5433 \
POSTGRES_DB=maysar_dev \
POSTGRES_USER=maysar_backup \
PGPASSWORD=<MAYSAR_BACKUP_PASSWORD> \
BACKUP_DIR=/tmp/drill_backups \
BACKUP_RETENTION_DAYS=7 \
ENCRYPTION_KEY=<BACKUP_ENCRYPTION_KEY> \
S3_BUCKET=maysar-backups-prod \
AWS_DEFAULT_REGION=us-east-1 \
sh scripts/backup/postgres-backup.sh
```

### 7.4 Verify S3 uploads

```bash
aws s3 ls s3://maysar-backups-prod/postgres/logical/
aws s3 ls s3://maysar-backups-prod/pgbackrest/
```

### 7.4 Restore from S3

```bash
# Download from S3
aws s3 cp s3://maysar-backups-prod/postgres/logical/maysar_maysar_*.sql.gz.enc .

# Decrypt
openssl enc -d -aes-256-cbc -pbkdf2 \
  -in maysar_maysar_*.sql.gz.enc \
  -out maysar_maysar_*.sql.gz \
  -pass pass:<BACKUP_ENCRYPTION_KEY>

# Restore
RESTORE_OVERWRITE=1 ENCRYPTION_KEY=<BACKUP_ENCRYPTION_KEY> \
  sh scripts/backup/postgres-restore.sh maysar_maysar_*.sql.gz
```

---

## Phase 8: Verification Checklist

Complete all items before considering the backup system ready for production:

| # | Task | Command / Evidence | Done |
|---|------|-------------------|------|
| 1 | Prerequisites installed | `which pg_dump psql pg_restore openssl aws pgbackrest` | [ ] |
| 2 | Environment variables set | `.env` contains all backup variables | [ ] |
| 3 | Encryption key generated | `openssl rand -base64 32` output stored in secrets manager | [ ] |
| 4 | pgBackRest config created | `config/pgbackrest.conf` exists | [ ] |
| 5 | Docker Compose validated | `python -c "import yaml; yaml.safe_load(open('docker-compose.prod.yml'))"` | [ ] |
| 6 | Least-privilege roles created | `psql ... -f config/database/least-privilege-roles.sql` | [ ] |
| 7 | Application uses `maysar_app` role | `DATABASE_URL` uses `maysar_app` | [ ] |
| 8 | WAL archiving enabled | `SELECT archived_count, failed_count FROM pg_stat_archiver;` | [ ] |
| 9 | First backup completed | Backup file exists in `/tmp/drill_backups/` | [ ] |
| 10 | Backup is encrypted | `file *.enc` shows "openssl enc'd data" | [ ] |
| 11 | Restore test passed | Restored database has correct table count | [ ] |
| 12 | Test database cleaned up | `DROP DATABASE` executed | [ ] |
| 13 | S3 bucket created (if using S3) | `aws s3 mb s3://<bucket>` | [ ] |
| 14 | S3 upload verified | `aws s3 ls s3://<bucket>/postgres/logical/` | [ ] |
| 15 | Prometheus alerts configured | `infra/prometheus/alert-rules.yml` has `backup_alerts` group | [ ] |
| 16 | Weekly verify cron scheduled | `0 3 * * 0 /backup-verify.sh` in crontab | [ ] |

### Sign-off

| Role | Name | Signature | Date |
|------|------|-----------|------|
| Setup Engineer | | | |
| Engineering Lead | | | |

**Once all items are checked, the backup system is ready for production use.**

---

## Troubleshooting Quick Reference

| Problem | Solution |
|---------|----------|
| `pg_restore: unrecognized configuration parameter "transaction_timeout"` | Remove `--exit-on-error` from restore command; warnings are benign |
| `Backup file is encrypted but ENCRYPTION_KEY is not set` | Set `ENCRYPTION_KEY` or `BACKUP_ENCRYPTION_KEY` environment variable |
| `gzip: not in gzip format` | Decrypt first with `openssl enc -d`, then gunzip |
| `AWS CLI not found` | Add `apk add --no-cache aws-cli` to Docker entrypoint |
| `pgbackrest not found` | Add `apk add --no-cache pgbackrest` to Docker entrypoint |
| `Target database already exists` | Set `RESTORE_OVERWRITE=1` |
| WAL archives not appearing | Set `archive_mode=on` in PostgreSQL and restart |

---

**Next step after setup:** Schedule a quarterly restore drill using `config/database/restore-drill-runbook.md` to measure RPO/RTO and maintain compliance with `MAYSAR_INFRASTRUCTURE_CONSTITUTION.md`.
