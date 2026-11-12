# Maysar Database Operations Runbook

**Document ID:** MAYSAR-OPS-001  
**Version:** 1.0  
**Owner:** Maysar Engineering  
**Related Constitution:** MAYSAR-INFRA-CON-001 (Sections 4, 7, 8, 10)

---

## 1. Daily Operations Checklist

Run each business day:

| # | Task | Command | Expected Result |
|---|------|---------|-----------------|
| 1 | Verify last backup succeeded | Check `/var/log/postgres-backup.log` | "Backup completed" message |
| 2 | Verify WAL archiving is active | `SELECT archived_count, failed_count FROM pg_stat_archiver;` | `failed_count = 0` |
| 3 | Check backup disk usage | `df -h /backups` | < 80% used |
| 4 | Review Prometheus alerts | Check Alertmanager dashboard | No active backup alerts |
| 5 | Verify encryption key custody | Confirm `BACKUP_ENCRYPTION_KEY` is in secrets manager, not in Git | Key present in secrets manager only |


## 2. Backup Operations

### 2.1 Logical Backup (pg_dump -Fc)

**Schedule:** Hourly (Docker Compose prod) / Daily 2 AM UTC (portable)  
**Script:** `scripts/backup/postgres-backup.sh`  
**Output:** `{PREFIX}_{DB}_{TIMESTAMP}.sql.gz[.enc]` in `/backups/postgres/`

**Manual execution:**
```sh
PGPASSWORD=<backup_password> ./scripts/backup/postgres-backup.sh
```

**Verification:**
```sh
# Check file exists and is non-empty
ls -lh /backups/postgres/

# Verify gzip integrity
gzip -t /backups/postgres/maysar_maysar_*.sql.gz

# If encrypted, verify decryption works
openssl enc -d -aes-256-cbc -pbkdf2 -in /backups/postgres/*.enc -pass pass:<encryption_key> | gzip -t
```

### 2.2 Physical Backup + WAL Archive (pgBackRest)

**Schedule:** Hourly (via postgres-backup.sh)  
**WAL Archive:** Continuous (archive_mode=on, archive_timeout=60s)  
**Repository:** `/var/lib/pgbackrest/` (synced to S3)

**Manual full backup:**
```sh
pgbackrest --stanza=maysar --config=/etc/pgbackrest.conf --type=full backup
```

**Push pending WAL archives:**
```sh
pgbackrest --stanza=maysar --config=/etc/pgbackrest.conf archive-push
```

**Check backup status:**
```sh
pgbackrest --stanza=maysar --config=/etc/pgbackrest.conf info
```

### 2.3 Redis Backup

**Schedule:** Hourly  
**Script:** `scripts/backup/redis-backup.sh`  
**Output:** `redis_{TIMESTAMP}.rdb.gz[.enc]` in `/backups/redis/`

**Manual execution:**
```sh

## 3. Restore Procedures

### 3.1 Logical Restore (Full Database)

**Script:** `scripts/backup/postgres-restore.sh`

```sh
# Restore latest backup to default database
RESTORE_OVERWRITE=1 ./scripts/backup/postgres-restore.sh

# Restore specific backup file to a custom database
./scripts/backup/postgres-restore.sh \
  /backups/postgres/maysar_maysar_20240115T103000Z.sql.gz \
  maysar_recovery
```

**Post-restore verification:**
```sh
./scripts/backup/postgres-restore-verify.sh \
  /backups/postgres/maysar_maysar_20240115T103000Z.sql.gz
```

### 3.2 Point-in-Time Recovery (PITR)

**Script:** `scripts/backup/postgres-restore-pitr.sh`

```sh
# Restore to a specific timestamp
RESTORE_OVERWRITE=1 ./scripts/backup/postgres-restore-pitr.sh \
  "2024-01-15 10:30:00+00" \
  maysar

# Restore to latest available WAL
RESTORE_OVERWRITE=1 ./scripts/backup/postgres-restore-pitr.sh \
  "" \
  maysar
```

**Prerequisites:**
- pgBackRest base backup exists
- WAL archives cover the target time
- PostgreSQL is stopped on the target (pgBackRest --delta handles this)

### 3.3 Selective Table Restore (Logical Backup Only)

Since logical backups use `pg_dump -Fc` (custom format), you can restore individual tables:

```sh
pg_restore \
  --host=<host> \
  --port=<port> \
  --username=<user> \
  --dbname=<target_db> \
  --table=orders \
  --data-only \
  /backups/postgres/maysar_maysar_*.sql.gz
