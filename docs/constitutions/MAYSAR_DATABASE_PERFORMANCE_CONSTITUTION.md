# DATABASE PERFORMANCE, INDEX ARCHITECTURE & SCALABILITY CONSTITUTION

| Attribute            | Value                                              |
|----------------------|----------------------------------------------------|
| **Document ID**      | MYS-DB-001                                         |
| **Classification**   | Core Engineering Architecture Standard            |
| **Database Engine**  | PostgreSQL                                         |
| **ORM**              | Prisma                                             |
| **Lifecycle**        | Development, Pre-launch, Production and Scale      |
| **Governance Level** | Mandatory                                          |
| **Document Status**  | Foundational Constitutional Standard               |

---

## PREAMBLE

Maysar recognizes its database as one of the most critical components of its technological infrastructure.

The database must support the platform's operational complexity, transactional requirements, commercial activities, financial operations, relationships, integrations and anticipated growth without sacrificing correctness, reliability, security or performance.

This constitution establishes the permanent engineering principles, technical requirements, implementation controls, verification procedures and operational responsibilities governing database performance and indexing.

It recognizes that a database can be structurally valid yet operationally inefficient, that indexes can improve retrieval while degrading write performance, and that apparent optimization without workload evidence can introduce unnecessary complexity.

Accordingly, Maysar shall pursue evidence-driven database engineering.

The objective is not to maximize the number of indexes, minimize database storage at all costs or optimize isolated queries. The objective is to establish a database architecture capable of sustaining Maysar's business operations efficiently, consistently and predictably as its data volume, transaction frequency and operational complexity increase.

---

## PART I — CONSTITUTIONAL AUTHORITY

### Article 1. Purpose and Scope

This constitution governs:

1. Database indexing architecture.
2. PostgreSQL query performance.
3. Prisma schema and migration governance.
4. Relational integrity and foreign-key access.
5. Unique constraints and business-rule enforcement.
6. Composite and specialized indexing.
7. Query design and optimization.
8. Database storage efficiency.
9. Read/write performance.
10. Pagination and large-dataset retrieval.
11. Database maintenance and monitoring.
12. Performance testing and benchmarking.
13. Schema evolution and migration safety.
14. Database scalability and capacity planning.
15. Performance regression prevention.

Its requirements apply to every database model, table, relationship, query, migration and application component that materially affects PostgreSQL performance.

### Article 2. Constitutional Supremacy

All database-related engineering decisions must comply with this constitution.

No developer, service, module or deployment process may introduce an indexing or query-performance change that knowingly compromises:

- Data integrity.
- Financial correctness.
- Transactional consistency.
- Security and authorization.
- Referential integrity.
- Operational stability.

Exceptions must be documented, technically justified, risk-assessed and approved by the designated engineering authority.

### Article 3. Foundational Principles

Maysar shall maintain the following principles:

#### 3.1 Integrity before optimization
Performance improvements must never undermine the correctness of business operations.

#### 3.2 Evidence before indexing
Index decisions must be supported by actual query patterns, execution plans, workload statistics or a documented architectural requirement.

#### 3.3 Workload-driven design
Indexes must reflect the application's actual filtering, joining, sorting, pagination and retrieval behavior.

#### 3.4 Minimal sufficient indexing
Every index must justify its storage, maintenance and write-performance costs.

#### 3.5 Scalability without premature complexity
Architecture must accommodate foreseeable growth without introducing expensive infrastructure prematurely.

#### 3.6 Measurable performance
Critical database operations must have measurable performance expectations and repeatable verification procedures.

#### 3.7 Continuous accountability
Database optimization is an ongoing engineering responsibility, not a one-time pre-launch exercise.

---

## PART II — DATABASE ARCHITECTURE GOVERNANCE

### Article 4. Complete Schema Accountability

Every Prisma model must be included in the database architecture inventory.

The inventory must identify:

- Model and table names.
- Primary keys.
- Unique constraints.
- Foreign keys.
- Relationship cardinalities.
- Existing indexes.
- Nullable columns.
- Frequently updated fields.
- Data volume expectations.
- Retention requirements.
- Important application access patterns.

No model may be excluded simply because it is considered secondary, administrative or operational. Models supporting outbox processing, background jobs, audit records, events, financial operations and internal workflows must receive the same architectural scrutiny as customer-facing models.

