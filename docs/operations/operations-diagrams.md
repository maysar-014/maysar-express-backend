# Maysar Express — Operations Diagrams

> Covers: saga orchestration, outbox pattern, observability, CI/CD, and incident response.

---

## 1. Saga Orchestration Overview

```mermaid
sequenceDiagram
    participant Client
    participant OrderSaga as Order Fulfillment Saga
    participant Inventory as Inventory Service
    participant Payment as Payment Service
    participant Logistics as Logistics Service
    participant Commission as Commission Service
    participant Bus as EventBus

    Note over Client,Bus: Happy Path — Order Fulfillment Saga

    Client->>OrderSaga: Create Order
    OrderSaga->>Bus: Publish OrderCreated
    Bus->>Inventory: OrderCreated → Reserve Stock
    Inventory->>Bus: StockReserved
    Bus->>OrderSaga: StockReserved → Next step
    OrderSaga->>Bus: Publish OrderStockReserved
    Bus->>Payment: OrderStockReserved → Process Payment
    Payment->>Bus: PaymentCompleted
    Bus->>OrderSaga: PaymentCompleted → Next step
    OrderSaga->>Bus: Publish OrderConfirmed
    Bus->>Logistics: OrderConfirmed → Create Shipment
    Logistics->>Bus: ShipmentCreated
    Bus->>OrderSaga: ShipmentCreated → Complete

    Note over Client,Bus: Compensation Path — Payment Failure

    Payment->>Bus: PaymentFailed
    Bus->>OrderSaga: PaymentFailed → Compensate
    OrderSaga->>Bus: Publish OrderCancelled
    Bus->>Inventory: OrderCancelled → Release Stock
    Inventory->>Bus: StockReleased
    OrderSaga->>Client: Order cancelled (compensation complete)
```

---

## 2. Outbox Pattern Flow

```mermaid
flowchart LR
    subgraph ServiceDB["Service Database (Same Transaction)"]
        BUSINESS_OP["Business Operation\n(e.g., Create Order)"]
        OUTBOX_TABLE["Outbox Table\n(order_outbox_events)\nStatus: PENDING"]
    end

    subgraph Processor["Outbox Processor (Background)"]
        POLL["Poll every 5s\nBatch size: 50"]
        RETRY["Retry Logic\nMax 5 attempts\n30s delay"]
        DEAD_LETTER["Dead Letter\n(after 5 failures)"]
    end

    subgraph EventBus["InMemoryEventBus"]
        DISPATCH["Dispatch Event\nto Subscribers"]
        HANDLER_RETRY["Handler Retry\n3 attempts\n50ms/100ms/200ms"]
    end

    BUSINESS_OP -->|"Atomic write\n(same TX)"| OUTBOX_TABLE
    OUTBOX_TABLE --> POLL
    POLL --> DISPATCH
    DISPATCH --> HANDLER_RETRY
    HANDLER_RETRY -->|"Success"| MARK_PROCESSED["Mark PROCESSED\nTimestamp recorded"]
    HANDLER_RETRY -->|"Failure"| RETRY
    RETRY -->|"Max retries"| DEAD_LETTER

    style OUTBOX_TABLE fill:#E67E22,color:#fff
    style DEAD_LETTER fill:#F44336,color:#fff
    style MARK_PROCESSED fill:#4CAF50,color:#fff
```

---

## 3. Observability Stack

```mermaid
graph TB
    subgraph Services["Service Modules"]
        SVC["All 22 Services\n(Instrumented)"]
    end

    subgraph Metrics["Metrics (Prometheus)"]
        PROM_ENDPOINT["/metrics endpoint\n(per service)"]
        METRICS_LIST["• Request latency histograms\n• Error rate counters\n• Saga failure rates\n• Event processing delay\n• DB query latency\n• Cache hit/miss rates"]
    end

    subgraph Tracing["Distributed Tracing (Jaeger)"]
        TRACE["OpenTelemetry\nTrace propagation"]
        SPANS["Spans across:\n• HTTP requests\n• DB queries\n• Event publishing\n• Saga steps"]
    end

    subgraph Logging["Structured Logging (Winston)"]
        LOGS["Correlation ID\nRequest ID\nExecution time\nStructured JSON"]
    end

    subgraph Errors["Error Tracking (Sentry)"]
        SENTRY["Exception capture\nStack traces\nRelease tracking"]
    end

    subgraph Alerting["Alerting"]
        ALERTS["• P99 latency > 500ms\n• Error rate > 1%\n• Saga failure rate > 0.1%\n• Outbox lag > 100 events\n• DB connection pool exhausted"]
    end

    SVC --> PROM_ENDPOINT
    SVC --> TRACE
    SVC --> LOGS
    SVC --> SENTRY
    PROM_ENDPOINT --> METRICS_LIST
    METRICS_LIST --> ALERTS

    style PROM_ENDPOINT fill:#E65100,color:#fff
    style TRACE fill:#1565C0,color:#fff
    style SENTRY fill:#F44336,color:#fff
```

