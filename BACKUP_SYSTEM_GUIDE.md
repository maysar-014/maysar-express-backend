# Maysar Backup System Guide

**Document ID:** MAYSAR-BACKUP-001  
**Version:** 1.0  
**Status:** Production-Ready  
**Owner:** Maysar Engineering  
**Last Reviewed:** Pre-launch  
**Classification:** Internal — Engineering Documentation

---

## Document Control

| Field | Value |
|-------|-------|
| **Document** | Maysar Backup System Guide |
| **Version** | 1.0 |
| **Status** | Production-ready |
| **Applies to** | All environments (dev, staging, production, portable) |
| **Databases covered** | PostgreSQL (primary), Redis (cache) |
| **Backup methods** | Logical dumps (`pg_dump -Fc`), Physical backups (pgBackRest), RDB snapshots (Redis) |
| **Encryption** | AES-256-CBC + PBKDF2 (client-side) |
| **Offsite storage** | S3-compatible (optional) |
| **Related docs** | `MAYSAR_INFRASTRUCTURE_CONSTITUTION.md`, `MAYSAR_BACKUP_GAP_ANALYSIS.md` |

---

## 1. Overview

Maysar's backup system provides **independent, encrypted, and recoverable** data protection for PostgreSQL and Redis across all environments. The system is designed around five independently recoverable infrastructure layers:

| Layer | Responsibility |
|-------|----------------|
| L1 — Application | API services, workers, frontend |
| L2 — Data | PostgreSQL, Redis, migrations |
| L3 — Independent Storage | Backups, uploaded files, critical assets |
| L4 — Security | Secrets, encryption keys, access control |
| L5 — Reliability | Monitoring, alerting, backup verification, DR testing |

**Core guarantee:** Every backup is encrypted client-side before leaving the Maysar network, stored on volumes independent from live data, and verified through automated restore testing.

---

## 2. Architecture Overview

### 2.1 PostgreSQL Backup Pipeline

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   PostgreSQL    │────▶│  pg_dump -Fc     │────▶│  gzip + AES-256 │
│   (live data)   │     │  logical dump    │     │  encryption     │
└─────────────────┘     └──────────────────┘     └─────────┬───────┘
                                                          │
                                                          ▼
                                                  ┌─────────────────┐
                                                  │  /backups/postgres│
                                                  │  (independent vol)│
                                                  └─────────┬───────┘
                                                          │
                                                          ▼
                                                  ┌─────────────────┐
                                                  │   S3 (optional)   │
                                                  │  STANDARD_IA    │
                                                  └─────────────────┘
```

### 2.2 PostgreSQL Physical Backup + PITR (pgBackRest)

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   PostgreSQL    │────▶│  WAL archiving   │────▶│  wal_archive vol│
│   (archive=on)  │     │  (continuous)    │     │  (independent)  │
└─────────────────┘     └──────────────────┘     └─────────┬───────┘
                                                          │
                                                          ▼
                                                  ┌─────────────────┐
                                                  │  pgBackRest     │
                                                  │  base backup    │
                                                  │  pgbackrest_repo│
                                                  └─────────┬───────┘
                                                          │
                                                          ▼
                                                  ┌─────────────────┐
                                                  │   PITR restore    │
                                                  │  (any timestamp)  │
                                                  └─────────────────┘
```

### 2.3 Redis Backup Pipeline

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│     Redis       │────▶│  BGSAVE          │────▶│  gzip + AES-256 │
│   (RDB snapshot)│     │  (point-in-time) │     │  encryption     │
└─────────────────┘     └──────────────────┘     └─────────┬───────┘
                                                          │
                                                          ▼
                                                  ┌─────────────────┐
                                                  │  /backups/redis   │
                                                  │  (independent vol)│
                                                  └─────────────────┘
