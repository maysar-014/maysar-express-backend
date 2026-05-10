# Maysar Express — Visualization & Diagram Index

> Complete visual documentation of the Maysar Express platform.
> All diagrams use Mermaid syntax and render in GitHub, GitLab, and any Mermaid-compatible viewer.

---

## 📐 Architecture Diagrams

| Diagram | File | Description |
|---------|------|-------------|
| System Architecture | [system-architecture.md](architecture/system-architecture.md) | High-level context, layered architecture, event-driven design, deployment |
| Service Dependency Map | [service-dependency-map.md](architecture/service-dependency-map.md) | Full service graph, event subscriptions, shared infrastructure |
| Database Relationships | [database-relationship-diagrams.md](architecture/database-relationship-diagrams.md) | ERDs for all service domains |

### What's inside `architecture/`
- **System Context** — All actors, external systems, and platform overview
- **Layered Architecture** — Clean Architecture layers per service (API → Application → Domain → Infrastructure)
- **Service Dependency Graph** — Runtime dependencies between all 22 service modules
- **Event Subscription Matrix** — Which services publish and subscribe to which events
- **Deployment Architecture** — Cloud infrastructure, load balancer, data tier, observability

---

## 💼 Business Diagrams

| Diagram | File | Description |
|---------|------|-------------|
| Business Model Canvas | [business-model-canvas.md](business/business-model-canvas.md) | Full BMC, revenue model, platform flywheel, unit economics |

### What's inside `business/`
- **Business Model Canvas** — Key partners, activities, resources, value propositions, channels, customer segments, cost structure, revenue streams
- **Revenue Pie Chart** — Revenue stream breakdown by GMV share
- **Platform Flywheel** — Network effect diagram showing how the marketplace grows
- **Unit Economics Table** — Take rates, commission rates, CAC:LTV ratio

---

## 🗺️ User Flow Maps

| Diagram | File | Description |
|---------|------|-------------|
| User Flow Maps | [user-flow-maps.md](flows/user-flow-maps.md) | All persona journeys with decision points and failure states |

### What's inside `flows/`
- **Buyer Journey** — Discovery → Cart → Checkout → Payment → Delivery → Refund
- **Seller Journey** — Registration → KYC → Catalog → Orders → Payout
- **Enabler Journey** — Onboarding → Training → Assisted Sales → Commission
- **Courier Journey** — Availability → Assignment → Delivery → COD OTP → Earnings
- **Admin Journey** — KYC Review → Dispute Resolution → User Management → Compliance

---

## 🛒 Marketplace Flow Diagrams

| Diagram | File | Description |
|---------|------|-------------|
| Marketplace Flows | [marketplace-flow-diagrams.md](marketplace/marketplace-flow-diagrams.md) | Buy-box, order lifecycle, multi-party coordination, catalog sync |

### What's inside `marketplace/`
- **Product Discovery & Buy-Box** — How the buy-box winner is selected and shown to buyers
- **Full Order Lifecycle** — State machine from cart to settlement
- **Multi-Party Coordination** — Buyer + Seller + Enabler + Courier sequence diagram
- **Catalog & Inventory Sync** — Product fingerprinting, dedup, quality scoring
- **Seller Storefront & Discovery** — Conversion signals and discovery paths

---

## 💰 Revenue & Payment Flow Diagrams

| Diagram | File | Description |
|---------|------|-------------|
| Revenue & Payment Flows | [revenue-flow-diagrams.md](payments/revenue-flow-diagrams.md) | Revenue split, payment processing, COD escrow, wallet, commission, payout |

### What's inside `payments/`
- **Revenue Flow Overview** — How money flows from buyer to all parties
- **Payment Processing Flow** — All payment methods (Mobile Money, Card, Wallet, COD)
- **COD Escrow Sequence** — Full COD lifecycle with OTP verification
- **Wallet Architecture** — Wallet types, operations, safety mechanisms, payout channels
- **Commission Distribution** — How platform fee, enabler commission, and seller net are calculated
- **Payout Settlement** — How sellers, enablers, and couriers receive their earnings

