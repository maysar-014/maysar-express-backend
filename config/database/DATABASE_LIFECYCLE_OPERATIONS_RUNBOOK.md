# Maysar Database Lifecycle Operations Runbook

**Document ID:** MAY-ENG-OPS-001  
**Version:** 1.0  
**Status:** Proposed — Pre-Launch Adoption  
**Owner:** Maysar Engineering  
**Related Standards:** DATA_CLASSIFICATION_STANDARD.md, DATA_RETENTION_REGISTRY.md, DATABASE_STORAGE_MANAGEMENT_STANDARD.md, DATABASE_DELETION_STANDARD.md, DATABASE_ARCHIVAL_STANDARD.md, DATABASE_BACKUP_AND_RECOVERY_STANDARD.md, DATABASE_CAPACITY_MANAGEMENT_STANDARD.md, DATABASE_MIGRATION_AND_PORTABILITY_STANDARD.md

---

## 1. Purpose

This runbook defines day-to-day operational procedures for managing the Maysar PostgreSQL database lifecycle, including backup verification, cleanup execution, storage monitoring, and incident response.

---

## 2. Daily Operations Checklist

| # | Task | Command | Expected Result | Owner |
|---|------|---------|-----------------|-------|
| 1 | Verify backup success | `tail -20 /var/log/postgres-backup.log` | "Backup completed" message | On-call engineer |
| 2 | Verify WAL archiving | `SELECT archived_count, failed_count FROM pg_stat_archiver;` | `failed_count = 0` | On-call engineer |
| 3 | Check backup disk usage | `df -h /backups` | < 80% used | On-call engineer |
| 4 | Review Prometheus alerts | Check Alertmanager dashboard | No active backup alerts | On-call engineer |
| 5 | Check database growth | `SELECT pg_database_size('maysar');` | Below 80% threshold | On-call engineer |

---

## 3. Weekly Operations Checklist

| # | Task | Command | Expected Result | Owner |
|---|------|---------|-----------------|-------|
| 1 | Run restore verification | `ENCRYPTION_KEY=<key> sh scripts/backup/postgres-restore-verify.sh <backup_file>` | Pass: table/row parity match | On-call engineer |
| 2 | Review index usage | `SELECT * FROM pg_stat_user_indexes ORDER BY idx_scan DESC LIMIT 10;` | No unused indexes | Database engineer |
| 3 | Check dead tuples | `SELECT * FROM pg_stat_user_tables WHERE n_dead_tup > reltuples * 0.2;` | < 20% dead tuples | Database engineer |
| 4 | Review backup logs | `cat /var/log/postgres-backup.log` | No errors | On-call engineer |
| 5 | Check archive status | `ls -la /var/lib/postgresql/wal_archive/` | WAL files present | On-call engineer |

### 4. Monthly Operations Checklist

| # | Task | Command | Expected Result | Owner |
|---|------|---------|-----------------|-------|
| 1 | Run VACUUM ANALYZE | `VACUUM ANALYZE;` | Completed without errors | Database engineer |
| 2 | Review index usage | `SELECT * FROM pg_stat_user_indexes ORDER BY idx_scan DESC LIMIT 20;` | No unused indexes > 30 days | Database engineer |
| 3 | Check table bloat | `SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) FROM pg_tables ORDER BY 2 DESC;` | No table > 10% bloat | Database engineer |
| 4 | Review backup retention | Review `DATA_RETENTION_REGISTRY.md` | All policies current | Data owner |
| 5 | Test backup restoration | `postgres-restore-verify.sh <backup_file>` | Pass: table/row parity match | Database engineer |

### 5. Quarterly Operations Checklist

| # | Task | Command | Expected Result | Owner |
|---|------|---------|-----------------|-------|
| 1 | Full restore drill | `scripts/backup/postgres-restore-verify.sh <backup_file>` | Pass: complete restore successful | Database engineer |
| 2 | PITR test | `scripts/backup/postgres-restore-pitr.sh <timestamp> <test_db>` | Pass: data matches target timestamp | Database engineer |
| 3 | Index review | Review unused indexes for removal | Unused indexes documented | Database engineer |
| 4 | Capacity planning | Review `pg_database_size` trend | Growth rate documented | Platform engineer |
| 5 | Encryption key rotation | Rotate `BACKUP_ENCRYPTION_KEY` | New key in secrets manager | Security engineer |
| 6 | Migration test | Test export/import to staging | Migration successful | Platform engineer |

