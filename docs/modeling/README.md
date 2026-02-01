# Maysar Platform - System-Level Architecture Diagrams

> **Purpose**: Comprehensive system-level diagrams showing how all 13 microservices interact through events, sagas, and synchronous calls.
> 
> **Compliance**: Follows the [Software Modeling Constitution](../../software-modeling-constitution.md)

---

## 📋 Table of Contents

- [Overview](#overview)
- [Diagram Index](#diagram-index)
- [System Context](#system-context)
- [Container Architecture](#container-architecture)
- [Event-Driven Architecture](#event-driven-architecture)
- [Cross-Service Workflows](#cross-service-workflows)
- [Infrastructure Architecture](#infrastructure-architecture)
- [Diagram Conventions](#diagram-conventions)
- [Related Documentation](#related-documentation)

---

## Overview

This directory contains **system-level architecture diagrams** that provide a bird's-eye view of the entire Maysar platform. These diagrams complement the [service-level models](../../) by showing:

- **Service Boundaries**: How 13 microservices are organized and isolated
- **Event-Driven Communication**: Kafka-based event bus and saga orchestration
- **Cross-Service Workflows**: End-to-end business processes spanning multiple services
- **Infrastructure**: Kubernetes deployment, databases, messaging, and caching

All diagrams use **Mermaid** format for version control and are stored as `.mmd` files.

---

## Diagram Index

### System Context & Containers

| Diagram | Description | File |
|---------|-------------|------|
| **System Overview** | C4 Level 1 - External actors, platform, and external systems | [system-overview.mmd](./system-context/system-overview.mmd) |
| **Service Containers** | C4 Level 2 - All 13 microservices and infrastructure components | [service-containers.mmd](./containers/service-containers.mmd) |

### Event-Driven Architecture

| Diagram | Description | File |
|---------|-------------|------|
| **Event Bus Architecture** | Outbox pattern, Kafka infrastructure, and event routing | [event-bus-architecture.mmd](./event-flows/event-bus-architecture.mmd) |
| **Saga Orchestration** | Saga lifecycle, event correlation, and compensation | [saga-orchestration-overview.mmd](./event-flows/saga-orchestration-overview.mmd) |
| **Event Catalog** | Major domain events and publisher/subscriber relationships | [event-catalog.mmd](./event-flows/event-catalog.mmd) |

### Cross-Service Workflows

| Diagram | Description | File |
|---------|-------------|------|
| **Order Fulfillment** | End-to-end order processing with compensation flows | [order-fulfillment-flow.mmd](./cross-service/order-fulfillment-flow.mmd) |
| **Business Registration** | Seller onboarding with KYC and compliance checks | [business-registration-flow.mmd](./cross-service/business-registration-flow.mmd) |
| **Product Publishing** | Product creation and publishing workflow | [product-publishing-flow.mmd](./cross-service/product-publishing-flow.mmd) |
| **Payment Processing** | Payment processing with fraud detection and refunds | [payment-processing-flow.mmd](./cross-service/payment-processing-flow.mmd) |

### Infrastructure Architecture

| Diagram | Description | File |
|---------|-------------|------|
| **Deployment Architecture** | Kubernetes cluster, namespaces, and AWS integration | [deployment-architecture.mmd](./infrastructure/deployment-architecture.mmd) |
| **Database Architecture** | 13 isolated databases, outbox pattern, and replication | [database-architecture.mmd](./infrastructure/database-architecture.mmd) |
| **Messaging Infrastructure** | Kafka cluster, topics, consumer groups, and schema registry | [messaging-infrastructure.mmd](./infrastructure/messaging-infrastructure.mmd) |
| **Caching Strategy** | Redis cluster, cache patterns, and performance metrics | [caching-strategy.mmd](./infrastructure/caching-strategy.mmd) |

---

## System Context

### [System Overview](./system-context/system-overview.mmd)

**C4 Level 1 Diagram** showing the Maysar platform from a 30,000-foot view:

- **External Actors**: Customers, Sellers, Suppliers, Enablers, Couriers, Admins
- **Maysar Platform**: Single system boundary containing all 13 microservices
- **External Systems**: Payment providers (Pesapal), Email (SendGrid), SMS (Twilio), Maps, Storage (S3)

**Key Insights**:
- 6 distinct user personas interact with the platform
- 6 external system integrations for payments, communications, and storage
- Clear separation between platform internals and external dependencies

---

## Container Architecture

### [Service Containers](./containers/service-containers.mmd)

**C4 Level 2 Diagram** showing internal architecture:

#### Service Organization

**Core E-Commerce Services** (5 services):
- Auth Service (Port 3001) - JWT & RBAC
- Order Service (Port 3002) - Order lifecycle
- Inventory Service (Port 3003) - Stock management
- Payment Service (Port 3004) - Payment processing
- Catalog Service (Port 3005) - Product catalog

**Business Support Services** (5 services):
- Business Registry (Port 3006) - Seller KYC
- Logistics Service (Port 3007) - Shipping & delivery
- Commission Service (Port 3008) - Revenue sharing
- Checkout Service (Port 3009) - Cart & pricing
- Notification Service (Port 3010) - Multi-channel comms

**Analytics & Compliance** (3 services):
- Analytics Service (Port 3011) - Business intelligence
- Compliance Service (Port 3013) - GDPR & regulations
- User Service (Port 3014) - User profiles

#### Infrastructure Components

- **API Gateway** (Port 8080) - Routing & authentication
- **Kafka** - Event bus for asynchronous communication
- **Redis** - Caching, sessions, idempotency
- **PostgreSQL** - 13 isolated databases (database per service)
- **Event Store** - Immutable event log

---

## Event-Driven Architecture

### [Event Bus Architecture](./event-flows/event-bus-architecture.mmd)

Shows the **Transactional Outbox Pattern** implementation:

1. **Publishers** write events to outbox table in same transaction as business data
2. **Outbox Processor** polls unpublished events and publishes to Kafka
3. **Schema Registry** validates event schemas before publishing
4. **Kafka Broker** routes events to appropriate topics
5. **Subscribers** consume events with idempotency checks (Redis)
6. **Dead Letter Queue** handles failed event processing
7. **Event Store** archives all events for audit trail

**Key Features**:
- At-least-once delivery guarantee
- Idempotent event processing
- Schema validation and versioning
- Failed event replay capability

### [Saga Orchestration](./event-flows/saga-orchestration-overview.mmd)

Shows the **Saga Pattern** for distributed transactions:

**Saga Lifecycle**:
1. Use case initiates saga via Saga Factory
2. Saga Manager registers saga and creates correlation
3. Saga Instance executes steps sequentially
4. Event Publisher sends commands to Kafka
5. Event Correlator matches responses to active sagas
6. Event Handlers process responses and update saga state
7. Compensation Executor handles failures with rollback

**Components**:
- Saga Manager - Lifecycle management
- Event Correlator - Response matching
- Compensation Executor - Rollback operations
- Saga Log - Audit trail and state persistence

### [Event Catalog](./event-flows/event-catalog.mmd)

Visual catalog of **major domain events** and their relationships:

**Event Categories**:
- **User Domain**: UserCreated, UserVerified
- **Business Registry**: BusinessRegistered, BusinessVerified, KYCCompleted
- **Catalog**: ProductCreated, ProductPublished, InventoryVerified
- **Order**: OrderCreated, OrderConfirmed, OrderCancelled, OrderCompleted
- **Inventory**: StockReserved, StockReleased, LowStockAlert
- **Payment**: PaymentCompleted, PaymentFailed, RefundProcessed
- **Logistics**: ShipmentCreated, DeliveryAssigned, DeliveryCompleted
- **Notification**: EmailSent, SMSSent, PushNotificationSent

---

## Cross-Service Workflows

### [Order Fulfillment Flow](./cross-service/order-fulfillment-flow.mmd)

**End-to-end order processing saga** involving 6 services:

**Happy Path**:
1. **Order Service** creates order (PENDING)
2. **Inventory Service** reserves stock
3. **Payment Service** processes payment with fraud check
4. **Order Service** confirms order
5. **Logistics Service** creates shipment and assigns courier
6. **Notification Service** sends confirmations to customer
7. **Analytics Service** tracks order metrics

**Compensation Flow** (Payment Failure):
1. Order Service triggers compensation
2. Inventory Service releases reserved stock
3. Notification Service sends cancellation email

### [Business Registration Flow](./cross-service/business-registration-flow.mmd)

**Seller onboarding saga** with compliance checks:

**Saga Steps**:
1. **Business Registry** creates business record (PENDING)
2. **User Service** creates seller account with SELLER role
3. **Compliance Service** initiates KYC verification
4. **Business Registry** updates status based on KYC result
5. **Notification Service** sends verification and welcome emails
6. **Analytics Service** tracks seller onboarding metrics

**Compensation** (KYC Rejection):
- Business status updated to REJECTED
- User account disabled
- Rejection email sent with reasons

### [Product Publishing Flow](./cross-service/product-publishing-flow.mmd)

**Product creation and publishing workflow**:

**Workflow**:
1. **Catalog Service** creates product (DRAFT) and processes media
2. **Inventory Service** verifies inventory setup
3. Seller publishes product
4. **Catalog Service** validates and updates status (PUBLISHED)
5. **Analytics Service** tracks product metrics
6. **Notification Service** sends confirmation to seller

**Product Updates**:
- Catalog Service publishes ProductUpdated event
- Inventory Service updates stock metadata
- Analytics Service tracks changes

### [Payment Processing Flow](./cross-service/payment-processing-flow.mmd)

**Payment processing with multiple payment methods**:

**Saga Steps**:
1. **Payment Service** creates payment record (PENDING)
2. **Fraud Detection** validates transaction
3. **Payment Processing** based on method:
   - **Card/Mobile Money**: Pesapal integration
   - **Wallet**: Balance check and deduction
   - **Cash on Delivery**: Schedule for later
4. **Notification Service** sends receipts or failure notifications
5. **Analytics Service** tracks payment metrics

**Refund Flow**:
- Order cancellation triggers refund
- Pesapal refund API called
- Refund confirmation sent to customer

---

## Infrastructure Architecture

### [Deployment Architecture](./infrastructure/deployment-architecture.mmd)

**Kubernetes cluster organization**:

**Namespaces**:
- `api` - API Gateway (3 replicas)
- `core` - Core services (Auth, Order, Payment, Inventory, Catalog)
- `business` - Business services (Registry, Logistics, Commission, Checkout)
- `support` - Support services (Notification, Analytics, Compliance, User)
- `data` - Data layer (Kafka, Redis, PostgreSQL Operator)
- `monitoring` - Observability (Prometheus, Grafana, Loki)

**AWS Integration**:
- RDS PostgreSQL (13 databases, Multi-AZ)
- MSK (Managed Kafka, 3 brokers)
- ElastiCache (Redis cluster)
- S3 (Media storage)
- CloudWatch (Logs & metrics)

### [Database Architecture](./infrastructure/database-architecture.mmd)

**Database per Service Pattern**:

- **13 Isolated Databases** - One per microservice
- **Outbox Tables** - Transactional outbox in each service database
- **Event Store** - Centralized immutable event log
- **Saga Log** - Saga state and compensation history
- **Read Replicas** - For analytics and reporting queries
- **Automated Backups** - Point-in-time recovery, daily snapshots

**Key Principles**:
- No cross-database joins
- Event-driven integration between services
- Strong isolation for independent scaling

### [Messaging Infrastructure](./infrastructure/messaging-infrastructure.mmd)

**Kafka cluster configuration**:

- **3 Kafka Brokers** - High availability
- **ZooKeeper Ensemble** - Cluster coordination
- **10+ Topics** - Domain-specific event topics
- **Partitioning** - 2-5 partitions per topic for parallelism
- **Replication Factor 3** - Data durability
- **Consumer Groups** - Parallel event processing
- **Schema Registry** - Avro/JSON schema validation
- **Kafka Connect** - Event store sink connector
- **Kafka Streams** - Real-time event aggregation

### [Caching Strategy](./infrastructure/caching-strategy.mmd)

**Redis cluster setup**:

- **3 Master Shards** - Distributed key space (16,384 slots)
- **3 Replicas** - High availability and failover
- **Async Replication** - Master to replica data sync

**Cache Use Cases**:
- **Session Cache** - JWT tokens, user sessions (TTL: 24h)
- **API Response Cache** - Product listings, catalog data (TTL: 5-15min)
- **Rate Limiting** - API throttling with sliding window
- **Idempotency Keys** - Event deduplication (TTL: 24h)

**Performance Metrics**:
- Cache Hit Rate: **78%** (Target: 75%+)
- Response Latency: P95 <5ms, P99 <10ms
- Bandwidth Savings: **2.8 GB/day** ($12.5K/month saved)

---

## Diagram Conventions

### Color Coding

- **Red/Orange** - API Gateway, critical infrastructure
- **Black** - Kafka event bus
- **Purple** - Saga orchestration, compensation
- **Blue** - Data stores, databases
- **Green** - Success states, completed operations
- **Gray** - Replicas, secondary components

### Notation

- **Solid Lines** - Synchronous calls, direct dependencies
- **Dashed Lines** - Asynchronous events, eventual consistency
- **Arrows** - Data flow direction
- **Rectangles** - Services, components
- **Cylinders** - Databases, data stores
- **Rounded Boxes** - External systems

### Diagram Types

- **Graph TB/LR** - Top-to-bottom or left-to-right flow diagrams
- **sequenceDiagram** - Time-ordered interactions between services
- **stateDiagram** - State machines (see service-level models)

---

## Related Documentation

### Service-Level Models

Each microservice has its own modeling directory with detailed diagrams:

- [Auth Service Models](../../auth-service/docs/modeling/)
- [Order Service Models](../../order-service/docs/modeling/)
- [Catalog Service Models](../../catalog-service/docs/modeling/)
- [Payment Service Models](../../payment-service/docs/modeling/)
- [Inventory Service Models](../../inventory-service/docs/modeling/)
- [Business Registry Models](../../business-registry-service/docs/modeling/)
- [Logistics Service Models](../../logistics-service/docs/modeling/)
- [Notification Service Models](../../notification-service/docs/modeling/)
- [Analytics Service Models](../../analytics-service/docs/modeling/)
- [Checkout Service Models](../../checkout-service/docs/modeling/)
- [Commission Service Models](../../commission-service/docs/modeling/)
- [Compliance Service Models](../../compliance-service/docs/modeling/)
- [User Service Models](../../user-service/docs/modeling/)

### Architecture Documentation

- [Software Modeling Constitution](../../software-modeling-constitution.md)
- [Architecture Constitution](../../architecture_constitution.md)
- [Integration Constitution](../../integration-constitution.md)
- [Saga Orchestration System](../../SAGA_ORCHESTRATION_SYSTEM.md)
- [API Documentation](../../API_DOCUMENTATION.md)
- [README](../../README.md)

---

## Viewing Diagrams

### Online Viewers

1. **Mermaid Live Editor**: https://mermaid.live
   - Copy `.mmd` file contents
   - Paste into editor
   - View rendered diagram

2. **GitHub**: 
   - GitHub automatically renders `.mmd` files in markdown
   - View directly in repository

3. **VS Code Extensions**:
   - Mermaid Preview
   - Markdown Preview Mermaid Support

### Local Rendering

```bash
# Install Mermaid CLI
npm install -g @mermaid-js/mermaid-cli

# Render diagram to PNG
mmdc -i system-overview.mmd -o system-overview.png

# Render diagram to SVG
mmdc -i system-overview.mmd -o system-overview.svg
```

---

## Maintenance Guidelines

### When to Update Diagrams

System-level diagrams should be updated when:

1. **New Service Added** - Update container diagram and event catalog
2. **New Cross-Service Workflow** - Create new sequence diagram
3. **Infrastructure Changes** - Update deployment or database diagrams
4. **Event Schema Changes** - Update event catalog
5. **Saga Changes** - Update saga orchestration or cross-service flows

### Update Process

1. Update `.mmd` file in appropriate directory
2. Validate syntax using Mermaid Live Editor
3. Update this README if adding new diagrams
4. Commit changes with descriptive message
5. Reference in PR description

### Validation Checklist

- [ ] Diagram renders without syntax errors
- [ ] All service names match actual service names
- [ ] Event names match event registry schemas
- [ ] Colors and styling are consistent
- [ ] Arrows and flow direction are clear
- [ ] Labels and annotations are accurate

---

## Questions or Issues?

For questions about system architecture or diagrams:

1. Review [Software Modeling Constitution](../../software-modeling-constitution.md)
2. Check [Saga Orchestration System](../../SAGA_ORCHESTRATION_SYSTEM.md)
3. Consult service-level models for detailed flows
4. Reach out to architecture team

---

**Last Updated**: 2026-02-01  
**Maintained By**: Architecture Team  
**Version**: 1.0.0
