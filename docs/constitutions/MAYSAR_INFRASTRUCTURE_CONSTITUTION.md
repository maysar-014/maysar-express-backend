# Maysar Infrastructure Architecture & Engineering Constitution

**Document ID:** MAYSAR-INFRA-CON-001  
**Version:** 1.0  
**Status:** Draft — Pre-Launch Governing Document  
**Owner:** Maysar Engineering  
**Review Cycle:** Quarterly, or before any production launch gate  
**Classification:** Internal — Engineering Governance

---

## Preamble

This Constitution is the governing engineering document for Maysar infrastructure, data protection, and operational reliability. It exists to ensure that Maysar is engineered as a production-grade platform **from day one**, even while still pre-launch, so that architectural changes do not become prohibitively expensive once real customers, business-critical transactions, and production complexity are introduced.

It supersedes informal backup configuration, ad-hoc deployment notes, and incidental operational scripts. Where this Constitution conflicts with any other document, script, or configuration, this Constitution takes precedence unless formally amended through the change-control process described herein.

---

## 1. Permanent Architectural Principles

These five principles are non-negotiable and apply to every layer of the Maysar platform.

| # | Principle | Requirement |
|---|-----------|-------------|
| 1 | **Infrastructure Independence** | Maysar must not depend on a single hosting provider for its entire existence. Core services must be portable across providers or self-hostable. |
| 2 | **Data Ownership** | Database backups, encryption keys, recovery credentials, and business data must remain under Maysar's exclusive control. No third-party vendor may hold the only recoverable copy of production data. |
| 3 | **Recoverability** | Every critical component must have a documented, tested restoration procedure. A backup is not acceptable without evidence of successful restoration. |
| 4 | **Financial Discipline** | Prefer mature open-source technology and generous free infrastructure allowances. Do not pay for enterprise infrastructure prematurely. Engineering maturity is not measured by the number of technologies deployed. |
| 5 | **Future Readiness** | The architecture must accommodate increasing transactions, users, and infrastructure capacity without fundamental redesign. Avoid Kubernetes, complex multi-region clusters, or expensive managed services solely to appear enterprise-grade. |

---

## 2. Infrastructure Blueprint — Five Independently Recoverable Layers

Maysar is separated into five layers. Each layer must be recoverable without assuming the others are still operational.

| Layer | Scope | Examples |
|-------|-------|----------|
| **L1 — Application Infrastructure** | API services, background workers, frontend, deployment configuration | Express backend, workers, Docker Compose deployment manifests |
| **L2 — Data Infrastructure** | PostgreSQL, Redis, database migrations, persistent business data | Primary database, cache, schema migrations |
| **L3 — Independent Storage** | Database backups, uploaded files, documents, critical assets | Offsite object storage, encrypted backup repository |
| **L4 — Security Infrastructure** | Secrets, encryption keys, access control, recovery credentials | Environment variables, encryption keys, IAM policies, recovery credentials |
| **L5 — Reliability Infrastructure** | Monitoring, alerting, backup verification, disaster recovery testing | Independent health checks, PITR verification, isolated restore tests |

**Cross-layer rule:** A failure in L1 must not prevent restoration of L2. A compromise of L4 must not destroy the only copy of L3.


## 3. Approved Technology Standards

| Area | Approved Approach | Notes |
|------|------------------|-------|
| Primary Database | PostgreSQL | Relational, ACID, logical + physical backup support |
| Physical Backup | pgBackRest | Preferred for production-scale physical backups and PITR |
| Transaction Recovery | WAL Archiving / PITR | Point-in-time recovery for business-critical transactions |
| Logical Backup | `pg_dump -Fc` | Custom-format dumps for portability and selective restore |
| Redis | Persistence only for genuinely critical state | Cache-first; do not treat Redis as a system of record |
| Object Storage | S3-compatible independent provider | Vendor-agnostic; must support client-side encryption |
| Backup Encryption | Client-side encryption | Encrypt before upload; keys never stored with backups |
| Deployment | Docker Compose initially | Simple, reproducible, provider-neutral |
| Infrastructure Configuration | Version-controlled configuration and IaC | All infrastructure defined in Git |
| Monitoring | Independent health monitoring and alerts | Separate from application metrics where possible |
| Recovery Verification | Automated isolated restoration | Test restores in a sandbox, not production |

---

## 4. Non-Negotiable Engineering Standards