### Article 5. Prisma Schema Authority

The Prisma schema shall serve as the principal declarative representation of supported database structure.

The engineering team shall use appropriate Prisma definitions, including:

- `@id`
- `@@id`
- `@unique`
- `@@unique`
- `@@index`
- Appropriate field-level definitions.

PostgreSQL capabilities not adequately represented by the installed Prisma version may be implemented through controlled SQL migrations. All custom SQL must be documented and included in schema verification procedures.

The team must not assume that a successful Prisma migration proves that the intended database architecture is correct.

### Article 6. Database Structure Verification

The actual PostgreSQL database must periodically be compared with the intended Prisma schema.

Verification must cover:

- Table existence.
- Column definitions.
- Index definitions.
- Unique constraints.
- Foreign-key constraints.
- Referential actions.
- Migration history.
- Custom database objects.
- Schema drift.

Differences must be investigated and resolved through controlled migrations rather than undocumented manual changes.

---

## PART III — INDEX ARCHITECTURE

### Article 7. Primary-Key Standards

Every persistent entity must have an appropriate primary key.

Primary-key design must consider:

- Uniqueness.
- Stability.
- Relationship requirements.
- Index storage.
- Insert patterns.
- Distribution of generated identifiers.

Maysar's existing CUID-based identifier conventions must be assessed consistently rather than replaced without evidence. The engineering team must understand that primary-key indexes are automatically maintained by PostgreSQL and do not need duplicate manually created indexes.

### Article 8. Unique Constraints

Business rules requiring uniqueness must be enforced at database level.

This includes applicable:

- Email identifiers.
- Telephone identifiers.
- External transaction references.
- Provider transaction identifiers.
- Business registration identifiers.
- Domain-specific composite identifiers.

The exact requirements must be established from business rules. Nullable unique columns, case-insensitive identifiers and multi-tenant uniqueness must receive explicit consideration. Application-level existence checks are not sufficient protection against concurrent duplicate writes.

### Article 9. Foreign-Key Indexing

Every foreign-key relationship must undergo an indexing assessment.

PostgreSQL does not automatically create indexes on referencing columns. The assessment must consider:

1. Frequency of joins.
2. Parent-to-child retrieval patterns.
3. Child-to-parent lookup patterns.
4. Parent deletion and update operations.
5. Cascading referential actions.
6. Table size and cardinality.
7. Write frequency.
8. Existing composite-index coverage.

Foreign-key indexes shall be introduced when justified by query behavior, relationship operations or anticipated operational requirements. A foreign key must never be assumed to be efficiently indexed merely because its constraint exists.

### Article 10. Single-Column Indexes

Single-column indexes may be introduced for frequently queried fields where the expected retrieval benefit justifies their cost.

Candidates may include:

- Identifiers.
- Status fields.
- Ownership fields.
- External references.
- Timestamps.
- Frequently filtered classifications.

Low-cardinality fields must not automatically receive indexes. Their usefulness must be evaluated in the context of the complete query and available alternatives.

### Article 11. Composite Indexes

Composite indexes must be designed around complete application query patterns.

The engineering team must document:

- The target query.
- Equality predicates.
- Range predicates.
- Sorting requirements.
- Column order.
- Selectivity.
- Existing index coverage.
- Expected write overhead.

For PostgreSQL B-tree indexes, leading-column order is particularly important. For example, an order retrieval query filtering by seller and status and sorting by creation time may justify `(sellerId, status, createdAt)`. The example is illustrative, not a universal schema requirement.

The team must avoid creating separate or overlapping indexes without demonstrating their independent value.

### Article 12. Partial Indexes

Partial indexes may be introduced when a frequently executed workload targets a clearly defined subset of records.

Potential applications include:

- Active listings.
- Unread notifications.
- Pending payments.
- Unprocessed jobs.
- Non-deleted records.

The query predicate must be compatible with the partial-index predicate. The team must verify PostgreSQL planner behavior rather than assuming that the existence of a partial index guarantees its use.

### Article 13. Expression and Specialized Indexes

Specialized indexes must be considered when justified by actual application functionality.

Possible technologies include:

- Expression indexes.
- GIN indexes.
- GiST indexes.
- BRIN indexes.
- Trigram indexes.
- Full-text search indexes.

Each implementation requires an assessment of:

