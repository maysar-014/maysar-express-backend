# Maysar Database Archival Standard

**Document ID:** MAY-ENG-DATA-005  
**Version:** 1.0  
**Status:** Proposed — Pre-Launch Adoption  
**Owner:** Maysar Engineering  
**Related Constitution:** MAYSAR_INFRASTRUCTURE_CONSTITUTION.md (Article VII — Recovery Engineering)  
**Related Standards:** DATA_CLASSIFICATION_STANDARD.md, DATA_RETENTION_REGISTRY.md, DATABASE_STORAGE_MANAGEMENT_STANDARD.md, DATABASE_DELETION_STANDARD.md

---

## 1. Purpose

This standard defines how Maysar archives historical data. Archival is a controlled movement of historical information into a more economical storage environment while preserving its required integrity and accessibility.

---

## 2. Archival Principles

| Principle | Requirement |
|-----------|-------------|
| Independent verification | Every archive operation must produce verifiable evidence of success |
| Integrity preservation | Archived data must remain unchanged and verifiable |
| Retrieval guarantee | Archived records must be restorable within defined RTO |
| No silent deletion | No record may be archived without audit logging |
| Legal hold compliance | Archived records remain subject to legal holds |

---

## 3. Approved Archival Destinations

| Destination | Use Case | Encryption | Access Control |
|-------------|----------|------------|----------------|
| Object storage (MinIO/S3) | Large files, images, documents | AES-256 at rest | IAM role-based |
| Dedicated archival PostgreSQL | Historical relational data | AES-256 at rest | Role-based |
| Partitioned historical tables | Time-series data within same DB | AES-256 at rest | Role-based |
| Immutable backup repository | Long-term disaster recovery | AES-256 at rest | Separate credentials |

PostgreSQL must never store binary data larger than 1 MB directly in table columns. Large objects (images, KYC documents, chat attachments) must use object storage with URL references stored in the database.

---

## 4. Archival Workflow

| Step | Action | Responsible | Output |
|------|--------|-------------|--------|
| 1 | Identify eligible records | Automated job | Candidate list |
| 2 | Verify retention eligibility | Automated check | Confirmation log |
| 3 | Capture relationships and metadata | Automated script | Metadata file |
| 4 | Export in recoverable format | Automated job | Archive file |
| 5 | Generate checksums | Automated job | SHA-256 checksums |
| 6 | Verify archived copy | Automated verification | Verification report |
| 7 | Record archival completion | Automated job | Archive log entry |
| 8 | Obtain authorization before removing original | Domain owner | Approval record |
| 9 | Remove original (if configured) | Automated job | Deletion log |

---

## 4. Archival by Data Classification

| Classification | Archive Destination | Retention in Archive | Retrieval SLA |
|----------------|-------------------|---------------------|---------------|
| C1 — Critical | Dedicated archival PostgreSQL | Permanent (legal requirement) | 24 hours |
| C2 — Essential | Object storage or archival PostgreSQL | 7 years | 48 hours |
| C3 — Historical | Object storage | 3 years | 72 hours |
| C4 — Temporary | Not archived | N/A | N/A |
| C5 — Disposable | Not archived | N/A | N/A |

---

## 5. Financial Archive Requirements

Archived financial records must preserve:

- Original transaction identifiers
- Amounts and currencies
- Transaction timestamps
- Relevant account references
- Reversal and adjustment relationships
- Reconciliation references
- Integrity verification information

Archived financial records must remain retrievable for authorized audits and disputes.

---

## 6. Archival Integrity Checks

| Check | Frequency | Method |
|-------|-----------|--------|
| Checksum verification | Quarterly | SHA-256 comparison |
| Restore test | Quarterly | Restore sample to staging |
| Access log review | Monthly | Review access logs |
| Completeness audit | Quarterly | Compare source vs archive counts |

---

## 7. Archival Automation Requirements

All automated archival jobs must:

- Be idempotent (running twice produces same result)
- Support dry-run mode
- Log all archived record IDs
- Handle interruptions gracefully
- Produce structured pass/fail artifacts
- Send alerts on failure

---

## 8. Related Documents

- `MAYSAR_INFRASTRUCTURE_CONSTITUTION.md` — Article VII (Recovery Engineering)
- `DATA_CLASSIFICATION_STANDARD.md` — Classification definitions
- `DATA_RETENTION_REGISTRY.md` — Per-table retention policies
- `DATABASE_STORAGE_MANAGEMENT_STANDARD.md` — Storage handling per classification
- `DATABASE_DELETION_STANDARD.md` — Deletion rules per classification
- `DATABASE_BACKUP_AND_RECOVERY_STANDARD.md` — Backup and recovery standards
- `DATABASE_LIFECYCLE_OPERATIONS_RUNBOOK.md` — Operational procedures

---

**End of Document**
