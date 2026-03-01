# Inventory Service - Service Overview

## Purpose
Owns stock reservation lifecycle: available → reserved → committed/released. Prevents overselling through Redlock-protected atomic operations and TTL-based reservation expiry.

## Key Domain Concepts

### Stock Reservation Lifecycle
- **Available**: Stock ready for reservation
- **Reserved**: Locked for 15 minutes pending order completion
- **Committed**: Permanently allocated to completed order
- **Released**: Reservation expired or order cancelled

### Reservation TTL
- **Duration**: 15 minutes from reservation creation
- **Cleanup Job**: Runs every 5 minutes to expire stale reservations
- **Purpose**: Prevents phantom stock that degrades trust

### Redlock Protection
- **Critical Section**: Stock availability check + reservation creation
- **Lock Key**: `inventory:lock:{productVariantId}`
- **TTL**: 5s with 3s renewal
- **Purpose**: Prevents double-booking under concurrent load

## Primary Dependencies
- **order-service**: Reservation requests during order creation
- **catalog-service**: Product variant metadata
- **Redis**: Redlock coordination and reservation cache

## Entry Point
`services/inventory-service/src/index.ts`

## Key Engine
`services/inventory-service/src/domain/engines/stock.engine.ts` (Redlock-protected - Phase 4)

## Database Schema
- `Inventory_Stock`: Available stock per product variant
- `Inventory_Reservation`: Active reservations with TTL
- `Inventory_OutboxEvent`: Event durability (Phase 1)
- `Inventory_EventIdempotency`: Duplicate event prevention (Phase 2)

## Configuration
- Event Bus: InMemoryEventBus with retry/backoff
- Outbox: Transactional outbox per service
- Redis: Redlock coordination and reservation cache
- PostgreSQL: Primary data store with B-Tree indexes
