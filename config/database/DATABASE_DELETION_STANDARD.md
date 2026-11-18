# Maysar Database Deletion Standard

**Document ID:** MAY-ENG-DATA-004  
**Version:** 1.0  
**Status:** Proposed — Pre-Launch Adoption  
**Owner:** Maysar Engineering  
**Related Constitution:** MAYSAR_INFRASTRUCTURE_CONSTITUTION.md (Article VII — Recovery Engineering)  
**Related Standards:** DATA_CLASSIFICATION_STANDARD.md, DATA_RETENTION_REGISTRY.md

---

## 1. Purpose

This standard defines the deletion rules for Maysar's PostgreSQL database. Deletion is a controlled business operation, not a routine database optimization technique. No automated deletion may execute without satisfying all pre-deletion checks.

---

## 2. Pre-Deletion Checks (Mandatory)

Before any deletion operation, ALL of the following must be verified:

| Check | Requirement | Verification Method |
|-------|-------------|---------------------|
| Retention eligibility | Table record must be past retention date | Check DATA_RETENTION_REGISTRY.md |
| Legal hold | No active legal hold on the record | Check legal hold registry |
| Financial dependency | No unresolved financial dependency | Check payment/wallet tables |
| Dispute dependency | No unresolved dispute referencing the record | Check disputes table |
| Foreign key dependency | No active foreign key references | Check dependent tables |
| Workflow dependency | No active workflow referencing the record | Check saga/outbox tables |
| Archival verification | Archived copy verified before deletion | Check archive integrity logs |
| Approval | Domain owner approval for non-routine deletion | Written approval required |

---

## 3. Deletion Safeguards

All automated deletion operations must implement:

| Safeguard | Requirement |
|-----------|-------------|
| Idempotent | Running twice must not cause errors or data loss |
| Bounded batch sizes | Maximum 1,000 rows per batch |
| Dry-run support | Must support --dry-run flag without side effects |
| Execution log | Must log deleted record IDs to deletion audit log |
| Interruption safety | Must support interruption and safe resumption |
| Transaction boundaries | Must respect transaction boundaries |
| Measurable results | Must report rows deleted, errors, warnings |

---

## 4. Deletion Workflow

1. Identify records eligible for deletion per retention registry
2. Run pre-deletion checks (all must pass)
3. Create dry-run report showing records to be deleted
4. Obtain domain owner approval for non-routine deletion
5. Execute deletion in bounded batches
6. Log deleted record IDs to deletion audit log
7. Verify deletion success
8. Update retention tracking metadata

## 5. Deletion by Classification

| Classification | Deletion Eligibility | Approval Required |
|----------------|---------------------|-------------------|
| C1 — Critical | Never automatically | Engineering Lead + Domain Owner |
| C2 — Essential | Per retention date | Domain Owner |
| C3 — Historical | Per retention period + 1 year | Domain Owner |
| C4 — Temporary | TTL expiration | Automated |
| C5 — Disposable | On-demand or weekly | Automated |

---

## 6. Privacy and Account Deletion

Personal-data deletion, anonymization, and restriction requests must follow an approved privacy workflow:

1. User submits deletion request via support channel
2. Data owner verifies identity and scope of request
3. Personal data is anonymized or deleted per retention rules
4. Financial records related to the user are retained but access-restricted
5. Deletion confirmation is sent to the user
6. Deletion is logged in the audit trail

**Deleting an account does not automatically authorize deletion of associated financial or regulatory evidence.** Where retention is legally required, access and processing must be restricted appropriately.

---

## 7. Deletion Safety Checks (Pre-Production)

Before any automated deletion job enters production:

| Test | Requirement |
|------|-------------|
| Expired session deletion | Verified in test environment |
| Outbox archival eligibility | Verified in test environment |
| Duplicate cleanup execution | Verified in test environment |
| Financial-record protection | Verified: financial records cannot be deleted |
| Legal-hold enforcement | Verified: legal holds block deletion |
| Referential-integrity | Verified: foreign keys preserved |
| Archive checksum verification | Verified: archives are restorable |
| Archive restoration | Verified: archived data can be restored |
| Interrupted-job recovery | Verified: interrupted jobs resume safely |
| Database migration tests | Verified: schema changes don't break deletion |
| Storage utilization monitoring | Verified: alerts trigger correctly |

Automated tests must prove that protected records cannot be removed through ordinary cleanup operations. Lifecycle jobs must be tested against realistic data volumes before production execution.

---

## 8. Non-Negotiable Prohibitions

Maysar prohibits:

| Prohibition | Reason |
|-------------|--------|
| Deleting financial records to reduce storage | Financial integrity |
| Deleting audit evidence without approved justification | Legal compliance |
| Removing outbox records before delivery and reconciliation | System reliability |
| Removing unresolved saga or dead-letter records | Workflow integrity |
| Deleting historical records without checking dependencies | Referential integrity |
| Running unbounded cleanup jobs against production tables | System stability |
| Storing large media unnecessarily inside PostgreSQL | Storage efficiency |
| Implementing retention periods without documented justification | Accountability |
| Allowing a free-tier quota to dictate unsafe deletion decisions | Business continuity |

Any violation involving critical data integrity must be treated as an engineering incident.

---

## 9. Related Documents

- `MAYSAR_INFRASTRUCTURE_CONSTITUTION.md` — Article VII (Data Deletion)
- `DATA_CLASSIFICATION_STANDARD.md` — Classification definitions
- `DATA_RETENTION_REGISTRY.md` — Per-table retention policies
- `DATABASE_STORAGE_MANAGEMENT_STANDARD.md` — Storage handling per classification
- `DATABASE_ARCHIVAL_STANDARD.md` — Archival standards
- `DATABASE_BACKUP_AND_RECOVERY_STANDARD.md` — Backup and recovery standards
- `DATABASE_LIFECYCLE_OPERATIONS_RUNBOOK.md` — Operational procedures

---

**End of Document**