---

## 🔐 Trust & Compliance Diagrams

| Diagram | File | Description |
|---------|------|-------------|
| Trust & Compliance | [trust-compliance-diagrams.md](trust/trust-compliance-diagrams.md) | KYC flow, fraud scoring, COD reputation, platform trust, dispute resolution |

### What's inside `trust/`
- **KYC Verification Flow** — Document submission → AML → TRA → TCRA → Approval
- **Fraud Scoring System** — Signal inputs, scoring engine, thresholds, automated actions
- **COD Reputation Scoring** — How COD history builds trust tiers and limits
- **Platform Trust Architecture** — Identity, transaction, delivery, and regulatory trust layers
- **Dispute Resolution Flow** — Non-delivery, wrong item, payment issue, COD dispute paths

---

## ⚙️ Operations Diagrams

| Diagram | File | Description |
|---------|------|-------------|
| Logistics & Escrow | [logistics-escrow-flowcharts.md](operations/logistics-escrow-flowcharts.md) | Delivery lifecycle, COD escrow state machine, courier assignment, tracking |
| Operations | [operations-diagrams.md](operations/operations-diagrams.md) | Saga orchestration, outbox pattern, observability, CI/CD, incident response |

### What's inside `operations/`
- **Logistics End-to-End** — Shipment creation → courier assignment → delivery → settlement
- **COD Escrow State Machine** — All states from COD initiated to funds released
- **Courier Assignment Algorithm** — Scoring factors and assignment decision tree
- **Delivery Status Tracking** — Real-time location updates and notification sequence
- **Escrow Release Decision Tree** — Prepaid vs COD release logic with dispute handling
- **Saga Orchestration** — Happy path and compensation path sequence diagrams
- **Outbox Pattern** — Transactional outbox with retry and dead-letter handling
- **Observability Stack** — Prometheus, Jaeger, Winston, Sentry setup
- **CI/CD Pipeline** — Full pipeline from PR to production
- **Incident Response** — P1/P2/P3 severity handling and post-mortem process

---

## 🗂️ Existing Modeling Diagrams

These diagrams already exist in `docs/modeling/` and complement the above:

| Diagram | Location |
|---------|----------|
| System Overview (C4 Context) | [modeling/system-context/system-overview.mmd](modeling/system-context/system-overview.mmd) |
| Service Containers | [modeling/containers/service-containers.mmd](modeling/containers/service-containers.mmd) |
| Event Bus Architecture | [modeling/event-flows/event-bus-architecture.mmd](modeling/event-flows/event-bus-architecture.mmd) |
| Saga Orchestration Overview | [modeling/event-flows/saga-orchestration-overview.mmd](modeling/event-flows/saga-orchestration-overview.mmd) |
| Database Architecture | [modeling/infrastructure/database-architecture.mmd](modeling/infrastructure/database-architecture.mmd) |
| Order Fulfillment Flow | [modeling/cross-service/order-fulfillment-flow.mmd](modeling/cross-service/order-fulfillment-flow.mmd) |
| Payment Processing Flow | [modeling/cross-service/payment-processing-flow.mmd](modeling/cross-service/payment-processing-flow.mmd) |
| Business Registration Flow | [modeling/cross-service/business-registration-flow.mmd](modeling/cross-service/business-registration-flow.mmd) |
| Product Publishing Flow | [modeling/cross-service/product-publishing-flow.mmd](modeling/cross-service/product-publishing-flow.mmd) |

---

## Quick Reference: Diagram Types Used

| Type | Used For |
|------|----------|
| `flowchart TD/LR` | User flows, process flows, decision trees |
| `sequenceDiagram` | Service-to-service interactions, API calls |
| `stateDiagram-v2` | Order lifecycle, COD escrow state machine |
| `erDiagram` | Database entity relationships |
| `graph TB/LR` | Architecture overviews, dependency maps |
| `pie` | Revenue breakdown |

---

*Generated from live system analysis — schema, API contracts, flow docs, and architecture constitution.*
*Last updated: May 2026*