---

## 4. CI/CD Pipeline

```mermaid
flowchart LR
    DEV["Developer\nPushes Code"] --> PR["Pull Request\nCreated"]

    PR --> LINT["ESLint\nCode Quality"]
    PR --> TYPE_CHECK["TypeScript\nType Check"]
    PR --> UNIT["Unit Tests\n(Jest)"]

    LINT & TYPE_CHECK & UNIT --> INTEGRATION["Integration Tests\n(Testcontainers\n+ PostgreSQL)"]

    INTEGRATION --> CONTRACT["Contract Tests\n(Dredd + OpenAPI)"]
    CONTRACT --> E2E["E2E Tests\n(Newman + Postman)"]

    E2E --> BUILD["Docker Build\n(Multi-stage)"]
    BUILD --> SECURITY["Security Scan\n(Gitleaks + SAST)"]

    SECURITY --> STAGING["Deploy to Staging\n(docker-compose.staging.yml)"]
    STAGING --> SMOKE["Smoke Tests\n(Health + Readiness)"]

    SMOKE --> PROD_GATE{Production\nGate}
    PROD_GATE -->|"Manual Approval"| PROD["Deploy to Production\n(docker-compose.prod.yml)"]
    PROD_GATE -->|"Rejected"| ROLLBACK["Rollback\nPrevious Version"]

    PROD --> MONITOR["Monitor\n(Prometheus + Sentry)"]

    style PROD fill:#4CAF50,color:#fff
    style ROLLBACK fill:#F44336,color:#fff
    style STAGING fill:#FF9800,color:#fff
```

---

## 5. Incident Response Flow

```mermaid
flowchart TD
    ALERT["🚨 Alert Triggered\n(Prometheus / Sentry)"] --> SEVERITY{Severity\nLevel}

    SEVERITY -->|"P1: Critical\n(Production down)"| P1["Page On-call Engineer\n(Immediate response)"]
    SEVERITY -->|"P2: High\n(Degraded service)"| P2["Notify Team\n(15 min response)"]
    SEVERITY -->|"P3: Medium\n(Non-critical)"| P3["Create Ticket\n(Next business day)"]

    P1 --> TRIAGE["Triage\n(Identify affected service)"]
    P2 --> TRIAGE

    TRIAGE --> DIAGNOSE["Diagnose\n(Logs · Traces · Metrics)"]
    DIAGNOSE --> MITIGATE{Mitigation\nStrategy}

    MITIGATE -->|"Code bug"| HOTFIX["Deploy Hotfix\n(Fast-track CI/CD)"]
    MITIGATE -->|"Data issue"| DATA_FIX["Run Recovery Script\n(Saga recovery worker)"]
    MITIGATE -->|"Infrastructure"| INFRA_FIX["Scale / Restart\nService Instance"]
    MITIGATE -->|"External dependency"| CIRCUIT_BREAK["Activate Circuit Breaker\n(Fallback mode)"]

    HOTFIX & DATA_FIX & INFRA_FIX & CIRCUIT_BREAK --> VERIFY["Verify Resolution\n(Smoke tests)"]
    VERIFY --> POSTMORTEM["Post-mortem\n(Root cause · Prevention)"]
    POSTMORTEM --> RUNBOOK["Update Runbook\n(Incident playbook)"]

    style P1 fill:#F44336,color:#fff
    style P2 fill:#FF9800,color:#fff
    style P3 fill:#4CAF50,color:#fff
    style VERIFY fill:#2196F3,color:#fff
```
