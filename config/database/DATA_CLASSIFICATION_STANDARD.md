# Maysar Data Classification Standard

**Document ID:** MAY-ENG-DATA-001  
**Version:** 1.0  
**Status:** Proposed — Pre-Launch Adoption  
**Owner:** Maysar Engineering  
**Related Constitution:** MAYSAR_INFRASTRUCTURE_CONSTITUTION.md (Article II — Data Classification)

---

## 1. Purpose

This standard defines how Maysar classifies its data assets, who owns them, and how they must be handled throughout their lifecycle. Every table, column, and file in the Maysar system must be assigned exactly one classification.

Classification is determined by **business purpose and sensitivity**, not by table size or write frequency.

---

## 2. Classification Tiers

| Classification | Description | Examples | Handling Priority |
|----------------|-------------|----------|-------------------|
| **C1 — Critical** | Financial, transactional, legal evidence; data whose loss or corruption causes business harm | Payment transactions, wallet ledgers, settlements, KYC documents, compliance evidence, audit logs | Protected; immutable where appropriate; encrypted at rest and in transit; least-privilege access |
| **C2 — Essential** | Core operational and business data | Users, products, orders, inventory, shipments, seller profiles | Retained under approved policy; encrypted; least-privilege access; regular integrity checks |
| **C3 — Historical** | Completed operational and analytical history | Past orders, settled transactions, historical analytics, archived shipments | Archived when appropriate; retained per retention policy; retrievable for disputes and analytics |
| **C4 — Temporary** | Sessions, tokens, temporary workflows | API rate-limit counters, verification codes, temporary checkout sessions, ephemeral cache | Automatic expiration; short TTL; no long-term storage |
| **C5 — Disposable** | Debugging artifacts and redundant temporary records | Debug logs, temp files, duplicate imports, failed upload artifacts | Controlled deletion; no business value; can be removed without business impact |

---

## 3. Classification Rules

### 3.1 Assignment
Every table, column, and file must be assigned exactly one classification at schema design time. The classification is recorded in the Data Classification Registry (see Appendix A).

### 3.2 Reclassification
Reclassification requires:
- Written justification from the domain owner
- Security review if sensitivity increases
- Update to the Data Classification Registry
- Notification to infrastructure and security teams

### 3.3 C1 — Critical Data Requirements
C1 data must additionally satisfy:
- Encryption at rest (AES-256 minimum)
- Encryption in transit (TLS 1.2+)
- Least-privilege application roles (no superuser access for application)
- Immutable or append-only where legally required
- Backup with verified restoration
- Legal hold capability

### 3.4 C4 — Temporary Data Requirements
C4 data must:
- Have an explicit TTL (time-to-live) not exceeding 30 days
- Be automatically expired by scheduled jobs
- Never contain business-critical information required for compliance

### 3.5 C5 — Disposable Data Requirements
C5 data must:
- Be identifiable as non-essential
- Be deletable without business impact
- Not be referenced by C1–C3 data
