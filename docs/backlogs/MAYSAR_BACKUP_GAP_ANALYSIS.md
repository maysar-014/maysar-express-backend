# Maysar Backup & Recovery Gap Analysis

**Document ID:** MAYSAR-GAP-001  
**Version:** 1.0  
**Status:** Draft  
**Owner:** Maysar Engineering  
**Related Constitution:** MAYSAR-INFRA-CON-001  
**Date:** Pre-launch baseline assessment

---

## 1. Executive Summary

This analysis compares Maysar's current backup and recovery implementation against the standards defined in the Maysar Infrastructure Constitution. The current state provides a functional but minimal foundation: logical PostgreSQL dumps and Redis RDB snapshots run on cron, with optional S3 offloading. However, it falls short of the constitution in five critical areas: no physical backup/WAL archiving (no PITR), no client-side encryption, no automated restore verification schedule, no independent backup monitoring, and backup storage co-located with live data.

Overall readiness: Phase 1 (Foundation) partially complete; Phase 2 (Data Protection) not started.

---

## 2. Current State Inventory

### 2.1 Existing Backup Scripts

| Script | Location | Schedule | Retention | Destination |
|--------|----------|----------|-----------|-------------|
| postgres-backup.sh | scripts/backup/ | Hourly (Docker prod), Daily 2AM (portable) | 7 days (Docker), 30 days (.env.postgres.example) | /backups/postgres (local volume) |
| postgres-restore.sh | scripts/backup/ | On-demand | N/A | Restores to target DB |
| postgres-restore-verify.sh | scripts/backup/ | On-demand | N/A | Verifies table/row parity |
| redis-backup.sh | scripts/backup/ | Hourly (cron) | 7 days | /backups/redis, optional S3 |

### 2.2 Current Docker Compose Production Backup Configuration

From docker-compose.prod.yml:

- postgres-backup service: postgres:15-alpine, mounts postgres-backup.sh read-only, shares backups volume, runs crond -f -l 2 with cron entry 0 * * * *
- redis-backup service: redis:7-alpine, mounts redis-backup.sh read-only + redis_data volume read-only, shares backups volume, runs crond -f -l 2 with cron entry 0 * * * *
- Both services install aws-cli at runtime for optional S3 upload
- Both services write to the same backups named volume as application data

### 2.3 Environment Variables (from .env.example and .env.postgres.example)

| Variable | Default | Constitution Requirement | Status |
|----------|---------|--------------------------|--------|
| POSTGRES_BACKUP_RETENTION_DAYS | 7 | Configurable retention | Present |
| REDIS_BACKUP_RETENTION_DAYS | 7 | Configurable retention | Present |
| BACKUP_S3_BUCKET | (empty) | S3-compatible independent storage | Present but empty |
| AWS_ACCESS_KEY_ID | (empty) | Credentials for S3 upload | Present but empty |
| AWS_SECRET_ACCESS_KEY | (empty) | Credentials for S3 upload | Present but empty |
| POSTGRES_BACKUP_DIR | /backups/postgres | Independent backup directory | Present (postgres portable) |
| POSTGRES_BACKUP_CRON | 0 2 * * * | Scheduled backups | Present (postgres portable) |

## 3. Gap Analysis by Constitution Section

### 3.1 Section 3 — Approved Technology Standards

| Constitution Requirement | Current Implementation | Gap | Severity |
|--------------------------|----------------------|-----|----------|
| pgBackRest for physical backup | Not used | Major | Critical |
| WAL Archiving / PITR for transaction recovery | Not configured | Major | Critical |
| pg_dump -Fc (custom format) logical backup | pg_dump --format=plain | Minor | Moderate |
| S3-compatible independent provider for object storage | S3_BUCKET variable exists but unused by default | Partial | Moderate |
| Client-side encryption for backups | Not implemented | Major | Critical |
| Docker Compose deployment | In use | Compliant | OK |
| Version-controlled IaC | Docker Compose files in Git | Compliant | OK |