| Standard | Required Outcome | Verification Method |
|----------|------------------|---------------------|
| Single Point of Failure | Identify and eliminate critical SPOFs | Architecture review; failure-mode analysis |
| Data Protection | Independent, encrypted recovery copies | Backup inventory audit; encryption key custody check |
| Backup Reliability | Automated verification | Scheduled restore-test jobs with pass/fail results |
| Security | Least-privilege access | IAM policy review; credential rotation logs |
| Deployment | Reproducible infrastructure | `docker-compose up` from clean clone succeeds |
| Database Integrity | Constraints and consistency verification | Schema validation; row-count parity checks after restore |
| Recovery | Tested restoration procedures | Documented runbook; successful drill within last 90 days |
| Observability | Independent monitoring | Alerts fire without application cooperation |
| Documentation | Complete operational runbooks | Runbook readable by on-call engineer without SME assistance |
| Cost Management | Predictable and controlled spending | Monthly infrastructure cost review against budget |

---

## 5. Implementation Phases

| Phase | Focus | First Priority | Exit Criteria |
|-------|-------|----------------|---------------|
| **Phase 1 — Foundation** | Infrastructure inventory, database architecture, environment separation, security boundaries, authoritative configuration | Yes | All infrastructure defined in version control; environments separated (dev/staging/prod) |
| **Phase 2 — Data Protection** | PostgreSQL physical + logical backups, WAL archiving, independent object storage, encryption, retention | Yes | Backups running; encrypted; stored offsite; retention policy enforced |
| **Phase 3 — Recovery Engineering** | Isolated restoration, consistency checks, PITR testing, complete infrastructure recovery | — | Restore test succeeds; RPO/RTO measured and documented |
| **Phase 4 — Operational Resilience** | Independent monitoring, alerting, capacity monitoring, security reviews, recovery documentation | — | Alerts configured; runbooks published; capacity trend visible |
| **Phase 5 — Production Readiness** | Failure simulations, actual RPO/RTO measurement, risk resolution, launch approval | — | Disaster recovery drill passed; Constitution signed off by engineering lead |


## 6. The Survivability Principle

**Never confuse a system that works with a system that can survive failure.**

| Statement | What it is NOT proof of |
|-----------|------------------------|
| A successful deployment | Recoverability |
| A successful backup | Restorability |
| A healthy database | Data integrity |
| An available server | Infrastructure resilience |
| An encrypted backup | Usefulness (if the recovery key is lost) |

**Engineering obligation:** Produce evidence for every important reliability claim. Claims must be backed by logs, test results, or drill reports — not assumptions.

---

## 7. Data Protection & Backup Policy

### 7.1 Backup Types

| Type | Tool | Frequency | Retention | Purpose |
|------|------|-----------|-----------|---------|
| PostgreSQL Physical (Base + WAL) | pgBackRest | Daily base; continuous WAL archive | 30 days | PITR; full disaster recovery |
| PostgreSQL Logical | `pg_dump -Fc` | Daily | 14 days | Portability; selective object restore |
| Redis RDB Snapshot | `redis-cli BGSAVE` + gzip | Hourly | 7 days | Cache restoration (non-critical state) |
| Application Files / Uploads | `rsync` / S3 sync | Daily | 30 days | User-generated content |

### 7.2 Retention Requirements

| Environment | Backup Retention | PITR Window |
|-------------|------------------|-------------|
| Development | 7 days | Not required |
| Staging | 14 days | 7 days |
| Production | 30 days | 7 days |

### 7.3 Encryption & Custody

- All backups must be encrypted **client-side** before leaving the Maysar network.
- Encryption keys must be stored in L4 (Security Infrastructure), never in the same repository or bucket as the backups they protect.
- Recovery credentials must be escrowed separately from operational credentials.

### 7.4 Verification

- Automated restore verification must run at least weekly against a staging clone.
- A full production-equivalent restore drill must be conducted at least quarterly.
- Every verification must produce a pass/fail artifact stored in version control.

---

## 8. Security & Data Ownership

### 8.1 Secrets Management

- No secrets (database passwords, encryption keys, AWS credentials) may be committed to Git.
- Use `.env.example` files with placeholder values; actual values injected at deployment time via environment or secrets manager.
- Rotate database passwords and encryption keys at least every 90 days.

### 8.2 Access Control

- Database superuser access restricted to infrastructure engineers.
- Application services connect with least-privilege roles (no `DROP TABLE`, no `CREATE DATABASE` in normal operation).
- Backup service accounts have read-only access to data and write-only access to backup storage.

