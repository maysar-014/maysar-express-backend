# Disaster Recovery Guide

This document outlines the strategy and procedures for recovering the Maysar system in the event of major data loss or infrastructure failure.

## 1. RPO / RTO Targets

| Component | RPO | RTO | Strategy |
|---|---|---|---|
| PostgreSQL (primary DB) | 60 min | 60 min | Hourly full backup |
| Redis (cache/sessions) | 60 min | 10 min | Hourly RDB snapshot |
| Kafka (event broker) | 0 (replicated) | 5 min | Partition replication + broker failover |
| Application services | N/A | 2 min | Docker Compose `restart: unless-stopped` + health checks |

## 2. Backup Schedule & Retention

| Backup Type | Schedule (cron) | Retention | Storage |
|---|---|---|---|
| PostgreSQL full dump | `0 * * * *` (Hourly) | 7 days local / 90 days S3 | `$BACKUP_DIR/postgres/` |
| Redis RDB snapshot | `0 * * * *` (Hourly) | 7 days local / 30 days S3 | `$BACKUP_DIR/redis/` |

## 3. Restore Procedures

### 3.1 PostgreSQL Restore

1.  Stop the `maysar-backend` service to prevent writes.
2.  Choose the backup file to restore from `$BACKUP_DIR/postgres/`.
3.  Run the restore command:
    ```bash
    gunzip -c backup_filename.sql.gz | psql -h $POSTGRES_HOST -U $POSTGRES_USER $POSTGRES_DB
    ```
4.  Restart the `maysar-backend` service.
5.  Verify data integrity.

### 3.2 Redis Restore

1.  Stop the `redis` service.
2.  Copy the desired backup from `$BACKUP_DIR/redis/` to the Redis data volume as `dump.rdb` (uncompressed).
    ```bash
    gunzip -c redis_backup.rdb.gz > /var/lib/docker/volumes/maysar_redis_data/_data/dump.rdb
    ```
3.  Start the `redis` service.
4.  Verify that keys are populated: `redis-cli dbsize`.

### 3.3 Restore Testing Schedule (monthly)

Every first Monday of the month, a full restore of the latest PostgreSQL and Redis backups must be performed in a staging environment to verify backup validity.

## 4. Kafka Broker Failover

### 4.1 Single Broker Failure
The cluster is configured with a replication factor of 3. If one broker fails, the others will automatically take over leadership for its partitions.

### 4.2 Full Cluster Loss
In case of full cluster loss, the Kafka brokers must be redeployed.
Reference the `KAFKA_BROKERS` env var introduced in Phase 1 for broker failover configuration.

### 4.3 Consumer Group Lag Recovery
If consumer lag grows excessively after a recovery:
1.  Scale up consumer instances.
2.  Inspect `shared/events/kafka.event-bus.ts` for error handling logic.

## 5. Service Recovery Order

In a full system restart, follow this dependency graph:
`postgres` → `redis` → `kafka` → `app services`

## 6. Verification Checklist

- [ ] PostgreSQL backups are present and non-empty.
- [ ] Redis RDB files are being generated hourly.
- [ ] S3 uploads (if configured) are successful.
- [ ] `scripts/production-readiness/disaster-recovery.ts` simulation passes successfully.