1. Query compatibility.
2. Data characteristics.
3. Index storage.
4. Write overhead.
5. PostgreSQL compatibility.
6. Prisma representation.
7. Migration safety.
8. Execution-plan effectiveness.

Specialized indexing must not be introduced merely because PostgreSQL supports it.

### Article 14. Index Redundancy

The engineering team must identify:

- Duplicate indexes.
- Overlapping indexes.
- Unnecessarily wide indexes.
- Indexes covered by existing leading-column indexes.
- Indexes that no longer serve application workloads.

An index must not be removed solely because another index appears similar. The assessment must account for uniqueness, ordering, operator classes, partial predicates, included columns and actual query requirements.

### Article 15. Index Cost Accounting

Every index introduces potential costs. The team must evaluate:

- Storage consumption.
- Insert overhead.
- Update overhead.
- Delete overhead.
- Vacuum implications.
- Cache utilization.
- Index maintenance.
- Migration complexity.

Frequently updated fields and write-intensive tables require heightened scrutiny. An index is justified only when its overall operational contribution is positive or necessary for an essential constraint.

---

## PART IV — APPLICATION QUERY GOVERNANCE

### Article 16. Query Architecture

All critical Prisma queries must be assessed for:

- Filtering efficiency.
- Join efficiency.
- Sorting.
- Pagination.
- Selected fields.
- Relationship loading.
- Result-set size.
- Query frequency.
- Transactional context.

Prisma's abstraction must not prevent engineers from examining the SQL actually executed by PostgreSQL.

### Article 17. N+1 Query Prevention

Application services must be reviewed for unnecessary repeated database calls. The team must evaluate:

- Relation loading.
- Batch retrieval.
- Appropriate joins.
- Query batching.
- Selective field retrieval.
- DataLoader-style approaches where suitable.

Using Prisma relation-loading options must be evaluated against generated SQL and actual execution behavior.

### Article 18. Pagination Standards

Large datasets must be retrieved through controlled pagination.

Requirements:

1. Unbounded result retrieval is prohibited in ordinary application endpoints.
2. Cursor-based pagination should be preferred for large and growing datasets where appropriate.
3. Pagination ordering must be deterministic.
4. Non-unique ordering must include an appropriate unique tie-breaker.
5. Supporting indexes must match actual filter and ordering patterns.
6. Deep offset pagination must be evaluated for degradation.
7. API responses must avoid unnecessary nested relation retrieval.

### Article 19. Sorting and Filtering

Frequently used sorting and filtering combinations must be identified from application behavior. The team must evaluate whether indexes support the actual predicate and ordering sequence. Indexes must not be designed around isolated columns when the application consistently queries combinations of those columns.

### Article 20. Generated SQL Accountability

Critical Prisma queries must be inspectable through controlled query logging or SQL capture.

The engineering team must understand:

- Actual SQL statements.
- Parameterized predicates.
- Join structure.
- Sorting behavior.
- Returned row counts.
- Execution frequency.

Production logging must avoid exposing credentials, personal information, payment secrets or sensitive query parameters.

---

## PART V — DOMAIN-SPECIFIC REQUIREMENTS

### Article 21. Identity and Account Management

The identity domain must be assessed for efficient retrieval using applicable:

- User identifiers.
- Email and telephone identifiers.
- Account status.
- Ownership relationships.
- Authentication-related references.
- Role and classification relationships.

Uniqueness and authorization requirements must remain independently enforced.

### Article 22. Product and Catalog

The catalog domain must be assessed for:

- Product ownership.
- Category relationships.
- Publication state.
- Product status.
- Availability.
- Search filters.
- Sorting.
- Product visibility.
- Seller-specific listings.

Product discovery must be evaluated as a complete query workload, including pagination.

### Article 23. Orders and Checkout

Orders and checkout are business-critical domains.

The architecture must assess:

- Buyer retrieval.
- Seller retrieval.
- Order status.
- Creation time.
- Fulfilment relationships.
- Payment relationships.
- Order-item retrieval.
- Administrative filtering.

Index design must account for transactional correctness and concurrency.

### Article 24. Payments, Wallets and Financial Operations

Financial domains receive the highest integrity and operational scrutiny.

The assessment must cover:

- Transaction references.
- External provider identifiers.
- Account identifiers.
- Payment status.
- Order relationships.
- Wallet relationships.
- Reconciliation identifiers.
- Ledger retrieval.
- Payout relationships.
- Transaction timestamps.

