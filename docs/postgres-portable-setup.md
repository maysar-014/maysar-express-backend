# PostgreSQL Portable Deployment & Operations Runbook

This document is the full operational guide for running PostgreSQL in a cloud-portable, backup-safe, restore-tested way using Docker Compose.

Target platforms:
- AWS EC2 / Azure VM / GCP Compute Engine / OCI Compute
- Any Linux server with Docker + Docker Compose

Validated restore flow:
- Date: March 25, 2026
- Result: Passed (`Restore verification passed: table structure and row counts match.`)

## 1. Scope And Objectives

This setup is designed to guarantee:
- Persistent PostgreSQL data outside container filesystem
- Automatic daily SQL backups with timestamps
- Non-overwriting backup history
- Tested restore workflow (not theoretical)
- Provider-neutral migration path without vendor-specific DB services

Out of scope:
- Managed cloud database services (RDS/Cloud SQL/Azure Database for PostgreSQL)
- WAL/PITR streaming replication

## 2. Delivered Files

- `docker-compose.postgres-portable.yml`
- `.env.postgres.example`
- `scripts/backup/postgres-backup.sh`
- `scripts/backup/postgres-restore.sh`
- `scripts/backup/postgres-restore-verify.sh`

## 3. Architecture Summary

Services:
- `postgres`: primary PostgreSQL 15 instance
- `postgres-backup`: backup utility container with internal `crond`

Data and backup paths on host:
- PostgreSQL data: `/data/postgres`
- PostgreSQL backups: `/backups/postgres`

Why this is migration-safe:
- Uses standard PostgreSQL image and SQL dumps (`pg_dump`)
- Uses host bind mounts instead of anonymous/internal container storage
- No cloud-specific backup APIs required

## 4. Host Prerequisites

Required:
- Linux server (Ubuntu, Debian, Rocky, AlmaLinux, etc.)
- Docker Engine
- Docker Compose plugin (`docker compose`)
- At least one persistent disk/volume mounted for data and backups

Recommended:
- Separate disks for `/data` and `/backups`
- NTP time sync enabled
- Firewall rules allowing DB access only from app/network

## 5. Directory Layout And Permissions

Create persistent directories:

```bash
sudo mkdir -p /data/postgres /backups/postgres
sudo chown -R 999:999 /data/postgres /backups/postgres
sudo chmod 700 /data/postgres
sudo chmod 750 /backups/postgres
```

Notes:
- UID/GID `999:999` matches the `postgres` container user in official images.
- Data survives container restart, rebuild, and server reboot because files are on host storage.

## 6. Environment Configuration

Create runtime env file:

```bash
cp .env.postgres.example .env.postgres
```

Set at minimum:
- `POSTGRES_PASSWORD` (strong unique password)
- `POSTGRES_DB`
- `POSTGRES_USER`

Key variables:

| Variable | Purpose | Example |
|---|---|---|
| `POSTGRES_DATA_DIR` | Host directory for DB files | `/data/postgres` |
| `POSTGRES_BACKUP_DIR` | Host directory for SQL backups | `/backups/postgres` |
| `POSTGRES_BACKUP_CRON` | Backup schedule (daily) | `0 2 * * *` |
| `POSTGRES_BACKUP_RETENTION_DAYS` | Local retention window | `30` |
| `POSTGRES_BACKUP_FILE_PREFIX` | Backup file prefix | `maysar` |
| `TZ` | Container timezone | `UTC` |

## 7. Deployment Procedure

Start services:

```bash
docker compose --env-file .env.postgres -f docker-compose.postgres-portable.yml up -d
```

Check status:

```bash
docker compose --env-file .env.postgres -f docker-compose.postgres-portable.yml ps
```

Check backup container logs:

```bash
docker compose --env-file .env.postgres -f docker-compose.postgres-portable.yml logs --tail=200 postgres-backup
```

Expected first-run behavior:
- `postgres` becomes healthy
- `postgres-backup` runs one immediate backup on startup
- `crond` remains running for scheduled daily backups

## 8. Backup Policy And Behavior

Backup implementation:
- Script: `scripts/backup/postgres-backup.sh`
- Tool: `pg_dump` plain SQL
- Compression: `gzip`
- Naming: `<prefix>_<db>_<UTC timestamp>.sql.gz`

Policy guarantees:
- Backups are timestamped and unique
- Existing files are never overwritten
- Old backups are pruned by retention days
- Backup integrity is checked (`gzip -t`)

Manual backup trigger:

```bash
docker compose --env-file .env.postgres -f docker-compose.postgres-portable.yml exec \
  postgres-backup \
  /bin/sh /usr/local/bin/postgres-backup.sh
```

List backups:

```bash
ls -lh /backups/postgres
```

## 9. Restore Procedures

Script used:
- `scripts/backup/postgres-restore.sh`

### 9.1 Restore Latest Backup Into A New Database

```bash
docker compose --env-file .env.postgres -f docker-compose.postgres-portable.yml exec \
  -e RESTORE_OVERWRITE=1 \
  postgres-backup \
  /bin/sh /usr/local/bin/postgres-restore.sh "" restored_maysar
```

### 9.2 Restore Specific Backup File

```bash
docker compose --env-file .env.postgres -f docker-compose.postgres-portable.yml exec \
  -e RESTORE_OVERWRITE=1 \
  postgres-backup \
  /bin/sh /usr/local/bin/postgres-restore.sh /backups/postgres/<backup-file>.sql.gz restored_maysar
```

### 9.3 In-Place Production Restore (Downtime Required)

1. Stop application services that write to DB.
2. Restore into original DB name with overwrite enabled.
3. Start application services.
4. Run post-restore smoke tests.

Example:

```bash
docker compose --env-file .env.postgres -f docker-compose.postgres-portable.yml exec \
  -e RESTORE_OVERWRITE=1 \
  postgres-backup \
  /bin/sh /usr/local/bin/postgres-restore.sh /backups/postgres/<backup-file>.sql.gz <prod-db-name>
```

## 10. Mandatory Restore Test (Backup Completion Gate)

Script used:
- `scripts/backup/postgres-restore-verify.sh`

What it does:
1. Creates temporary test database
2. Restores latest (or specified) backup
3. Compares source vs restored public table list
4. Compares row counts table-by-table
5. Fails on mismatch
6. Drops temp DB by default

Run test:

```bash
docker compose --env-file .env.postgres -f docker-compose.postgres-portable.yml exec \
  postgres-backup \
  /bin/sh /usr/local/bin/postgres-restore-verify.sh
```

Keep test DB for inspection:

```bash
docker compose --env-file .env.postgres -f docker-compose.postgres-portable.yml exec \
  -e KEEP_RESTORE_TEST_DB=1 \
  postgres-backup \
  /bin/sh /usr/local/bin/postgres-restore-verify.sh
```

Success criteria:
- Output includes `Restore verification passed: table structure and row counts match.`

## 11. Cloud Migration / Provider Move Runbook

Use this when moving between AWS, Azure, GCP, OCI, or another server.

1. Prepare target server with Docker + Compose.
2. Create `/data/postgres` and `/backups/postgres` on target.
3. Copy repository files including:
   - `docker-compose.postgres-portable.yml`
   - `.env.postgres` (updated for target host)
   - backup/restore scripts
4. Transfer backup artifacts (`*.sql.gz`) to target `/backups/postgres`.
5. Start target stack.
6. Restore latest validated backup into target DB.
7. Run restore verification on target.
8. Repoint app `DATABASE_URL` to target host.
9. Run application smoke tests.
10. Decommission old environment only after verification pass.

No schema changes are required for provider migration because data format is standard PostgreSQL SQL dump.

## 12. Security And Hardening Recommendations

Minimum:
- Use long random `POSTGRES_PASSWORD`
- Restrict DB port exposure with firewall/security groups
- Store `.env.postgres` with limited permissions (`chmod 600`)
- Keep backups on encrypted disk

Recommended:
- Offsite copy of `/backups/postgres` to object storage
- Backup directory access limited to ops users
- Separate app and DB hosts for production
- TLS termination or private networking for DB connections

## 13. Operations Checklist

Daily:
- Confirm latest backup file exists in `/backups/postgres`
- Check backup logs for errors

Weekly:
- Verify retention policy is pruning old backups
- Validate disk space for data and backups

Monthly:
- Run restore verification drill in staging
- Record evidence (date/time/backup file/result)

## 14. Troubleshooting

`postgres-backup` restarts continuously:
- Check logs:
  - `docker compose --env-file .env.postgres -f docker-compose.postgres-portable.yml logs postgres-backup`
- Verify `PGPASSWORD` is set
- Verify backup directory is writable

No backups being created:
- Confirm cron expression in `POSTGRES_BACKUP_CRON`
- Trigger manual backup command to isolate cron issue

Restore fails with DB already exists:
- Set `RESTORE_OVERWRITE=1`

Permission denied on host paths:
- Re-apply ownership to `999:999`
- Validate mount paths are correct in `.env.postgres`

## 15. Compliance Evidence Template

For audit/change records, capture:
- Deployment date and commit hash
- `.env.postgres` non-secret values
- Latest backup filename + checksum
- Restore verification execution timestamp
- Restore verification output (pass/fail)

This closes the operational loop: backup is not considered complete until restore verification passes.