```

---

## 3. Technology Stack

| Component | Tool | Purpose |
|-----------|------|---------|
| Logical backup | `pg_dump -Fc` | Portable, selective table restore |
| Physical backup | `pgBackRest` | Base backups + WAL archiving for PITR |
| Transaction recovery | WAL archiving | Point-in-time recovery to any timestamp |
| Cache backup | `redis-cli BGSAVE` + gzip | Redis RDB snapshot |
| Compression | gzip (level 9) | Reduce storage and transfer size |
| Encryption | `openssl enc -aes-256-cbc -pbkdf2` | Client-side encryption before storage/offsite |
| Scheduling | `crond` | Hourly (logical/Redis), weekly (verify) |
| Offsite storage | AWS CLI + S3-compatible | `STANDARD_IA` storage class |
| Monitoring | Prometheus + alerts | Backup failure, disk usage, stale verification |

---

## 4. Environment Configuration

### 4.1 Supported Environments

| Environment | Schedule | Retention | PITR | Encryption | S3 Offsite |
|-------------|----------|-----------|------|------------|------------|
| **Development** | Hourly | 7 days | Optional | Recommended | Optional (MinIO) |
| **Staging** | Hourly | 14 days | Yes | Required | Yes |
| **Production** | Hourly | 30 days | Yes | Required | Yes |
| **Portable** | Daily 2 AM | 30 days | Yes | Recommended | Optional |

### 4.2 Environment Variables

All backup behavior is controlled through environment variables. Define these in your `.env` file or deployment environment.

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `POSTGRES_HOST` | PostgreSQL hostname | `postgres` | No |
| `POSTGRES_PORT` | PostgreSQL port | `5432` | No |
| `POSTGRES_DB` | Database name | `maysar` | No |
| `POSTGRES_USER` | Database user | `postgres` | No |
| `PGPASSWORD` | Database password | — | **Yes** |
| `BACKUP_DIR` | Local backup directory | `/backups/postgres` or `/backups/redis` | No |
| `BACKUP_RETENTION_DAYS` | Days to retain backups | 7 (postgres), 7 (redis) | No |
| `ENCRYPTION_KEY` | Client-side encryption passphrase | — | **Recommended** |
| `BACKUP_ENCRYPTION_KEY` | Alias for ENCRYPTION_KEY (`.env.example`) | — | **Recommended** |
| `S3_BUCKET` | Offsite S3 bucket name | — | No |
| `AWS_ACCESS_KEY_ID` | AWS credentials | — | No (if S3 used) |
| `AWS_SECRET_ACCESS_KEY` | AWS credentials | — | No (if S3 used) |
| `AWS_DEFAULT_REGION` | AWS region | `us-east-1` | No |
| `PG_BACKREST_STANZA` | pgBackRest stanza name | `maysar` | No |
| `PG_BACKREST_CONFIG` | pgBackRest config path | `/etc/pgbackrest.conf` | No |
| `RESTORE_OVERWRITE` | Allow overwriting existing DB on restore | `0` | No |
| `KEEP_RESTORE_TEST_DB` | Preserve test DB after verification | `0` | No |

### 4.3 Adding to `.env.example`

```ini
# Backup Configuration
POSTGRES_BACKUP_RETENTION_DAYS=7 # [ENV VAR]
REDIS_BACKUP_RETENTION_DAYS=7 # [ENV VAR]
BACKUP_S3_BUCKET= # [ENV VAR]
BACKUP_ENCRYPTION_KEY= # [SECRETS MANAGER]
AWS_ACCESS_KEY_ID= # [SECRETS MANAGER]
AWS_SECRET_ACCESS_KEY= # [SECRETS MANAGER]
AWS_DEFAULT_REGION=us-east-1 # [ENV VAR]