Finding: The current stack relies solely on logical dumps. Without WAL archiving or pgBackRest, Maysar cannot perform point-in-time recovery. Without client-side encryption, backups stored offsite are vulnerable if the storage bucket is compromised.

### 3.2 Section 4 — Non-Negotiable Engineering Standards

| Constitution Standard | Current Implementation | Gap | Severity |
|-----------------------|----------------------|-----|----------|
| Single Point of Failure | backups volume shared with app; no offsite copy by default | Major | Critical |
| Data Protection | Backups not encrypted; keys not escrowed separately | Major | Critical |
| Backup Reliability | postgres-restore-verify.sh exists but is not automated | Major | Critical |
| Security | Passwords via env vars; no least-privilege DB roles documented | Moderate | High |
| Deployment | Reproducible via Docker Compose | Compliant | OK |
| Database Integrity | No automated consistency checks after restore | Moderate | High |
| Recovery | Restore scripts exist but no tested drill schedule | Major | Critical |
| Observability | Prometheus does not track backup status, disk growth, or restore verification | Major | Critical |
| Documentation | Scripts have inline comments but no formal runbooks | Moderate | High |
| Cost Management | No cost baseline or monitoring | Moderate | Moderate |

Finding: The restore verification script exists but is never scheduled to run automatically. There is no evidence that any restore has ever been tested against production-equivalent data. Monitoring has zero visibility into backup success or failure.

### 3.3 Section 5 — Implementation Phases

| Phase | Constitution Exit Criteria | Current Status | Gap |
|-------|---------------------------|----------------|-----|
| Phase 1 — Foundation | All infrastructure in version control; environments separated | Partial | Docker Compose and scripts are in Git, but environment separation (dev/staging/prod DBs) needs verification |
| Phase 2 — Data Protection | Backups running, encrypted, stored offsite, retention enforced | Not started | No encryption, no pgBackRest, no WAL, no S3 default, no offsite guarantee |
| Phase 3 — Recovery Engineering | Restore test succeeds; RPO/RTO measured | Not started | Verification script not automated; no drill schedule; no RPO/RTO metrics |
| Phase 4 — Operational Resilience | Alerts configured; runbooks published; capacity trend visible | Not started | No backup alerts; no capacity monitoring for DB size |
| Phase 5 — Production Readiness | DR drill passed; Constitution signed off | Not started | No drills conducted |


## 4. Specific Technical Gaps

### 4.1 No Physical Backup or PITR

Current: pg_dump produces a logical SQL dump at a single point in time. If corruption occurs between dumps, up to 1 hour (or 24 hours in portable mode) of transactions are lost.

Constitution requires: pgBackRest base backups + continuous WAL archiving, enabling PITR to any timestamp within the retention window.

Impact: RPO is currently bounded by the cron interval (1 hour or 24 hours), not by business requirements.

### 4.2 No Client-Side Encryption

Current: Backup .sql.gz and .rdb.gz files are written plaintext to the backups volume. S3 upload (when configured) uses server-side transfer but the files are not encrypted before upload.

Constitution requires: Encrypt before upload; encryption keys stored separately from backups.

Impact: Anyone with access to the backup volume or S3 bucket can read all business data.

### 4.3 Backup Storage Co-located with Live Data

Current: Both postgres_data and backups are named volumes managed by the same Docker Compose stack. A catastrophic failure of the host or volume driver can destroy both live data and backups simultaneously.

Constitution requires: Independent storage layer (L3) recoverable without assuming L1/L2 are operational.

Impact: The backup strategy does not protect against host failure, volume corruption, or accidental deletion of the Docker volume.

### 4.4 No Automated Restore Verification

Current: postgres-restore-verify.sh exists but requires manual invocation. There is no cron, CI job, or scheduler that runs it.

Constitution requires: Automated verification at least weekly against a staging clone; quarterly production-equivalent drill.

Impact: There is no evidence that backups are restorable. The team may discover corruption only during an actual emergency.

