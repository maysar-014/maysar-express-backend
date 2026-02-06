# Maysar Monolithic Integration Constitution

> **Authority**: Binding integration law for all Maysar modules.
> **Mission**: Establish a disciplined, reliable, and maintainable integration standard for **internal module communication**.
> **Core Mandate**: Ensure all module interactions are clear, traceable, and safe, while preparing for future microservices scaling.

---

## Core Integration Philosophy

### The Hybrid Model
Maysar follows a **Hybrid Integration Strategy**, balancing immediate consistency with asynchronous scalability within the monolith.

1.  **Synchronous (Direct)**: Used for internal workflows where immediate feedback is required (e.g., user signup, wallet credit).
2.  **Asynchronous (Event-Driven)**: For cross-module business processes, long-running workflows, and Saga orchestration.

### Integration Truth Principles (ITP)
*   **Contract-First**: All module interactions must be defined via DTOs, Commands, or Events.
*   **Module Independence**: Modules remain independent. No module should access another module's database directly. No cross-module foreign keys.
*   **Idempotency Required**: All async event handlers must handle repeated events gracefully.
*   **Logging, Traceability, Error Handling**: Mandatory for all interactions.

---

## Module Communication Rules (CRITICAL)

### Section 1 - Preferred Communication
- Event-driven via **in-memory event bus** (Node.js EventEmitter, NestJS EventBus, etc.).
- Supports Saga orchestration, compensating actions, async workflows.
- Reference implementation: `file:shared/events/eventBus.ts`

### Section 2 - Synchronous Calls
- Allowed only for internal, immediate-response workflows.
- Must use public module service interfaces.
- **Forbidden**: Direct repository or domain object access across modules.

### Section 3 - Contracts
- All module interactions must be defined via DTOs, Commands, or Events.
- Internal interfaces must be versioned and documented.
- Modules must not share entities, value objects, or ORM models.

### Canonical Identity & Tracing
Every event or sync call **must** carry the following headers/metadata (where applicable):
*   `X-Correlation-ID`: Unified identifier for the workflow (tracing across modules).
*   `X-Request-ID`: Unique identifier for this specific call.
*   `X-User-ID`: Authenticated user context.

---

## Event-Driven Excellence

### Event Classification
1.  **Domain Events**: Significant business state changes within a module (e.g., `ReferralCompleted`). Carries "minimum viable data."
2.  **Integration Events**: Specifically designed for cross-module boundary synchronization (e.g., `WalletCredited`).
3.  **Command Events**: Requests for another module to perform an action asynchronously.

### Reliability Mandates
*   **Idempotency**: All async event handlers must handle repeated events gracefully.
*   **Compensation**: All Saga steps must have compensating action or be explicitly irreversible.
*   **Traceability**: Every event or sync call must include correlation and request IDs in logs.

---

## Synchronous vs Asynchronous Guidelines

| Context | Pattern | Applicability Examples |
| :--- | :--- | :--- |
| **Immediate Feedback** | Synchronous | Signup, Login, Payment confirmation |
| **Workflows** | Asynchronous | Referral bonus, Wallet credit, Notifications |
| **Orchestration** | Event-Driven | Saga compensation, retry flows |
| **Analytics/Logs** | Async/Queued | Internal aggregations, metrics |

---

## Security & Access
*   **Internal calls**: In-memory function calls — **network security not required** (no mTLS or internal JWT).
*   **Perimeter Security**: Security boundaries are at the application perimeter, not between modules.
*   **Secrets**: Use secured configuration (no direct environment variable dependency in domain).

## Observability & Logging
*   **Consistency**: All module interactions must be logged with correlation IDs.
*   **Error Handling**: Errors must be handled and propagated to Sagas for compensation.
*   **Monitoring**: Workflow completion monitoring required for critical modules (e.g., Wallet, Referral, Payment).

---

## Developer Integration Checklist
*Must be verified during PR review*

- [ ] Is a contract defined and documented?
- [ ] Are DTOs, Commands, or Events used instead of entities?
- [ ] Are async handlers idempotent?
- [ ] Are synchronous calls restricted to service interfaces?
- [ ] Are correlation and request IDs logged for traceability?
- [ ] Are errors handled and propagated to allow compensation?

---

## Enforcement & Compliance

Compliance with this constitution is enforced through:
1.  **Code Reviews**: Violations are blockers.
2.  **Unit & Integration Tests**: Must cover async workflows and Saga coordination.
3.  **Logging Monitoring**: Missing correlation IDs or unhandled errors are reported.

---

## Future-Proofing Clause (NEW)

While currently monolithic:
- Modules are decoupled and event-driven.
- Contracts, DTOs, and Sagas are microservices-ready.
- The in-memory event bus can be replaced with Kafka/RabbitMQ without changing module code.
- Current module boundaries are designed to become service boundaries.

---

## Binding Principle

> **Every module interaction must be clear, traceable, and reliable. Violations of contract, improper direct access, or leaking domain logic outside a module constitute integration defects.**