```

## 4. Monitoring & Alert Response

### 4.1 BackupFailure Alert

**Trigger:** `maysar_backup_success == 0` for 10 minutes  
**Severity:** Critical

**Response:**
1. Check backup logs: `cat /var/log/postgres-backup.log`
2. Verify PostgreSQL connectivity: `pg_isready -h postgres -U maysar_backup`
3. Verify disk space: `df -h /backups`
4. Re-run backup manually: `PGPASSWORD=<pw> ./scripts/backup/postgres-backup.sh`
5. If S3 upload fails, verify AWS credentials and bucket permissions

### 4.2 BackupDiskUsageHigh Alert

**Trigger:** Backup disk free space < 20% for 5 minutes  
**Severity:** Warning

**Response:**
1. Check backup retention: `find /backups -name "*.sql.gz*" -mtime +7`
2. Reduce `BACKUP_RETENTION_DAYS` if appropriate
3. Expand backup volume size
4. Verify old backups are being pruned correctly

### 4.3 RestoreVerificationStale Alert

**Trigger:** No successful restore verification in 7 days  
**Severity:** Critical

**Response:**
1. Run verification manually: `./scripts/backup/postgres-restore-verify.sh <backup_file>`
2. Check verification logs: `cat /var/log/postgres-verify.log`
3. If verification fails, investigate backup integrity
4. Schedule a full restore drill (see `config/database/restore-drill-runbook.md`)

## 5. Encryption Key Management

### 5.1 Key Storage

- **Never** commit `BACKUP_ENCRYPTION_KEY` to Git
- Store in your secrets manager (AWS Secrets Manager, HashiCorp Vault, etc.)
- Inject at runtime via environment variable
- Rotate every 90 days

### 5.2 Key Rotation Procedure

1. Generate new encryption key
2. Update `BACKUP_ENCRYPTION_KEY` in secrets manager
3. Restart backup containers to pick up new key
4. Verify new backups are encrypted with new key
5. Keep old key accessible for decrypting existing backups until they expire
6. After retention period expires, old backups (encrypted with old key) are deleted

### 5.3 Decrypting a Backup

```sh
openssl enc -d -aes-256-cbc -pbkdf2 \
  -in /backups/postgres/maysar_maysar_*.sql.gz.enc \
  -out /backups/postgres/maysar_maysar_*.sql.gz \
  -pass pass:<encryption_key>
```

## 6. S3 Offsite Storage

### 6.1 Configuration

- `BACKUP_S3_BUCKET` — S3 bucket name
- `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` — S3 credentials
- `AWS_DEFAULT_REGION` — AWS region (default: us-east-1)
- Storage class: STANDARD_IA (infrequent access)

### 6.2 Verifying S3 Uploads

```sh
aws s3 ls s3://<bucket>/postgres/logical/
aws s3 ls s3://<bucket>/pgbackrest/
```

### 6.3 Restoring from S3

```sh
# Download logical backup from S3
aws s3 cp s3://<bucket>/postgres/logical/maysar_maysar_*.sql.gz.enc .

# Decrypt (if encrypted)
openssl enc -d -aes-256-cbc -pbkdf2 -in *.enc -out *.sql.gz -pass pass:<key>

# Restore
RESTORE_OVERWRITE=1 ./scripts/backup/postgres-restore.sh *.sql.gz
```

## 7. Incident Response: Backup Failure

### 7.1 Immediate Actions (0–15 min)

1. Acknowledge the alert
2. Check backup logs for error details
3. Verify database connectivity
4. Verify disk space on backup volume

### 7.2 Investigation (15–60 min)

1. Identify failure point (pg_dump, pgBackRest, encryption, S3 upload)
2. Check if WAL archiving is still running
3. Verify pgBackRest stanza status
4. Review recent changes (migrations, config updates, deployments)

### 7.3 Recovery (60 min–4 hours)

1. Fix the root cause
2. Run a manual backup
3. Verify the backup is restorable
4. Confirm Prometheus alert clears

### 7.4 Escalation

If backup cannot be restored within 4 hours:
1. Notify engineering lead
2. Initiate restore drill using last known good backup
3. Assess data loss exposure (RPO)
4. Consider application-level mitigation (read-only mode, etc.)

## 8. Maintenance Schedule

| Frequency | Task | Owner |
|-----------|------|-------|
| Daily | Verify backup success, check alerts | On-call engineer |
| Weekly | Run restore verification (automated cron) | System |
| Quarterly | Full restore drill, measure RPO/RTO | Engineering team |
| Every 90 days | Rotate encryption keys, review passwords | Security engineer |
| Annually | Review retention policy, disaster recovery plan | Engineering lead |

## 9. Related Documents

- `MAYSAR_INFRASTRUCTURE_CONSTITUTION.md` — Governing engineering document
- `MAYSAR_BACKUP_GAP_ANALYSIS.md` — Gap analysis and remediation roadmap
- `config/database/least-privilege-roles.sql` — Database role definitions
- `config/database/restore-drill-runbook.md` — Quarterly restore drill procedure
- `config/pgbackrest.conf` — pgBackRest configuration
REDIS_PASSWORD=<password> ./scripts/backup/redis-backup.sh
```