### 4.5 No Independent Monitoring or Alerting

Current: infra/prometheus/alert-rules.yml monitors payment failures, connection pool errors, HTTP 5xx rates, and pod restarts. Zero alerts exist for backup failure, backup disk usage, or restore verification status.

Constitution requires: Independent monitoring with alerts for backup failure, disk >80%, PITR window, and last successful restore timestamp.

Impact: A silent backup failure would go undetected until someone manually checks.

### 4.6 Logical Backup Format Not Optimized

Current: pg_dump --format=plain produces human-readable SQL. This is larger and slower to restore than custom format.

Constitution requires: pg_dump -Fc (custom format) for portability and selective restore.

Impact: Restores are slower and files are larger than necessary.


## 5. Recommended Remediation Roadmap

### Immediate (Pre-Launch, Phase 1–2)

| # | Action | Constitution Ref | Effort |
|---|--------|------------------|--------|
| 1 | Separate backup storage volume from live data volume in docker-compose.prod.yml | Section 2 (Cross-layer rule) | Low |
| 2 | Schedule postgres-restore-verify.sh to run weekly via cron or CI | Section 7.4 | Low |
| 3 | Add client-side encryption (e.g., age or gpg) to postgres-backup.sh and redis-backup.sh | Section 7.3 | Moderate |
| 4 | Escrow encryption keys separately from backup storage | Section 8.3 | Low |
| 5 | Add Prometheus alerts for backup failure, disk usage >80%, and last successful restore | Section 10.2 | Moderate |
| 6 | Switch pg_dump from --format=plain to -Fc | Section 3 | Low |
| 7 | Document runbooks for backup and restore procedures | Section 4 (Documentation) | Moderate |

### Short-Term (Phase 2–3)

| # | Action | Constitution Ref | Effort |
|---|--------|------------------|--------|
| 8 | Implement pgBackRest with WAL archiving for PITR | Section 3 | High |
| 9 | Configure S3-compatible independent storage as default backup target | Section 3 | Moderate |
| 10 | Conduct first quarterly restore drill; measure RPO/RTO | Section 5, Section 12 | High |
| 11 | Implement least-privilege database roles for application and backup services | Section 8.2 | Moderate |

### Ongoing (Phase 4–5)

| # | Action | Constitution Ref | Frequency |
|---|--------|------------------|-----------|
| 12 | Review retention policy against business requirements | Section 7.2 | Quarterly |
| 13 | Test disaster recovery drill | Section 5 | Quarterly |
| 14 | Audit encryption key custody and rotation | Section 8.1 | Every 90 days |
| 15 | Update Constitution change log | Appendix B | As needed |

### Minimal Viable Changes (Start Here)

If engineering capacity is limited, implement these four changes first. They address the most critical gaps with the least effort:

1. Add backup failure alerting to Prometheus (infra/prometheus/alert-rules.yml).
2. Schedule postgres-restore-verify.sh weekly via cron in the backup container.
3. Add client-side encryption to both backup scripts using age encryption with keys stored outside the backup volume.
4. Mount /backups on a separate host path or volume from /data/postgres in docker-compose.prod.yml.

These four changes move Maysar from backups exist to backups are verified, encrypted, isolated, and monitored — satisfying the most critical constitution requirements before launch.

## 6. Acceptance Criteria for Gap Closure

The gaps in this analysis are considered closed when:

- A restore drill has been completed successfully within the last 90 days.
- Backup verification runs automatically and results are stored in version control.
- All backups are encrypted client-side before leaving the Maysar network.
- Backup storage is on a volume independent from live PostgreSQL data.
- Prometheus alerts fire on backup failure and disk >80%.
- Encryption keys are stored separately from backups and recovery credentials are escrowed.
- RPO and RTO have been measured and documented.
- Engineering lead has signed MAYSAR-INFRA-CON-001.

| POSTGRES_BACKUP_FILE_PREFIX | maysar | Naming convention | Present (postgres portable) |
