# Maysar PostgreSQL Restore Drill Runbook

**Document ID:** MAYSAR-DRILL-001  
**Version:** 1.1  
**Frequency:** Quarterly (minimum)  
**Owner:** Maysar Engineering  
**Related Constitution:** MAYSAR-INFRA-CON-001 (Section 5, Phase 3 & Section 12)

---

## Purpose

To verify that Maysar's PostgreSQL backups are restorable, measure actual Recovery Point Objective (RPO) and Recovery Time Objective (RTO), and produce evidence for the production launch approval gate (Constitution Section 12, items 1–3).

---

## Prerequisites

Before starting the drill, ensure:

- [ ] `pgBackRest` is installed and configured in the backup container
- [ ] `postgres-restore-pitr.sh` and `postgres-restore-verify.sh` are mounted and executable
- [ ] A recent backup exists (logical dump and/or pgBackRest base backup)
- [ ] `ENCRYPTION_KEY` is available if backups are encrypted
- [ ] A test database can be created on a non-production PostgreSQL instance (staging or dedicated drill instance)
- [ ] `PSQL` and `pgbackrest` CLI tools are available

---

## Drill Procedure

### Step 1: Record Baseline

| Field | Value |
|-------|-------|
| Drill date | |
| Drill performed by | |
| Backup used (file/timestamp) | |
| Backup type (logical / physical / PITR) | |
| Source database size | `SELECT pg_size_pretty(pg_database_size('maysar'));` |
| Source row count (key tables) | See Step 4 |

Start time: `__________________`

### Step 2: Initiate Restore

Choose one of the following restore methods:

#### Option A: Logical Restore (pg_dump)

```sh
RESTORE_OVERWRITE=1 ./scripts/backup/postgres-restore.sh \
  /backups/postgres/maysar_maysar_<timestamp>.sql.gz \
  drill_test_$(date +%Y%m%dT%H%M%SZ)
```

#### Option B: Physical Restore + PITR (pgBackRest)

```sh
./scripts/backup/postgres-restore-pitr.sh \
  "2024-01-15 10:30:00+00" \
  drill_test_$(date +%Y%m%dT%H%M%SZ)
```

Record restore start time: `__________________`

### Step 3: Verify Restore Completed

Confirm the restore script exited with code 0 and the target database exists:

```sh
psql -h <host> -p <port> -U <user> -d postgres \
  -c "SELECT 1 FROM pg_database WHERE datname = 'drill_test_<timestamp>';"
```

### Step 4: Data Integrity Verification

Run the automated verification script:

```sh
./scripts/backup/postgres-restore-verify.sh \
  /backups/postgres/maysar_maysar_<timestamp>.sql.gz
```

Or manually compare row counts on key tables:

| Table | Source Rows | Restored Rows | Match? |
|-------|-------------|---------------|--------|
| users | | | |
| orders | | | |
| order_items | | | |
| products | | | |
| transactions | | | |
| shipments | | | |
| notifications | | | |

### Step 5: Record Timing

| Metric | Value |
|--------|-------|
| Restore start time | |
| Restore end time | |
| **RTO (total restore time)** | |
| Backup age (time since last backup) | |
| **RPO (potential data loss window)** | |

RTO = Restore end time − Restore start time  
RPO = Current time − Backup timestamp (how much data could be lost)

### Step 6: Cleanup

Drop the test database unless `KEEP_RESTORE_TEST_DB=1`:

```sh
dropdb -h <host> -p <port> -U <user> drill_test_<timestamp>
```

---

## Acceptance Criteria

The drill is considered **passed** when ALL of the following are true:

- [ ] Restore completed without errors (exit code 0)
- [ ] All key table row counts match between source and restored database
- [ ] RTO is within the agreed threshold (recommend: < 4 hours for production)
- [ ] RPO is within the agreed threshold (recommend: < 1 hour for production)
- [ ] Drill results recorded below and stored in version control

---


## Drill Results Record

| Drill # | Date | Method | RTO | RPO | Result | Notes |
|---------|------|--------|-----|-----|--------|-------|
| 1 | 2026-11-11 | Logical (encrypted) | ~3 min | ~0 min | PASSED | Dev environment, 88 MB DB, 253 tables. Pre-backup marker present; post-backup marker correctly absent. Bugs found and fixed: restore script didn't handle `.enc` files, used `psql` instead of `pg_restore` for `-Fc` format. |

---

## PITR Test Procedure (pgBackRest)

**Requires:** Linux environment with pgBackRest installed, PostgreSQL with `archive_mode=on`.

### Step 1: Enable WAL Archiving on PostgreSQL

```sql
-- As superuser
ALTER SYSTEM SET archive_mode = on;
ALTER SYSTEM SET archive_command = 'pgbackrest --stanza=maysar --config=/etc/pgbackrest.conf archive-push %p';
ALTER SYSTEM SET archive_timeout = 60;
-- Restart PostgreSQL for archive_mode to take effect
```

### Step 2: Create pgBackRest Stanza

```sh
pgbackrest --stanza=maysar --config=/etc/pgbackrest.conf stanza-create
```

### Step 3: Take Physical Backup

```sh
pgbackrest --stanza=maysar --config=/etc/pgbackrest.conf --type=full backup
```

### Step 4: Insert Post-Backup Marker (for PITR verification)

```sql
CREATE TABLE pitr_marker (id SERIAL PRIMARY KEY, note TEXT, created_at TIMESTAMP DEFAULT NOW());
INSERT INTO pitr_marker (note) VALUES ('Before PITR target - should be restored');
-- Wait 60+ seconds for WAL archive
INSERT INTO pitr_marker (note) VALUES ('After PITR target - should NOT be restored');
```

### Step 5: Restore to Point-in-Time

```sh
./scripts/backup/postgres-restore-pitr.sh \
  "2026-11-11 14:00:00+00" \
  maysar_pitr_test
```

### Step 6: Verify PITR Result

```sql
-- Should contain the "before" marker
SELECT * FROM pitr_marker WHERE note LIKE '%Before%';

-- Should NOT contain the "after" marker
SELECT * FROM pitr_marker WHERE note LIKE '%After%';
-- Expected: 0 rows
```

### Step 7: Record RPO/RTO

| Metric | Value |
|--------|-------|
| Backup completion time | |
| PITR target time | |
| Restore completion time | |
| **RTO** | |
| **RPO** | |

---

## Remediation

If the drill fails:

1. Investigate the failure (backup corruption, permission issues, script errors)
2. Fix the root cause
3. Re-run the drill within 7 days
4. Update this runbook with lessons learned

---

## Evidence Storage

Store completed drill results in:
- `reports/restore-drills/` directory
- Git commit with drill results
- Link to CI job output (if automated)
