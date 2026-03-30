# Disaster Recovery Guide

This guide reflects the current monolith runtime. The live system uses PostgreSQL, Redis, and an in-process event bus, so there is no separate message broker to recover.

## 1. RPO / RTO Targets

| Component | RPO | RTO | Strategy |
|---|---|---|---|
| PostgreSQL (primary DB) | 60 min | 60 min | Hourly full backup |
| Redis (cache/sessions) | 60 min | 10 min | Hourly snapshot |
| Application process | N/A | 2 min | Restart policy + health checks |
| In-process event bus | N/A | N/A | Reinitialized with the application |

## 2. Backup Schedule & Retention

| Backup Type | Schedule (cron) | Retention | Storage |
|---|---|---|---|
| PostgreSQL full dump | `0 * * * *` (Hourly) | 7 days local / 90 days S3 | `$BACKUP_DIR/postgres/` |
| Redis snapshot | `0 * * * *` (Hourly) | 7 days local / 30 days S3 | `$BACKUP_DIR/redis/` |

## 3. Restore Procedures

### 3.1 PostgreSQL Restore

1. Stop the application to prevent writes.
2. Choose the backup file from `$BACKUP_DIR/postgres/`.
3. Run the restore command:
   ```bash
   gunzip -c backup_filename.sql.gz | psql -h $POSTGRES_HOST -U $POSTGRES_USER $POSTGRES_DB
   ```
4. Restart the application.
5. Verify data integrity.

### 3.2 Redis Restore

1. Stop the Redis service.
2. Restore the desired snapshot to the Redis data volume as `dump.rdb`.
3. Start Redis.
4. Verify keys are populated with `redis-cli dbsize`.

### 3.3 Restore Testing

Perform a full restore of the latest PostgreSQL and Redis backups in staging on the first Monday of every month.

## 4. Application Recovery

1. Start PostgreSQL.
2. Start Redis.
3. Start the application process.
4. Verify `GET /health` and `GET /ready`.

## 5. Verification Checklist

- [ ] PostgreSQL backups are present and non-empty.
- [ ] Redis snapshots are being generated hourly.
- [ ] S3 uploads (if configured) are successful.
- [ ] Restore validation passes in staging.
