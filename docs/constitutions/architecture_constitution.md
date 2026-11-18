# Maysar Monolithic Architecture Constitution

> **Purpose**: This document is the binding architectural law for all modules in this platform. This document is binding for all current and future development.
> **Goal**: Protect business logic, enforce consistency, maintain module independence, enable safe orchestration, and ensure scalability and maintainability using **Clean Architecture + Saga Orchestration**.

---

## 1. Core Philosophy

**Business logic is sacred.**  
**Coordination is controlled.**  
**Side effects are contained.**

Any design or code change must preserve these truths. These principles apply to **module boundaries** within the monolith. Modules are logical boundaries, not physical service boundaries.

---

## 2. The Sovereign Layer Model

Each module is divided into sovereign layers with strict responsibilities. These layers apply **within each module** of the monolith.

```
API → Application → Domain
Infrastructure → Domain (implements ports)
```

### Layer Responsibilities

| Layer | Responsibility | Must NOT Do |
|-----|---------------|-------------|
| Domain | Business truth & rules | Call DB, HTTP, messaging |
| Application | Use cases & Sagas | Contain business rules |
| Infrastructure | External systems | Decide business logic |
| API | Transport & validation | Implement workflows |

**Rule**: Dependencies may point only inward. Never outward.

---

## 3. The Business Core Protection Principle (BCPP)

> **All business truth lives in the Domain.**  
> **All coordination lives in Application Sagas.**  
> **All side effects live in Infrastructure.**  
> **No layer may violate another’s sovereignty.**

Violation of this principle is considered a critical architectural defect, regardless of whether the system is implemented as a monolith or microservices.

---

## 4. Domain Law (Non‑Negotiable)

### 4.1 Domain Purity Rule
- No framework imports (HTTP, ORM, Kafka, Redis)
- No environment variables
- No network or file system access

The domain **must compile and run in isolation**.

### 4.2 Business Truth Immutability Rule

If the following change:
- Database technology
- Messaging broker
- Transport protocol

➡️ **Domain code must not change**.

---

## 5. Engines, Policies, Algorithms Separation

### Algorithms
- Pure computation
- Deterministic
- Stateless

Examples: ETA calculation, routing, scoring

### Policies
- Allow / deny decisions
- Volatile rules
- Configurable & versioned

Examples: eligibility, fraud rules, limits

### Engines
- Orchestrate algorithms + policies
- Make business decisions
- No side effects

> **Engines may compute and decide — never persist or communicate externally. Engines operate within module boundaries.**

---

## 6. Saga Orchestration Law

### 6.1 Orchestration Exclusivity Rule

> **Only Sagas may coordinate multiple modules.**

Forbidden locations for orchestration:
- Module controllers
- Domain entities
- Infrastructure adapters

Allowed location:
```
application/sagas/
```

Note: Sagas may coordinate **across modules** within the monolith.

### 6.2 Decision vs Coordination Rule

| Question | Owner |
|-------|------|
| Is this allowed? | Domain / Policy |
| Who should be selected? | Engine |
| In what order do actions happen? | Saga |
| How do we call external systems? | Infrastructure |

Sagas **never** decide business correctness.

---

## 7. Compensation Completeness Rule

Every Saga step must satisfy **one** of the following:

1. Has a compensating action
2. Is explicitly documented as irreversible

Examples:
- Reserve stock → Release stock
- Charge payment → Refund
- Assign courier → Unassign courier

Undocumented irreversible steps are forbidden.

---

## 8. Infrastructure Isolation Rule

Infrastructure adapts to the Domain within each module — never the reverse.

### Required Pattern

```
Domain Interface (Port)
        ↑
Infrastructure Adapter
```

Infrastructure may change freely without affecting Domain logic.

---

## 9. Module Communication Rule (NEW)

- **Preferred**: Event-driven via **in-memory event bus** (Node.js EventEmitter, NestJS EventBus).
- **Allowed**: Direct service calls for synchronous, internal operations only via public module service interfaces.
- **Forbidden**: Modules directly accessing each other's repositories or entities.
- Note: "This ensures loose coupling and future microservices readiness."

---

## 10. DTO Firewall Rule

> **No Domain Entity crosses a module boundary. Ever.**

### Allowed Across Boundaries
- DTOs
- Commands
- Events

### Forbidden
- Entities
- Value Objects
- ORM Models

This rule applies to:
- HTTP
- Messaging
- Internal module-to-module calls

---

## 11. File Structure Mandate

Every module MUST follow this structure:

```
src/
 ├── domain/
 │    ├── entities/
 │    ├── value-objects/
 │    ├── engines/
 │    ├── policies/
 │    ├── algorithms/
 │    └── events/
 │
 ├── application/
 │    ├── use-cases/
 │    ├── sagas/
 │    ├── dto/
 │    └── mappers/
 │
 ├── infrastructure/
 │    ├── repositories/
 │    ├── messaging/
 │    ├── providers/
 │    └── cache/
 │
 └── api/
      ├── controllers/
      ├── routes/
      └── validators/
```

Deviation requires architectural approval. Each module in the `services/` directory follows this structure.

---

## 12. Testing Constitution

| Test Type | Scope |
|---------|------|
| Domain tests | Pure logic only |
| Saga tests | Orchestration & compensation |
| Integration tests | Infrastructure correctness |

No infrastructure dependency is allowed in domain tests.

---

## 13. Enforcement Mechanisms

This constitution is enforced via:

1. **Code reviews** — violations are blockers
2. **Static analysis** — forbidden imports
3. **Architectural tests** — dependency rules
4. **Folder ownership** — restricted write access (references module changes)

---

## 14. Change Governance

- Domain changes require senior approval
- Policy changes require versioning
- Saga changes require compensation review
- Module boundary changes require architectural review

---

---

## 15. Future-Proofing Clause (NEW)

This monolithic constitution prepares the platform for microservices.
- When modules are split into separate services, enforcement can be tightened for service boundaries, messaging, and external communication.
- Current module boundaries are designed to become service boundaries.
- Business logic will not require rewriting during microservices migration.

---

## 16. The Final Law

> **If business logic leaks, the architecture has failed.**

This document is binding for all current and future modules.

---

**End of Constitution**