# Least-privilege database roles
MAYSAR_APP_USER=maysar_app # [ENV VAR]
MAYSAR_APP_PASSWORD= # [SECRETS MANAGER]
MAYSAR_BACKUP_USER=maysar_backup # [ENV VAR]
MAYSAR_BACKUP_PASSWORD= # [SECRETS MANAGER]
MAYSAR_MONITOR_USER=maysar_monitor # [ENV VAR]
MAYSAR_MONITOR_PASSWORD= # [SECRETS MANAGER]
```

---

## 5. Backup Scripts Reference

### 5.1 Script Inventory

| Script | Location | Database | Schedule |
|--------|----------|----------|----------|
| `postgres-backup.sh` | `scripts/backup/` | PostgreSQL | Hourly |
| `postgres-restore.sh` | `scripts/backup/` | PostgreSQL | On-demand |
| `postgres-restore-pitr.sh` | `scripts/backup/` | PostgreSQL | On-demand (PITR) |
| `postgres-restore-verify.sh` | `scripts/backup/` | PostgreSQL | Weekly (automated) |
| `redis-backup.sh` | `scripts/backup/` | Redis | Hourly |

### 5.2 postgres-backup.sh

Creates:
1. **Logical dump** via `pg_dump -Fc` (custom format, encrypted)
2. **Physical backup** via pgBackRest (base backup + WAL archive push)
3. **S3 upload** of logical backup and pgBackRest repository

**Usage:**
```bash
PGPASSWORD=<password> ENCRYPTION_KEY=<key> S3_BUCKET=<bucket> \
  sh scripts/backup/postgres-backup.sh
```

**Output files:**
- `maysar_{db}_{timestamp}.sql.gz.enc` — Encrypted logical dump
- `/var/lib/pgbackrest/` — Physical backup repository (synced to S3)

### 5.3 postgres-restore.sh

Restores an encrypted logical backup into a target database.

**Usage:**
```bash
# Restore latest backup to default database
RESTORE_OVERWRITE=1 ENCRYPTION_KEY=<key> \
  sh scripts/backup/postgres-restore.sh

# Restore specific backup to custom database
ENCRYPTION_KEY=<key> \
  sh scripts/backup/postgres-restore.sh \
  /backups/postgres/maysar_maysar_20240115T103000Z.sql.gz.enc \
  maysar_recovery
```

### 5.4 postgres-restore-pitr.sh

Point-in-time recovery using pgBackRest. Restores a base backup and replays WAL archives to a specific timestamp.

**Usage:**
```bash
# Restore to a specific timestamp
RESTORE_OVERWRITE=1 \
  sh scripts/backup/postgres-restore-pitr.sh \
  "2024-01-15 10:30:00+00" \
  maysar

# Restore to latest available WAL
RESTORE_OVERWRITE=1 \
  sh scripts/backup/postgres-restore-pitr.sh \
  "" \
  maysar
```

### 5.5 postgres-restore-verify.sh

Automated verification that a backup is restorable and data matches the source.

**Usage:**
```bash
ENCRYPTION_KEY=<key> KEEP_RESTORE_TEST_DB=0 \
  sh scripts/backup/postgres-restore-verify.sh \
  /backups/postgres/maysar_maysar_20240115T103000Z.sql.gz.enc
```

### 5.6 redis-backup.sh

Creates Redis RDB snapshot via `BGSAVE`, compresses, encrypts, and optionally uploads to S3.

**Usage:**
```bash
REDIS_PASSWORD=<password> ENCRYPTION_KEY=<key> S3_BUCKET=<bucket> \
  sh scripts/backup/redis-backup.sh
```

---

## 6. Getting Started

### 6.1 Prerequisites

| Requirement | Command to Verify |
|-------------|-------------------|
| PostgreSQL client tools | `which pg_dump psql pg_restore` |
| OpenSSL | `which openssl` |
| AWS CLI (for S3) | `which aws` |
| pgBackRest (for PITR) | `which pgbackrest` |
| Docker (for containerized deploy) | `which docker` |

### 6.2 Install Dependencies (Host)

**Alpine (Docker):**
```sh
apk add --no-cache postgresql-client openssl aws-cli pgbackrest
```

**Ubuntu/Debian:**
```sh
apt-get install -y postgresql-client openssl awscli
```

**macOS:**
```sh
brew install postgresql openssl awscli pgbackrest
```

### 6.3 Generate Encryption Key

```bash
# Generate a strong encryption key
openssl rand -base64 32
# Example: k8J3mP9vR2wX5yZ7aB1cD4eF6gH8jK0lMn2oP3qRs5Tu8vWx1Yz4Ab7Cd9Ef

