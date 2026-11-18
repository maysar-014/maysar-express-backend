# Maysar Database Storage Management Standard

**Document ID:** MAY-ENG-DATA-003  
**Version:** 1.0  
**Status:** Proposed — Pre-Launch Adoption  
**Owner:** Maysar Engineering  
**Related Constitution:** MAYSAR_INFRASTRUCTURE_CONSTITUTION.md (Article VIII — Storage Management)  
**Related Standards:** DATA_CLASSIFICATION_STANDARD.md, DATA_RETENTION_REGISTRY.md

---

## 1. Purpose

This standard defines how Maysar manages database storage for each classification tier, including storage limits, monitoring thresholds, archival triggers, and cleanup procedures.

---

## 2. Storage Management by Classification

| Classification | Storage Location | Storage Medium | Encryption | Backup Frequency | Retention Policy | Max Size per Table |
|----------------|-----------------|----------------|------------|------------------|------------------|-------------------|
| C1 — Critical | Primary PostgreSQL | Encrypted EBS/SSD | AES-256 at rest | Daily full + continuous WAL | Per retention registry | No fixed limit; monitor growth |
| C2 — Essential | Primary PostgreSQL | Encrypted EBS/SSD | AES-256 at rest | Daily full + continuous WAL | Per retention registry | Monitor growth |
| C3 — Historical | Archive PostgreSQL / Object Storage | Compressed object storage | AES-256 at rest | Weekly | Per retention registry | Archive after 1 year |
| C4 — Temporary | Primary PostgreSQL / In-memory | Encrypted EBS/SSD | AES-256 at rest | Not backed up | TTL-based deletion | Monitor for runaway growth |
| C5 — Disposable | Primary PostgreSQL | Encrypted EBS/SSD | AES-256 at rest | Not backed up | On-demand deletion | Monitor for runaway growth |

---

## 3. Storage Monitoring

| Metric | Alert Threshold | Action Required |
|--------|----------------|-----------------|
| Total database size | > 80% of allocated storage | Plan capacity expansion |
| Individual table size | > 10 GB for C3/C4 tables | Review retention policy |
| Index size vs. table size | > 50% of table size | Review index necessity |
| WAL generation rate | > 1 GB/hour sustained | Investigate runaway transactions |
| Dead tuple percentage | > 20% of table size | Run VACUUM |
| Backup size | > 50 GB | Review retention policy |

---

## 4. Storage Cleanup Rules

| Classification | Cleanup Trigger | Cleanup Method | Approval Required |
|----------------|-----------------|----------------|-------------------|
| C1 — Critical | Never delete automatically | Manual deletion with legal review | Engineering Lead + Domain Owner |
| C2 — Essential | Per retention registry date | Archive or anonymize | Domain Owner |
| C3 — Historical | Per retention period + 1 year | Archive to object storage | Domain Owner |
| C4 — Temporary | TTL expiration | Automatic deletion | Automated |
| C5 — Disposable | On-demand or weekly | Bulk deletion | Automated |

---

## 5. Storage Isolation Rules

- **C1 data** must reside on encrypted, dedicated storage volumes with separate backup schedules
- **C4 and C5 data** must not share tables with C1 or C2 data
- **JSON columns** containing sensitive data must be encrypted at the application layer before storage
- **Large objects** (>1 MB) must be stored in object storage, not PostgreSQL TOAST storage
- **Audit logs** must be stored on separate storage from operational data to prevent performance interference

---

## 6. Index Management Rules

| Rule | Requirement |
|------|-------------|
| Index justification | Every index must be justified by a query pattern or constraint |
| Unused index review | Review quarterly; remove indexes with < 5% usage |
| Composite index limit | Maximum 3 columns per composite index |
| JSON index | GIN indexes on JSONB columns must be reviewed quarterly |
| Partial indexes | Preferred over full table indexes for selective queries |

---

## 7. Vacuum and Maintenance Rules

| Operation | Frequency | Threshold |
|-----------|-----------|-----------|
| AUTOVACUUM | Continuous | Trigger at 20% dead tuples |
| VACUUM ANALYZE | Weekly | All tables |
| VACUUM FULL | Monthly | Only during maintenance windows |
| REINDEX | Quarterly | Tables with > 20% bloat |
| Partition maintenance | Monthly | Drop expired partitions |

**Never run VACUUM FULL on production tables without evaluating table locks, additional disk requirements, and operational impact.**

---

## 8. Partitioning Guidelines

High-growth tables must be evaluated for partitioning, particularly:

- `pg_stat_activity` / audit logs
- `notifications` / `notification_logs`
- `sms_messages`
- `location_history`
- `shared_outbox_events`
- `seller_analytics` / `enabler_analytics`

Partitioning must be introduced only where workload and retention requirements justify its complexity. Partition pruning must be verified before deployment.

---

## 9. Large Object Storage Rules

| Data Type | Storage Location | Database Column |
|-----------|-----------------|-----------------|
| Product images | Object storage (MinIO/S3) | URL reference only |
| KYC documents | Object storage (encrypted) | URL reference only |
| Chat attachments | Object storage (encrypted) | URL reference only |
| KYC documents | Object storage (encrypted) | URL reference only |
| Large JSON payloads (>1 MB) | Object storage | URL reference + metadata in DB |

PostgreSQL must never store binary data larger than 1 MB directly in table columns.

---

**End of Document**
