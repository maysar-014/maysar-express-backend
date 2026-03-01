# Order Service - Service Overview

## Purpose
Transaction orchestration hub that owns the `Order_Order` aggregate and coordinates the complete fulfillment lifecycle across payment, inventory, logistics, and wallet services.

## Key Domain Concepts

### Order States
- PENDING → CONFIRMED → PROCESSING → SHIPPED → DELIVERED → COMPLETED
- Failure paths: CANCELLED, PAYMENT_FAILED, DELIVERY_FAILED

### COD Reputation Scoring
- Tracks customer COD completion history
- Influences wallet pre-authorization requirements
- Reduces fraud-driven revenue leakage

### Inventory Reservation Lifecycle
- 15-minute TTL on stock reservations
- Automatic cleanup via scheduled job
- Prevents phantom stock degradation

## Primary Dependencies
- **payment-service**: Payment capture and refund orchestration
- **inventory-service**: Stock reservation and commitment
- **logistics-service**: Delivery assignment and COD collection
- **wallet-service**: COD pre-authorization and settlement

## Entry Point
`services/order-service/src/main.ts`

## Database Schema
- `Order_Order`: Core order aggregate with COD fields
- `Order_OutboxEvent`: Event durability (Phase 1)
- `Order_SagaLog`: Saga state persistence (Phase 2)
- `Order_EventIdempotency`: Duplicate event prevention (Phase 2)

## Configuration
- Event Bus: InMemoryEventBus with retry/backoff
- Outbox: Transactional outbox per service
- Redis: Distributed locks for saga recovery worker
- PostgreSQL: Primary data store with read replica support
