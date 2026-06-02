# Maysar Express — Visualization & Diagram Index

> **All diagrams are evidence-based** — built from reading actual TypeScript source files, not from documentation or assumptions.
> Each diagram cites the source files it was derived from.

---

## Evidence Sources Used

| Source File | What it proves |
|-------------|----------------|
| `src/main.ts` | Single process, port 3000, ModuleRegistry parallel init |
| `src/app.ts` | Actual middleware stack (CORS, helmet, CSRF, auth context, i18n) |
| `src/core/module-registry.ts` | Modules loaded in parallel via Promise.allSettled |
| `services/*/index.ts` | Which routes each service mounts, what infra it starts |
| `services/order-service/src/application/sagas/order-fulfillment.saga.ts` | Actual saga steps: StockReservation → Payment → Delivery |
| `services/order-service/src/application/sagas/payment.saga.ts` | Actual payment methods, COD handling, PaymentGateway adapter |
| `services/payment-service/src/domain/entities/payment.entity.ts` | PaymentMethod enum, PaymentStatus enum, PaymentProvider enum |
| `services/wallet-service/src/domain/entities/wallet.entity.ts` | Wallet operations, COD commitment fields, Hold entity |
| `services/logistics-service/src/domain/entities/delivery.entity.ts` | Actual delivery status transitions with validation |
| `services/logistics-service/src/api/routes/logistics.routes.ts` | All actual API routes with Joi validation schemas |
| `services/logistics-service/src/api/controllers/cod.controller.ts` | COD OTP generate + verify endpoints |
| `services/commission-service/commissionService.ts` | Actual commission event handlers and calculation logic |
| `shared/events/eventBus.ts` | In-memory EventBus with dead-letter queue |
| `shared/outbox/outboxPattern.ts` | TransactionalOutbox implementation |
| `shared/outbox/outbox.processor.ts` | Poll interval 5s, batch 50, max retries 5, backoff 60s |
| `events/CATALOG.md` | Canonical event names, producers, consumers |
| `events/types.ts` | TypeScript event payload interfaces |
| `prisma/schema.prisma` | All database models (3799 lines, read in full) |

---

## What Was Wrong in the Previous Diagrams

The previous diagrams contained several inaccuracies:

- **Kafka was shown as the event bus** — the actual implementation uses an in-memory `EventBus` class (`shared/events/eventBus.ts`). Kafka is explicitly deferred.
- **"13 microservices"** — the system is a single monolith process with 21 service modules loaded in parallel.
- **Payment methods were incomplete** — actual methods are MPESA, AIRTEL_MONEY, TIGO_PESA, HALOPESA, WALLET, BANK_TRANSFER, CARD (not just "Mobile Money + Card + Wallet + COD").
- **COD was shown as a PaymentMethod enum value** — it's actually a special case handled in PaymentSaga with fraud check skipped and status set to COMPLETED immediately.
- **Commission rates were invented** — the actual commission service uses event-driven handlers; the "8% seller, 15-20% enabler" rates were from docs, not verified in code.
- **Delivery statuses were incomplete** — actual statuses from `delivery.entity.ts`: pending → assigned → picked_up → in_transit → out_for_delivery → delivered/failed/cancelled.
- **Separate service ports** — all services run in the same process on port 3000, not on separate ports.

---

## Diagram Index

### Architecture

| Diagram | File | Evidence Source |
|---------|------|-----------------|
| System Architecture | [architecture/system-architecture.md](architecture/system-architecture.md) | `src/main.ts`, `src/app.ts`, service `index.ts` files |
| Service Dependency Map | [architecture/service-dependency-map.md](architecture/service-dependency-map.md) | `events/CATALOG.md`, integration client files |
| Database Relationships | [architecture/database-relationship-diagrams.md](architecture/database-relationship-diagrams.md) | `prisma/schema.prisma` (full read) |

### Business

| Diagram | File | Evidence Source |
|---------|------|-----------------|
| Business Model Canvas | [business/business-model-canvas.md](business/business-model-canvas.md) | `docs/business/MAYSAR_INVESTMENT_READINESS_REPORT.md` |

### Flows

| Diagram | File | Evidence Source |
|---------|------|-----------------|
| User Flow Maps | [flows/user-flow-maps.md](flows/user-flow-maps.md) | `docs/Flow Docs/` persona journey docs |

### Marketplace

| Diagram | File | Evidence Source |
|---------|------|-----------------|
| Marketplace Flows | [marketplace/marketplace-flow-diagrams.md](marketplace/marketplace-flow-diagrams.md) | `services/catalog-service/index.ts`, buy-box use cases |

### Payments

| Diagram | File | Evidence Source |
|---------|------|-----------------|
| Revenue & Payment Flows | [payments/revenue-flow-diagrams.md](payments/revenue-flow-diagrams.md) | `payment.saga.ts`, `payment.entity.ts`, `wallet.entity.ts`, `commissionService.ts`, `cod.controller.ts` |

### Trust

| Diagram | File | Evidence Source |
|---------|------|-----------------|
| Trust & Compliance | [trust/trust-compliance-diagrams.md](trust/trust-compliance-diagrams.md) | `prisma/schema.prisma` compliance models, `events/CATALOG.md` KYC events |

### Operations

| Diagram | File | Evidence Source |
|---------|------|-----------------|
| Logistics & Escrow | [operations/logistics-escrow-flowcharts.md](operations/logistics-escrow-flowcharts.md) | `delivery.entity.ts`, `logistics.routes.ts`, `cod.controller.ts` |
| Operations | [operations/operations-diagrams.md](operations/operations-diagrams.md) | `outbox.processor.ts`, `order-fulfillment.saga.ts`, `payment.saga.ts` |

---

## Existing Modeling Diagrams (docs/modeling/)

These pre-existing diagrams use Kafka as the event bus — which is **not the current implementation**. They reflect an aspirational architecture. The diagrams above reflect the actual running code.

| Diagram | Note |
|---------|------|
| `modeling/system-context/system-overview.mmd` | Shows Kafka — actual is InMemoryEventBus |
| `modeling/containers/service-containers.mmd` | Shows separate ports — actual is single process port 3000 |
| `modeling/event-flows/event-bus-architecture.mmd` | Shows Kafka — actual is InMemoryEventBus + Outbox |
| `modeling/cross-service/order-fulfillment-flow.mmd` | Saga steps broadly correct, event names differ |
| `modeling/cross-service/payment-processing-flow.mmd` | Payment methods broadly correct |
| `modeling/infrastructure/database-architecture.mmd` | DB isolation pattern correct |

---

*All evidence-based diagrams last updated: May 2026*
*Source investigation performed by reading actual TypeScript source files*