Database constraints must protect required uniqueness and financial relationships. Financial balances and ledger correctness must never depend on indexes or application-side assumptions.

### Article 25. Inventory and Logistics

The inventory and logistics domains must be assessed for:

- Product and location relationships.
- Stock availability.
- Inventory movements.
- Reservation records.
- Fulfilment state.
- Delivery status.
- Assignment relationships.
- Time-based operational retrieval.

Indexes must support efficient lookup without weakening concurrent stock-management correctness.

### Article 26. Notifications and Background Processing

Notification, outbox, event and job-processing models must be evaluated for:

- Recipient lookup.
- Processing status.
- Retry eligibility.
- Creation time.
- Queue ordering.
- Idempotency references.
- Unprocessed record retrieval.
- Retention and cleanup.

High-volume operational tables must be assessed for growth and maintenance costs.

### Article 27. Audit, Events and Analytics

Append-heavy and historical data models must receive specific attention.

The team shall evaluate:

- Actor and entity lookups.
- Timestamp filtering.
- Event type filtering.
- Retention requirements.
- Archival.
- Partitioning.
- BRIN suitability.
- Reporting workloads.

Historical data must not accumulate indefinitely without a documented retention and storage strategy.

---

## PART VI — QUERY PERFORMANCE ASSURANCE

### Article 28. Execution-Plan Verification

PostgreSQL execution plans shall be authoritative evidence in query-performance investigations.

The standard diagnostic command is:

```sql
EXPLAIN (ANALYZE, BUFFERS)
```

Engineers must evaluate:

- Sequential scans.
- Index scans.
- Bitmap scans.
- Actual versus estimated rows.
- Buffer hits and reads.
- Join strategies.
- Sort operations.
- Repeated loops.
- Execution time.

A sequential scan is not automatically a performance defect. The PostgreSQL planner must be allowed to choose the most efficient strategy for the actual workload.

### Article 29. Critical Query Classification

Queries shall be classified into:

| Class | Description |
|-------|-------------|
| **Class A — Critical transactional** | Payments, financial records, order processing, inventory consistency and other essential business transactions. |
| **Class B — Core operational** | Product discovery, customer dashboards, seller operations, fulfilment and administrative management. |
| **Class C — Supporting** | Historical reports, analytics, background maintenance and infrequent administrative retrieval. |

Each class must have documented performance expectations based on business requirements and realistic infrastructure capacity.

### Article 30. Performance Baselines

Maysar must maintain repeatable benchmarks for critical queries.

Benchmarks should include:

- Median latency.
- High-percentile latency.
- Throughput.
- Rows examined and returned.
- Buffer utilization.
- Concurrent workload behavior.
- Database resource consumption.

Performance requirements must be established through measurement, not arbitrary universal thresholds.

### Article 31. Regression Prevention

Critical query performance must be reassessed after material changes to:

- Prisma models.
- Database migrations.
- Repository methods.
- Application query patterns.
- Pagination.
- Relationship loading.
- Transaction workflows.

Material regressions must be investigated before release.

---

## PART VII — STORAGE, MAINTENANCE AND OPERATIONS

### Article 32. Database Storage Governance

Database capacity planning must include:

- Table storage.
- Index storage.
- WAL growth.
- Temporary files.
- Dead tuples.
- Backup requirements.
- Retention.
- Replication overhead where applicable.

Deleting application records must not be assumed to release operating-system storage immediately. PostgreSQL's MVCC, vacuum and table/index maintenance behavior must be understood when planning capacity.

### Article 33. Statistics and Autovacuum

The team must monitor:

- Table statistics freshness.
- Dead tuples.
- Autovacuum activity.
- Analyze operations.
- Long-running transactions.
- Vacuum effectiveness.

Autovacuum configuration must be evaluated against table size, update frequency and actual database behavior.

### Article 34. Index Maintenance

`REINDEX` and other index maintenance operations must be evidence-driven.

The team must investigate:

- Bloat.
- Corruption.
- Storage inefficiency.
- Query degradation.
- Maintenance windows.
- Operational locking.

Large production indexes must be maintained using appropriate operational procedures.

### Article 35. PostgreSQL Monitoring

The operational monitoring baseline shall include:

- `pg_stat_user_indexes`
- `pg_stat_user_tables`
- `pg_stat_statements`
- `pg_stat_activity`
- Table and index size statistics.
- Database connections.
- Slow query observations.
- Vacuum and analyze statistics.

Index usage statistics must be interpreted in light of monitoring duration and statistics resets. Unused-index reports must never automatically trigger destructive index removal.

---

## PART VIII — MIGRATION AND CHANGE CONTROL

### Article 36. Migration Governance

Every structural database change must be version-controlled and reproducible.

A migration must include:

1. Change purpose.
2. Affected models and tables.
3. Index or constraint definitions.
4. Expected benefits.
5. Storage implications.
6. Write-performance implications.
7. Deployment requirements.
8. Validation procedure.
9. Failure handling.
10. Recovery strategy.

### Article 37. Production Index Creation

For large tables, engineers must evaluate `CREATE INDEX CONCURRENTLY`.

Concurrent creation can reduce blocking of ordinary writes, but it is not free of operational considerations. The migration process must account for:

- Transaction restrictions.
- Additional resource consumption.
- Failed concurrent builds.
- Invalid index states.
- Deployment time.
- Lock behavior.
- Verification.

Prisma migration workflows must accommodate these PostgreSQL requirements through appropriately controlled SQL migrations.

### Article 38. Migration Rollback

Every material index migration must have a recovery plan.

The plan must consider:

- Whether the index can be safely removed.
- Whether a constraint depends on it.
- Whether the application version remains compatible.
- Whether the migration can be reversed without data loss.
- Whether rollback could create operational locking.

Destructive schema changes must never be treated as automatically reversible.

### Article 39. Schema Drift Prevention

Manual production modifications must be exceptional and documented.

The actual database must remain consistent with version-controlled migration history. Unexpected indexes, missing constraints and undocumented schema modifications must be investigated.

---

## PART IX — SECURITY AND DATA INTEGRITY

### Article 40. Security Independence

Indexes must never be treated as authorization controls. Tenant isolation, user ownership, role permissions and access restrictions must be enforced independently. A correctly indexed query can still expose unauthorized records if application authorization is defective.

### Article 41. Financial and Transactional Integrity

Financial operations must preserve:

- Atomicity.
- Referential integrity.
- Required uniqueness.
- Idempotency.
- Appropriate transaction isolation.
- Concurrency safety.

Unique indexes and constraints must enforce applicable business invariants at database level.

### Article 42. Sensitive Data Protection

Performance instrumentation must not expose:

- Passwords.
- Authentication tokens.
- Payment credentials.
- Private personal information.
- Secrets.
- Sensitive external-provider payloads.

Database observability must follow Maysar's security and data-protection standards.

---

## PART X — ENGINEERING GOVERNANCE

### Article 43. Responsibility

| Role | Responsibility |
|------|----------------|
| **Database Architecture Authority** | Overall indexing architecture, standards, major changes and technical approval. |
| **Backend Engineering** | Query design, Prisma implementation, SQL inspection and application-level performance. |
| **Database Operations** | PostgreSQL monitoring, storage management, maintenance and operational stability. |
| **Quality Assurance** | Data integrity testing, query regression testing and representative workload validation. |

Responsibilities may be combined in a small team, but accountability must remain explicit.

### Article 44. Index Change Classification

| Class | Description |
|-------|-------------|
| **Class 1 — Routine** | Low-risk, evidence-supported changes with limited operational impact. |
| **Class 2 — Significant** | Composite indexes, major query-related changes and indexes on high-volume tables. |
| **Class 3 — Critical** | Financial constraints, major transactional structures, large production migrations and potentially disruptive changes. |

Approval requirements must reflect the classification.

### Article 45. Documentation

Every significant index must have a documented purpose.

Documentation must identify:

- Supported query pattern.
- Index definition.
- Column ordering rationale.
- Expected benefit.
- Known trade-offs.
- Verification evidence.
- Review date or trigger.

---

## PART XI — PRE-LAUNCH MANDATE

### Article 46. Comprehensive Initial Audit

Before production launch, Maysar must complete a full PostgreSQL and Prisma indexing audit.

The audit must inspect:

1. Complete Prisma schema.
2. All models and enums.
3. All primary keys.
4. All unique constraints.
5. All foreign-key relationships.
6. All existing indexes.
7. All relevant migration files.
8. Representative repository queries.
9. Generated SQL for critical operations.
10. Expected table growth.
11. Read/write workload patterns.
12. Potential integrity risks.

