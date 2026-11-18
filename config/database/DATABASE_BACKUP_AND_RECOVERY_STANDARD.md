# Maysar Database Backup and Recovery Standard

**Document ID:** MAY-ENG-DATA-006  
**Version:** 1.0  
**Status:** Proposed — Pre-Launch Adoption  
**Owner:** Maysar Engineering  
**Related Constitution:** MAYSAR_INFRASTRUCTURE_CONSTITUTION.md (Article VII — Recovery Engineering)  
**Related Standards:** DATA_CLASSIFICATION_STANDARD.md, DATA_RETENTION_REGISTRY.md, DATABASE_STORAGE_MANAGEMENT_STANDARD.md, DATABASE_ARCHIVAL_STANDARD.md

---

## 1. Purpose

This standard defines Maysar's database backup and recovery requirements. Backups and recovery are separate controls — a backup is not a substitute for a retention policy, and archival is not a substitute for backup.

---

## 2. Backup Types and Frequency

| Backup Type | Frequency | Retention | Storage | Purpose |
|-------------|-----------|-----------|---------|---------|
| Logical dump (pg_dump -Fc) | Daily | 30 days | Encrypted object storage | Selective restore, portability |
| Physical base backup (pgBackRest) | Weekly | 30 days | Encrypted object storage | Full disaster recovery |
| WAL archiving | Continuous (archive_timeout=60s) | 30 days | Encrypted object storage | Point-in-time recovery |
| Redis RDB snapshot | Hourly | 7 days | Encrypted object storage | Cache restoration |

---

## 3. Backup Retention Requirements

| Environment | Backup Retention | PITR Window |
|-------------|-----------------|-------------|
| Development | 7 days | Not required |
| Staging | 14 days | 7 days |
| Production | 30 days | 7 days |

---

## 4. Encryption Requirements

All backups must be encrypted client-side before leaving the Maysar network:

| Backup Type | Encryption Method | Key Management |
|-------------|-------------------|----------------|
| Logical dumps | AES-256-CBC + PBKDF2 | Secrets Manager |
| Physical backups | AES-256-CBC + PBKDF2 | Secrets Manager |
| Redis RDB snapshots | AES-256-CBC + PBKDF2 | Secrets Manager |
| WAL archives | AES-256-CBC + PBKDF2 | Secrets Manager |

Encryption keys must be stored separately from backups. Recovery credentials must be escrowed separately from operational credentials.

---

## 5. Backup Verification Requirements

| Verification Type | Frequency | Method | Pass Criteria |
|-------------------|-----------|--------|---------------|
| Automated restore verification | Weekly | Restore to staging, compare table/row counts | 100% table parity |
| Full restore drill | Quarterly | Full production-equivalent restore | RTO < 4 hours, RPO < 1 hour |
| PITR test | Quarterly | Restore to specific timestamp | Data matches target timestamp |
| Encryption key rotation test | Every 90 days | Decrypt with rotated key | Successful decryption |

---

## 6. Backup Verification Script

`scripts/backup/postgres-restore-verify.sh` performs automated verification:

- Restores backup to a temporary database
- Compares table structure and row counts between source and restored
- Fails if any mismatch is detected
- Cleans up test database after verification (unless KEEP_RESTORE_TEST_DB=1)

---

## 7. Backup Storage Locations

| Backup Type | Primary Storage | Offsite Storage | Encryption |
|-------------|----------------|-----------------|------------|
| Logical dumps | /backups/postgres | S3-compatible object storage | Client-side AES-256 |
| Physical backups | /var/lib/pgbackrest | S3-compatible object storage | Client-side AES-256 |
| WAL archives | /var/lib/postgresql/wal_archive | S3-compatible object storage | Client-side AES-256 |
| Redis snapshots | /backups/redis | S3-compatible object storage | Client-side AES-256 |

---

## 8. Backup Monitoring

| Alert | Condition | Severity |
|-------|-----------|----------|
| BackupFailure | maysar_backup_success == 0 for 10m | Critical |
| BackupDiskUsageHigh | Backup disk free < 20% for 5m | Warning |
| RestoreVerificationStale | No successful verification in 7 days | Critical |

---

## 9. Non-Negotiable Prohibitions

Maysar prohibits:

| Prohibition | Reason |
|-------------|--------|
| Storing backups unencrypted | Data exposure |
| Storing encryption keys with backups | Key compromise |
| Running backups without verification | False confidence |
| Using backup success as proof of restoration | False confidence |
| Deleting backups before retention expiry | Data loss |
| Allowing backup volume to fill without alerting | Data loss |

---

## 10. Related Documents

- `MAYSAR_INFRASTRUCTURE_CONSTITUTION.md` — Article VII (Recovery Engineering)
- `DATA_CLASSIFICATION_STANDARD.md` — Classification definitions
- `DATA_RETENTION_REGISTRY.md` — Per-table retention policies
- `DATABASE_STORAGE_MANAGEMENT_STANDARD.md` — Storage handling per classification
- `DATABASE_ARCHIVAL_STANDARD.md` — Archival standards
- `DATABASE_DELETION_STANDARD.md` — Deletion rules per classification
- `DATABASE_LIFECYCLE_OPERATIONS_RUNBOOK.md` — Operational procedures

---

**End of Document**