# Store in your secrets manager (AWS Secrets Manager, HashiCorp Vault, etc.)
# NEVER commit to Git
```

### 6.4 Configure Least-Privilege Database Roles

Run `config/database/least-privilege-roles.sql` as a PostgreSQL superuser:

```bash
psql -h <host> -U postgres -d maysar -f config/database/least-privilege-roles.sql
```

Then update your application's `DATABASE_URL` to use `maysar_app` instead of the superuser.

### 6.5 Enable WAL Archiving (Production)

```sql
-- Run as superuser, requires PostgreSQL restart
ALTER SYSTEM SET archive_mode = on;
ALTER SYSTEM SET archive_command = 'cp %p /var/lib/postgresql/wal_archive/%f';
ALTER SYSTEM SET archive_timeout = 60;
```

---

## 7. Daily Operations

### 7.1 Daily Checklist

Run each business day:

| # | Task | Command |
|---|------|---------|
| 1 | Verify last backup succeeded | `tail -20 /var/log/postgres-backup.log` |
| 2 | Verify WAL archiving | `SELECT archived_count, failed_count FROM pg_stat_archiver;` |
| 3 | Check backup disk usage | `df -h /backups` |
| 4 | Review Prometheus alerts | Check Alertmanager dashboard |
| 5 | Verify encryption key custody | Confirm key is in secrets manager, not in Git |

### 7.2 Manual Backup Execution

**PostgreSQL (logical + physical):**
```bash
PGPASSWORD=<backup_password> \
ENCRYPTION_KEY=<encryption_key> \
S3_BUCKET=<s3_bucket> \
AWS_DEFAULT_REGION=us-east-1 \
sh scripts/backup/postgres-backup.sh
```

**Redis:**
```bash
REDIS_PASSWORD=<redis_password> \
ENCRYPTION_KEY=<encryption_key> \
S3_BUCKET=<s3_bucket> \
sh scripts/backup/redis-backup.sh
```

---

## 8. Restore Procedures

### 8.1 Full Database Restore (Logical)

Use when you need to restore the entire database from a logical dump.

```bash
# Restore latest backup (will fail if target DB exists)
RESTORE_OVERWRITE=1 ENCRYPTION_KEY=<key> \
  sh scripts/backup/postgres-restore.sh

# Restore specific backup file
ENCRYPTION_KEY=<key> \
  sh scripts/backup/postgres-restore.sh \
  /backups/postgres/maysar_maysar_20240115T103000Z.sql.gz.enc \
  maysar_recovery
```

### 8.2 Point-in-Time Recovery (PITR)

Use when you need to recover to a specific timestamp (e.g., before accidental data deletion).

**Prerequisites:**
- pgBackRest base backup exists
- WAL archives cover the target time
- PostgreSQL 15+

```bash
# Restore to specific timestamp
RESTORE_OVERWRITE=1 \
  sh scripts/backup/postgres-restore-pitr.sh \
  "2024-01-15 10:30:00+00" \
  maysar

# Restore to latest available WAL
RESTORE_OVERWRITE=1 \
  sh scripts/backup/postgres-restore-pitr.sh \
  "" \
  maysar
```

### 8.3 Selective Table Restore

Logical backups use `pg_dump -Fc` custom format, allowing selective table restoration:

```bash
# Decrypt and decompress first
openssl enc -d -aes-256-cbc -pbkdf2 \
  -in /backups/postgres/maysar_maysar_*.sql.gz.enc \
  -out /tmp/maysar_decrypted.sql.gz \
  -pass pass:<encryption_key>

gunzip -c /tmp/maysar_decrypted.sql.gz > /tmp/maysar_decrypted.sql

# Restore specific table
pg_restore \
  --host=<host> \
  --port=<port> \
  --username=<user> \
  --dbname=<target_db> \
  --table=orders \
  --data-only \
  /tmp/maysar_decrypted.sql