### 8.3 Data Ownership

- Maysar retains sole custody of:
  - Production PostgreSQL data directory
  - WAL archives
  - Backup encryption keys
  - Recovery credentials
- No third-party managed service may be the sole custodian of production data.

---

## 9. Development & Deployment Standards

### 9.1 Infrastructure as Code

- All infrastructure (Docker Compose files, environment templates, backup scripts, monitoring config) must be version-controlled.
- Infrastructure changes require pull request review.
- `docker-compose up` from a clean clone must reproduce a functional local environment.

### 9.2 Environment Separation

- Development, staging, and production must use separate databases, separate Redis instances, and separate backup buckets.
- Production data must never be restored into development without explicit data-sanitization (PII removal).

### 9.3 Deployment

- Initial deployment: Docker Compose.
- Container images must pin exact versions (no `latest`).

## 10. Monitoring & Observability

### 10.1 Independent Monitoring

- Monitoring must be independent of the application it observes. If the application crashes, monitoring must still be able to report the outage.
- Minimum metrics:
  - Database size and growth rate (`pg_database_size`)
  - Backup success/failure status
  - Last successful restore timestamp
  - Replication lag (if applicable)
  - Disk utilization on data and backup volumes

### 10.2 Alerting

- Alerts must fire for:
  - Backup failure (2 consecutive missed backups)
  - Restore verification failure
  - Disk utilization > 80% on data or backup volumes
  - Database connection pool exhaustion
  - PITR window approaching retention limit

---

## 11. Engineering Acceptance Criteria

Before any feature is considered complete, the following must be true:

- [ ] Infrastructure change is defined in version control.
- [ ] Backup scope covers new data models.
- [ ] Restore procedure updated if schema changed.
- [ ] Encryption applied to new backup types.
- [ ] Monitoring alert created for new failure mode.
- [ ] Runbook updated for on-call engineers.

---

## 12. Production Launch Approval Requirements

Maysar may not launch to production until all of the following are evidenced:

1. **Backup integrity:** At least one successful automated restore of a production-equivalent database backup.
2. **PITR demonstration:** Successful point-in-time recovery to a specific timestamp within the retention window.
3. **RPO/RTO measured:** Actual recovery point objective and recovery time objective measured during a drill and documented.
4. **SPOF elimination:** No single server, provider, or credential loss can cause permanent data loss.
5. **Runbooks published:** Backup, restore, and failover procedures written and accessible to on-call staff.
6. **Cost baseline approved:** Monthly infrastructure cost documented and within pre-launch budget.
7. **Constitution sign-off:** Engineering lead signs this document, acknowledging all standards are met.

---

## 13. Baseline Assessment (Pre-Implementation Audit)

Before implementing changes, audit the current repository for:

- [ ] Root project structure
- [ ] Docker Compose files (`docker-compose.yml`, `docker-compose.prod.yml`, etc.)
- [ ] PostgreSQL and Redis configuration
- [ ] Existing backup and restoration scripts (`scripts/backup/`)
- [ ] Environment templates (`.env.example`, `.env.postgres.example`, without secrets)
- [ ] Deployment and CI/CD configuration (`.github/workflows/`)

**Output:** Use findings to finalize this Constitution and produce an implementation backlog mapped to Phases 1–5.

---

## Appendix A: Definitions

| Term | Definition |
|------|------------|
| **RPO** | Recovery Point Objective — maximum acceptable data loss measured in time (e.g., 4 hours). |
| **RTO** | Recovery Time Objective — maximum acceptable downtime to restore service (e.g., 2 hours). |
| **PITR** | Point-in-Time Recovery — restoring database to a specific timestamp using base backup + WAL replay. |
| **SPOF** | Single Point of Failure — a component whose failure causes total system outage or data loss. |
| **WAL** | Write-Ahead Log — PostgreSQL transaction log used for crash recovery and replication. |

---

## Appendix B: Amendment Process

This Constitution may be amended only by:

1. Written proposal by an engineer.
2. Review by the engineering lead.
3. Documented decision (approve/reject/defer) with rationale.
4. Version increment and change log entry.

All amendments must be recorded in this document's change log below.

---

### Change Log

| Version | Date | Author | Summary |
|---------|------|--------|---------|
| 1.0 | [Pre-launch] | Maysar Engineering | Initial constitution based on pre-launch infrastructure hardening recommendations |

- Health checks must be defined for all services.