The audit must produce an evidence-based model-by-model inventory.

### Article 47. Finding Classification

All findings must be assigned one of the following classifications:

| Classification | Definition |
|---------------|------------|
| **Critical** | A verified defect threatening correctness, essential business operations or serious production performance. |
| **High** | A verified or strongly evidenced risk with significant operational consequences. |
| **Medium** | A meaningful optimization or maintainability concern. |
| **Low** | A minor improvement or future scalability consideration. |
| **Not Recommended** | An optimization that lacks sufficient justification or introduces disproportionate cost. |

Verified defects must be distinguished from hypotheses and recommendations. No missing index may be declared without examining the relevant schema and query requirements.

### Article 48. Required Audit Deliverables

The initial audit must produce:

- Executive assessment.
- Complete model inventory.
- Existing index inventory.
- Foreign-key assessment.
- Unique-constraint assessment.
- Missing-index findings.
- Redundancy findings.
- Composite-index blueprint.
- Specialized-index assessment.
- Critical query analysis.
- Performance risks.
- Storage and write-cost assessment.
- Recommended Prisma modifications.
- Controlled SQL migrations.
- Deployment and rollback plan.
- Automated verification strategy.
- Performance benchmark plan.
- Operational monitoring plan.
- Prioritized implementation roadmap.

### Article 49. Implementation Authorization

An audit does not authorize automatic database modification.

All proposed changes must first be documented and reviewed. Implementation must proceed through version-controlled migrations, testing and verification. Production modifications require explicit authorization and an appropriate deployment plan.

---

## PART XII — CONTINUOUS SCALABILITY

### Article 50. Growth Assessment

Database design must be periodically reassessed against actual and projected:

- Registered users.
- Active users.
- Products.
- Orders.
- Order items.
- Payments.
- Financial transactions.
- Inventory records.
- Notifications.
- Events and audit records.
- Concurrent requests.

The engineering team must distinguish between total registered users and actual database workload. Capacity planning must be based on observed traffic, data growth and resource consumption.

### Article 51. Advanced Scaling Mechanisms

The following mechanisms may be introduced when justified:

- Table partitioning.
- Read replicas.
- Materialized views.
- Archival systems.
- Specialized search infrastructure.
- Caching.
- Workload isolation.
- Database connection pooling.

These are architectural options, not mandatory components of an early-stage deployment. They must not be used to conceal poorly designed queries or inadequate indexing.

### Article 52. Architectural Review

Major changes in business operations, data relationships or workload patterns must trigger an indexing and query-performance review. The architecture must evolve with the platform rather than remain frozen at its original design.

---

## PART XIII — COMPLIANCE AND ENFORCEMENT

### Article 53. Engineering Compliance

All material database changes must demonstrate compliance with this constitution. Noncompliant changes must be corrected or receive a documented exception.

### Article 54. Exception Management

Every exception must contain:

- Technical justification.
- Affected models and operations.
- Risk assessment.
- Compensating measures.
- Responsible approver.
- Review conditions.

Temporary exceptions must have an expiration or reassessment condition.

### Article 55. Auditability

All significant indexing decisions must be traceable through:

- Version-controlled schema changes.
- Migration history.
- Review records.
- Benchmark results.
- Performance observations.
- Operational reports.

The engineering team must be able to explain why every critical index exists and what evidence supports its continued presence.

---

## FINAL CONSTITUTIONAL DIRECTIVE

Maysar shall not measure database quality by the quantity of indexes, the apparent sophistication of its schema or the successful execution of migration commands.

Database quality shall be measured by **correctness, efficiency, reliability, maintainability and demonstrated capacity to support real business workloads**.

> Every index must have a reason to exist.
> Every critical query must have a performance justification.
> Every material migration must have a controlled implementation and verification process.
> Every significant performance risk must have an accountable resolution path.
> Every optimization must preserve the integrity of the platform.

Maysar's database must be engineered not merely to accommodate today's operations, but to sustain tomorrow's complexity without compromising the reliability of today's business.

---

*Governing standard: MYS-DB-001*
*Review authority: Maysar Engineering Architecture*
*Implementation principle: Evidence before modification; verification before release; continuous accountability after deployment*
