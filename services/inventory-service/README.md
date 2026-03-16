# Inventory Service

[![Node.js](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-blue)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15+-blue)](https://www.postgresql.org/)
[![Redis](https://img.shields.io/badge/Redis-7+-red)](https://redis.io/)
[![Docker](https://img.shields.io/badge/Docker-Ready-blue)](https://docker.com/)

> Owns the stock reservation lifecycle — available → reserved → committed/released — with Redlock-protected atomic operations to prevent overselling.

## Purpose

The Inventory Service is the single source of truth for stock availability. It prevents overselling through Redis Redlock-protected critical sections and TTL-based reservation expiry. Every reservation is atomic: the availability check and reservation creation happen inside a distributed lock keyed on `inventory:lock:{productVariantId}`.

## Architecture

Follows Clean Architecture with strict layer separation:

```
src/
├── domain/           # StockEngine (Redlock-protected), reservation policies, TTL logic
├── application/      # Use cases: ReserveStock, CommitReservation, ReleaseReservation
├── infrastructure/   # Prisma repositories, Redis Redlock, outbox publisher
└── api/              # Express routes and controllers
```

## Key Domain Concepts

### Stock Reservation Lifecycle

```
Available → Reserved (15 min TTL) → Committed (order complete)
                                  → Released (expired or cancelled)
```

- **Redlock**: Lock key `inventory:lock:{productVariantId}`, 5s TTL with 3s renewal
- **Cleanup Job**: Runs every 5 minutes to expire stale reservations
- **Idempotency**: `Inventory_EventIdempotency` table prevents duplicate event processing

## Dependencies

| Service | Reason |
|---------|--------|
| order-service | Reservation requests during order creation |
| catalog-service | Product variant metadata |
| Redis | Redlock coordination and reservation cache |

## API Endpoints

```
POST   /api/inventory/reserve             # Reserve stock for an order
POST   /api/inventory/commit/:id          # Commit reservation on order completion
POST   /api/inventory/release/:id         # Release reservation on cancellation
GET    /api/inventory/stock/:variantId    # Get current stock levels
PUT    /api/inventory/stock/:variantId    # Update stock quantity
GET    /health                            # Health check
```

## Database Schema

| Model | Description |
|-------|-------------|
| `Inventory_Stock` | Available stock per product variant |
| `Inventory_Reservation` | Active reservations with 15-minute TTL |
| `Inventory_OutboxEvent` | Event durability via transactional outbox |
| `Inventory_EventIdempotency` | Duplicate event prevention |

## Events

See [docs/events.md](docs/events.md) for published and consumed events.

## Sagas

See [docs/sagas.md](docs/sagas.md) for active saga definitions.

## Testing

```bash
npm run test:inventory-service
npm run test:inventory-service:unit
npm run test:inventory-service:integration
npm run test:inventory-service:coverage
```

## Documentation

| File | Description |
|------|-------------|
| [docs/service-overview.md](docs/service-overview.md) | Purpose, domain concepts, dependencies |
| [docs/events.md](docs/events.md) | Published and consumed events |
| [docs/sagas.md](docs/sagas.md) | Saga definitions |
| [docs/failure-matrix.md](docs/failure-matrix.md) | Failure modes and compensations |
| [docs/scaling-strategy.md](docs/scaling-strategy.md) | Scaling approach |
| [docs/revenue-impact.md](docs/revenue-impact.md) | Business value |
| [docs/modeling/](docs/modeling/) | Sequence diagrams, state machines, use cases |