```

### 8.4 Redis Restore

```bash
# Decompress (and decrypt if needed)
gunzip -c /backups/redis/redis_*.rdb.gz > /data/dump.rdb

# If encrypted:
openssl enc -d -aes-256-cbc -pbkdf2 \
  -in /backups/redis/redis_*.rdb.gz.enc \
  -out /backups/redis/redis_*.rdb.gz \
  -pass pass:<encryption_key>
gunzip -c /backups/redis/redis_*.rdb.gz > /data/dump.rdb

# Restart Redis to load the RDB
docker restart maysar-express-backend-redis-1
```

---

## 9. Encryption & Security

### 9.1 Encryption Flow

```
Plaintext backup
     │
     ▼
┌─────────────────┐
│ openssl enc     │
│ -aes-256-cbc    │
│ -pbkdf2         │
│ -pass pass:KEY  │
└─────────────────┘
     │
     ▼
Encrypted file (.enc)
     │
     ├────▶ Local volume (/backups/)
     │
     └────▶ S3 (STANDARD_IA)
```

### 9.2 Key Management Rules

| Rule | Requirement |
|------|-------------|
| Storage | Never commit `ENCRYPTION_KEY` or `BACKUP_ENCRYPTION_KEY` to Git |
| Location | Store in secrets manager (AWS Secrets Manager, HashiCorp Vault, etc.) |
| Rotation | Rotate every 90 days |
| Custody | Keys stored separately from backups they protect |
| Recovery | Escrow recovery credentials separately from operational credentials |

### 9.3 Decrypting a Backup

```bash
openssl enc -d -aes-256-cbc -pbkdf2 \
  -in /backups/postgres/maysar_maysar_*.sql.gz.enc \
  -out /backups/postgres/maysar_maysar_*.sql.gz \
  -pass pass:<encryption_key>
```

---

## 10. S3 Offsite Storage

### 10.1 Configuration

Set these environment variables:

```ini
BACKUP_S3_BUCKET=maysar-backups-prod
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
AWS_DEFAULT_REGION=us-east-1
```

### 10.2 What Gets Uploaded

| Path | Content |
|------|---------|
| `s3://<bucket>/postgres/logical/` | Encrypted logical dumps |
| `s3://<bucket>/pgbackrest/` | pgBackRest base backups + WAL archives |
| `s3://<bucket>/redis/` | Encrypted Redis RDB snapshots |

### 10.3 Verifying S3 Uploads

```bash
aws s3 ls s3://<bucket>/postgres/logical/
aws s3 ls s3://<bucket>/pgbackrest/
aws s3 ls s3://<bucket>/redis/
```

### 10.4 Restoring from S3

```bash
# Download from S3
aws s3 cp s3://<bucket>/postgres/logical/maysar_maysar_*.sql.gz.enc .

# Decrypt
openssl enc -d -aes-256-cbc -pbkdf2 \
  -in maysar_maysar_*.sql.gz.enc \
  -out maysar_maysar_*.sql.gz \
  -pass pass:<encryption_key>

# Restore
RESTORE_OVERWRITE=1 ENCRYPTION_KEY=<key> \
  sh scripts/backup/postgres-restore.sh maysar_maysar_*.sql.gz
```

---

## 11. Monitoring & Alerts

### 11.1 Prometheus Alerts

Three alerts are defined in `infra/prometheus/alert-rules.yml`:

| Alert | Trigger | Severity | Description |
|-------|---------|----------|-------------|
| `BackupFailure` | `maysar_backup_success == 0` for 10m | Critical | Last backup did not complete successfully |
| `BackupDiskUsageHigh` | Backup disk free < 20% for 5m | Warning | Backup storage volume nearing capacity |
| `RestoreVerificationStale` | No successful verification in 7 days | Critical | Backups may not be restorable |

### 11.2 Metrics to Track

| Metric | Query | Purpose |
|--------|-------|---------|
| Database size | `pg_database_size('maysar')` | Track growth trend |
| Backup success | `maysar_backup_success` | Verify backups running |
| Last restore | `maysar_restore_verification_last_success` | Verify restorability |
| WAL archive status | `pg_stat_archiver` | Verify PITR capability |