### 6. Backup Verification Procedure

```bash
# 1. Identify backup file to verify
BACKUP_FILE="/backups/postgres/maysar_maysar_<timestamp>.sql.gz.enc"

# 2. Run verification
ENCRYPTION_KEY=<key> sh scripts/backup/postgres-restore-verify.sh "$BACKUP_FILE"

# 3. Verify exit code
if [ $? -eq 0 ]; then
  echo "Verification PASSED"
else
  echo "Verification FAILED - investigate immediately"
  # Alert on-call engineer
fi
```

---

## 7. Cleanup Job Execution

```bash
# 1. Dry-run first (recommended)
ENCRYPTION_KEY=<key> sh scripts/cleanup-database.sh --dry-run

# 2. Review dry-run output
# Verify only expected records will be deleted

# 3. Execute cleanup
ENCRYPTION_KEY=<key> sh scripts/cleanup-database.sh

# 4. Verify results
echo "Deleted $(deleted_count) records"
```


### 8. Incident Response: Backup Failure

| Step | Action | Command |
|------|--------|---------|
| 1 | Acknowledge alert | Acknowledge in Prometheus Alertmanager |
| 2 | Check backup logs | `cat /var/log/postgres-backup.log` |
| 3 | Verify database connectivity | `pg_isready -h <host> -U <user>` |
| 4 | Check disk space | `df -h /backups` |
| 5 | Re-run backup | `PGPASSWORD=<pw> sh scripts/backup/postgres-backup.sh` |
| 6 | Verify backup succeeded | Check log for "Backup completed" |
| 7 | Close alert | Close in Alertmanager |

### 9. Incident Response: Restore Verification Failure

| Step | Action | Command |
|------|--------|---------|
| 1 | Acknowledge alert | Acknowledge in Prometheus Alertmanager |
| 2 | Run manual restore test | `ENCRYPTION_KEY=<key> sh scripts/backup/postgres-restore-verify.sh <backup_file>` |
| 3 | Check restore logs | Check output for specific error |
| 4 | Investigate backup integrity | Check backup file integrity |
| 5 | If backup corrupt, use previous backup | Use previous known-good backup |
| 6 | Document incident | Write incident report |
| 7 | Close alert | Close in Alertmanager |

### 10. Incident Response: Storage Near Capacity

| Step | Action | Command |
|------|--------|---------|
| 1 | Acknowledge alert | Acknowledge in Prometheus Alertmanager |
| 2 | Check largest tables | `SELECT tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) FROM pg_tables ORDER BY 2 DESC LIMIT 10;` |
| 3 | Check retention compliance | Review `DATA_RETENTION_REGISTRY.md` |
| 4 | Run cleanup if eligible | `ENCRYPTION_KEY=<key> sh scripts/cleanup-database.sh` |
| 5 | Archive historical data | Archive C3 tables to object storage |
| 6 | Plan capacity expansion | If < 20% free space, plan expansion |
| 7 | Close alert | Close in Alertmanager |

### 11. Related Documents

- `MAYSAR_INFRASTRUCTURE_CONSTITUTION.md` — Governing principles
- `DATA_CLASSIFICATION_STANDARD.md` — Classification definitions
- `DATA_RETENTION_REGISTRY.md` — Per-table retention policies
- `DATABASE_STORAGE_MANAGEMENT_STANDARD.md` — Storage handling per classification
- `DATABASE_DELETION_STANDARD.md` — Deletion rules per classification
- `DATABASE_ARCHIVAL_STANDARD.md` — Archival standards
- `DATABASE_BACKUP_AND_RECOVERY_STANDARD.md` — Backup and recovery standards
- `DATABASE_CAPACITY_MANAGEMENT_STANDARD.md` — Capacity management standards
- `DATABASE_MIGRATION_AND_PORTABILITY_STANDARD.md` — Migration standards

---

**End of Document**

