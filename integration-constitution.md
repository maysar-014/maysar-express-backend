# Maysar Integration Constitution

> **Authority**: Supreme integration law binding all Maysar services and systems.
> **Mission**: Establish a tool-agnostic, hybrid integration standard that guarantees seamless, reliable, and scalable communication across the microservices ecosystem.
> **Core Mandate**: Every integration point must be contract-first, battle-tested, and secure by design.

---

## Core Integration Philosophy

### The Hybrid Model
Maysar follows a **Hybrid Integration Strategy**, balancing immediate consistency with asynchronous scalability.

1.  **Synchronous (Direct)**: Used for user-facing interactions where immediate feedback is required (e.g., Auth, Payments).
2.  **Asynchronous (Event-Driven)**: The default for cross-service business processes, data synchronization, and long-running workflows.

### Integration Truth Principles (ITP)
*   **Contract-First**: No integration starts without a defined and versioned contract (OpenAPI, Protobuf, or AsyncAPI).
*   **Data Sovereignty**: Services own their data. No database sharing. No cross-service foreign keys.
*   **Idempotency Required**: All consumers must handle duplicate messages gracefully.
*   **Outbox Pattern**: All state changes and their resulting events must be persisted atomically to ensure reliability.

---

## Communication Standards

### Protocol Strategy
| Context | Pattern | Standard |
| :--- | :--- | :--- |
| **External/Public** | Request/Response | RESTful API |
| **Internal High-Perf** | Request/Response | gRPC |
| **Cross-Service** | Pub/Sub | Message Broker (Events) |
| **Streaming** | Stream Processing | Event Log |

### Canonical Identity & Tracing
Every integration request or event **must** carry the following headers/metadata:
*   `X-Correlation-ID`: Unified ID for tracing a request across the entire system.
*   `X-Request-ID`: Unique ID for the specific call instance.
*   `X-User-ID`: (When applicable) The authenticated user context.

---

## Event-Driven Excellence

### Event Classification
1.  **Domain Events**: Significant business state changes (e.g., `OrderPlaced`). Carries the "minimum viable data."
2.  **Integration Events**: Specifically designed for cross-boundary synchronization.
3.  **Command Events**: Direct requests for another service to perform an action asynchronously.

### Reliability Mandates
*   **The Outbox Pattern**: Services must use a local outbox table to ensure events are published *only* if the local transaction succeeds.
*   **Exactly-Once Processing**: Achieved through Idempotent Consumers and deduplication keys.
*   **Dead Letter Handling**: Every failed message must be routed to a Dead Letter Queue (DLQ) with automated alerting.

---

## Service Integration Workflow
*How to establish a new connection between services*

1.  **Define Contract**: Create the OpenAPI or AsyncAPI specification.
2.  **Propose Changes**: Submit an RFC or PR with the contract for consumer review.
3.  **Implement Mock**: Provide a mock endpoint or event example for the consumer team.
4.  **Integrate**: Developer implements the logic using standard libraries (mTLS, correlation handlers).
5.  **Verify**: Run contract tests (e.g., Pact) to ensure compatibility.
6.  **Deploy**: Use Canary releases to monitor the new integration in production.

---

## Cross-Cutting Concerns

### Security & Access
*   **Zero Trust**: Mutual TLS (mTLS) is mandatory for all internal communication.
*   **Identity**: Use short-lived JWT tokens for service-to-service authentication.
*   **Authorization**: Formal RBAC/ABAC checks must be implemented at the service boundary.

### Resilience & Performance
*   **Circuit Breakers**: Mandatory for all synchronous dependencies.
*   **Timeout Management**: Strict timeouts on all network calls.
*   **Bulkheading**: Isolate resources for critical integration paths.
*   **Caching**: Prefer event-driven cache invalidation over TTL-only strategies.

---

## Developer Integration Checklist
*Must be verified during PR review*

- [ ] Does this follow a defined contract?
- [ ] Is the `X-Correlation-ID` propagated?
- [ ] For events: Is the Outbox Pattern used?
- [ ] For consumers: Is processing idempotent?
- [ ] Are timeouts and retry policies configured?
- [ ] Is there a health check reflecting this dependency?
- [ ] Are secrets managed via the secured Secret Store (no env vars)?

---

## Enforcement & Compliance

Compliance with this constitution is enforced through:
1.  **Architecture Review**: Mandatory for new integration patterns.
2.  **Contract Testing**: CI/CD failure on breaking changes.
3.  **Observability Audits**: Automated detection of missing correlation IDs or failing circuit breakers.

> **"I commit to the relentless pursuit of integration excellence, ensuring our systems are decoupled, resilient, and always reliable."**
