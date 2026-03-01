# Logistics Service - Service Overview

## Purpose
Owns delivery lifecycle, courier assignment, and COD delivery verification. Coordinates last-mile fulfillment and triggers settlement on successful delivery.

## Key Domain Concepts

### Delivery Lifecycle
- **States**: PENDING → ASSIGNED → IN_TRANSIT → DELIVERED → COMPLETED
- **Failure States**: FAILED, RETURNED, CANCELLED

### Courier Assignment
- **Algorithm**: Zone-based matching, courier availability, reputation score
- **Fallback**: Manual assignment queue if no courier available

### COD Delivery Verification
- **Mechanism**: Courier confirms cash collection via mobile app
- **Trigger**: Emits `CODCollected` event → wallet-service settlement
- **Fraud Prevention**: GPS verification, photo proof (deferred - Phase 13)

## Primary Dependencies
- **order-service**: Delivery requests on order confirmation
- **wallet-service**: COD settlement on delivery completion
- **courier-service**: Courier availability and assignment

## Entry Point
`services/logistics-service/src/main.ts`

## Database Schema
- `Logistics_Delivery`: Core delivery aggregate
- `Logistics_CourierAssignment`: Courier-delivery mapping
- `Logistics_DeliveryRoute`: Route optimization data (deferred)
- `Logistics_OutboxEvent`: Event durability (Phase 1)
- `Logistics_EventIdempotency`: Duplicate event prevention (Phase 2)

## Configuration
- Event Bus: InMemoryEventBus with retry/backoff
- Outbox: Transactional outbox per service
- Redis: Courier availability cache
- PostgreSQL: Primary data store
