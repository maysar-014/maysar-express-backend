# Maysar Database Capacity Management Standard

**Document ID:** MAY-ENG-DATA-007  
**Version:** 1.0  
**Status:** Proposed — Pre-Launch Adoption  
**Owner:** Maysar Engineering  
**Related Constitution:** MAYSAR_INFRASTRUCTURE_CONSTITUTION.md (Article VIII — Storage Management)  
**Related Standards:** DATA_CLASSIFICATION_STANDARD.md, DATA_RETENTION_REGISTRY.md, DATABASE_STORAGE_MANAGEMENT_STANDARD.md

---

## 1. Purpose

This standard defines how Maysar monitors, forecasts, and manages database storage capacity to prevent unexpected storage exhaustion while avoiding premature infrastructure spending.

---

## 2. Storage Monitoring

| Metric | Query | Alert Threshold | Action Required |
|--------|-------|---------------|-----------------|
| Total database size | `pg_database_size('maysar')` | > 80% of allocated storage | Plan capacity expansion |
| Individual table size | `pg_total_relation_size(table)` | > 10 GB for C3/C4 tables | Review retention policy |
| Index size vs. table size | `pg_indexes_size` / `pg_relation_size` | > 50% of table size | Review index necessity |
| WAL generation rate | `pg_walfile_name(pg_current_wal_lsn())` | > 1 GB/hour sustained | Investigate runaway transactions |
| Dead tuple percentage | `pg_stat_user_tables.n_dead_tup / reltuples` | > 20% | Run VACUUM |
| Backup size | `du -h /backups` | > 50 GB | Review retention policy |

---

## 3. Capacity Utilization Tiers

| Utilization | Classification | Required Action |
|-------------|---------------|-----------------|
| < 25% | Observation | Record growth and estimate runway |
| 25%–50% | Review | Investigate major contributors |
| 50%–60% | Planning | Prepare capacity or archival changes |
| 60%–70% | Escalation | Approve expansion or migration plan |
| 70%–80% | Critical | Execute approved capacity response |
| > 80% | Emergency | Activate emergency capacity procedure |

---

## 4. Capacity Expansion Options

| Option | When to Use | Lead Time | Cost Impact |
|--------|-------------|-----------|-------------|
| Increase EBS volume size | Immediate need, same instance | Hours | Moderate |
| Add read replica | Read scaling | Days | Moderate |
| Upgrade instance class | CPU/memory bound | Days | High |
| Partition high-growth tables | Log tables, event stores | Weeks | Low |
| Archive historical data | Reduce active DB size | Weeks | Low |
| Migrate to larger managed PostgreSQL | Outgrow self-hosted | Weeks | High |

---

## 5. Capacity Monitoring Rules

| Rule | Requirement |
|------|-------------|
| Storage must be monitored separately from backup storage | Both must be tracked independently |
| Table-level growth must be tracked weekly | Identify high-growth tables early |
| Index size must be monitored separately | Indexes can exceed table size |
| WAL generation must be monitored | Indicates write load patterns |
| Dead tuple percentage must be monitored | Indicates vacuum inefficiency |

---

## 6. Capacity Expansion Procedure

1. Identify storage growth trend from monitoring
2. Determine root cause (data growth, index bloat, WAL accumulation)
3. Evaluate options: archive, partition, vacuum, expand, migrate
4. Obtain engineering lead approval
5. Schedule maintenance window if required
6. Execute expansion
7. Verify post-expansion performance
8. Update capacity planning documentation

---

## 7. Database Portability Requirement

Maysar must retain the ability to migrate its PostgreSQL database between:

- Neon
- Amazon RDS
- PostgreSQL hosted on EC2
- Other compatible managed PostgreSQL providers
- Approved self-hosted PostgreSQL infrastructure

The architecture must avoid unnecessary provider-specific dependencies.

Migration procedures must account for:

- Schema and data
- PostgreSQL extensions
- Roles and permissions
- Sequences
- Indexes and constraints
- Triggers and functions
- Prisma migrations
- Connection pooling
- Background workers
- Outbox processing
- Financial reconciliation
- Database cutover and rollback

Migration readiness must be tested before a provider becomes operationally indispensable.

---

## 8. Related Documents

- `MAYSAR_INFRASTRUCTURE_CONSTITUTION.md` — Article VIII (Storage Management)
- `DATA_CLASSIFICATION_STANDARD.md` — Classification definitions
- `DATA_RETENTION_REGISTRY.md` — Per-table retention policies
- `DATABASE_STORAGE_MANAGEMENT_STANDARD.md` — Storage handling per classification
- `DATABASE_DELETION_STANDARD.md` — Deletion rules per classification
- `DATABASE_ARCHIVAL_STANDARD.md` — Archival standards
- `DATABASE_BACKUP_AND_RECOVERY_STANDARD.md` — Backup and recovery standards
- `DATABASE_MIGRATION_AND_PORTABILITY_STANDARD.md` — Migration standards
- `DATABASE_LIFECYCLE_OPERATIONS_RUNBOOK.md` — Operational procedures

---

**End of Document**