### 11.3 Alert Response

**BackupFailure:**
1. Check logs: `cat /var/log/postgres-backup.log`
2. Verify DB connectivity: `pg_isready -h <host> -U <user>`
3. Check disk space: `df -h /backups`
4. Re-run backup manually

**RestoreVerificationStale:**
1. Run verification manually
2. If failing, investigate backup integrity
3. Schedule full restore drill

---

## 12. Troubleshooting

| Problem | Likely Cause | Solution |
|---------|--------------|----------|
| `pg_restore: unrecognized configuration parameter "transaction_timeout"` | Dump created on PG 18, restoring to PG 15 | Remove `--exit-on-error`; warnings are benign |
| `Backup file is encrypted but ENCRYPTION_KEY is not set` | Missing encryption key | Set `ENCRYPTION_KEY` or `BACKUP_ENCRYPTION_KEY` |
| `gzip: not in gzip format` | Trying to gunzip an `.enc` file | Decrypt first with `openssl enc -d` |
| `AWS CLI not found` | `aws` not installed in container | Add `apk add --no-cache aws-cli` to entrypoint |
| `pgbackrest not found` | pgBackRest not installed | Add `apk add --no-cache pgbackrest` to entrypoint |
| `Target database already exists` | Restore target exists | Set `RESTORE_OVERWRITE=1` |
| WAL archives not appearing | `archive_mode` not enabled | Set `archive_mode=on` and restart PostgreSQL |

---

## 13. Maintenance Schedule

| Frequency | Task | Owner |
|-----------|------|-------|
| **Daily** | Verify backup success, check alerts | On-call engineer |
| **Weekly** | Automated restore verification (cron) | System |
| **Quarterly** | Full restore drill, measure RPO/RTO | Engineering team |
| **Every 90 days** | Rotate encryption keys, review passwords | Security engineer |
| **Annually** | Review retention policy, disaster recovery plan | Engineering lead |

---

## 14. Quick Reference: Common Commands

```bash
# Create backup
PGPASSWORD=<pw> ENCRYPTION_KEY=<key> sh scripts/backup/postgres-backup.sh

# Restore latest (overwrite)
RESTORE_OVERWRITE=1 ENCRYPTION_KEY=<key> sh scripts/backup/postgres-restore.sh

# Restore specific file
ENCRYPTION_KEY=<key> sh scripts/backup/postgres-restore.sh /path/to/file.enc <db>

# PITR restore
RESTORE_OVERWRITE=1 sh scripts/backup/postgres-restore-pitr.sh "2024-01-15 10:30:00+00" <db>

# Verify backup
ENCRYPTION_KEY=<key> sh scripts/backup/postgres-restore-verify.sh /path/to/file.enc

# Redis backup
REDIS_PASSWORD=<pw> ENCRYPTION_KEY=<key> sh scripts/backup/redis-backup.sh

# Decrypt backup
openssl enc -d -aes-256-cbc -pbkdf2 -in file.enc -out file.sql.gz -pass pass:<key>

# Check WAL archiving
SELECT archived_count, failed_count FROM pg_stat_archiver;

# Check database size
SELECT pg_size_pretty(pg_database_size('maysar'));
```

---

## 15. Related Documents

| Document | Purpose |
|----------|---------|
| `MAYSAR_INFRASTRUCTURE_CONSTITUTION.md` | Governing engineering principles and standards |
| `MAYSAR_BACKUP_GAP_ANALYSIS.md` | Gap analysis and remediation roadmap |
| `config/database/least-privilege-roles.sql` | Database role definitions |
| `config/database/operations-runbook.md` | Daily operations and incident response |
| `config/database/restore-drill-runbook.md` | Quarterly restore drill procedure |
| `config/pgbackrest.conf` | pgBackRest configuration |

---

**End of Document**

*This guide is a living document. Update it whenever backup infrastructure, procedures, or environment variables change.*
