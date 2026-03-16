# Production Service

[![Node.js](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-blue)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15+-blue)](https://www.postgresql.org/)
[![Redis](https://img.shields.io/badge/Redis-7+-red)](https://redis.io/)
[![Docker](https://img.shields.io/badge/Docker-Ready-blue)](https://docker.com/)

> Supplier production planning, capacity management, quality control, and inventory synchronization.

## Purpose

The Production Service manages the supplier side of the supply chain. It handles production planning (scheduling, resource allocation), capacity management, quality control checkpoints, and synchronizes completed production with inventory-service. Complex workflows are orchestrated via sagas: `ProductionPlanSaga`, `QualityControlSaga`, and `CapacityAdjustmentSaga`.

## Architecture

Follows Clean Architecture with strict layer separation:

```
src/
├── domain/           # ProductionPlan, ProductionOrder, QualityCheckpoint entities
│                     # Engines: PlanningEngine, QualityEngine, CapacityEngine
│                     # Algorithms: SchedulingAlgorithm, LeadTimeAlgorithm
├── application/      # Use cases: CreateProductionPlan, RecordQualityCheckpoint
│                     # Sagas: ProductionPlanSaga, QualityControlSaga, CapacityAdjustmentSaga
├── infrastructure/   # Prisma repositories, inventory adapter, event bus adapter
└── api/              # Express routes and controllers (Zod validation)
```

## Key Domain Concepts

### Production Plan Lifecycle

`DRAFT` → `APPROVED` → `IN_PROGRESS` → `COMPLETED` / `CANCELLED`

### Quality Control

Quality checkpoints are recorded during production. The `QualityControlEngine` evaluates compliance against standards. Non-compliant batches trigger rework workflows.

### Key Sagas

| Saga | Description |
|------|-------------|
| `ProductionPlanSaga` | Resource allocation → scheduling → order creation → event publishing |
| `QualityControlSaga` | Checkpoint recording → compliance evaluation → rework if needed |
| `CapacityAdjustmentSaga` | Dynamic capacity reallocation based on demand signals |

## Dependencies

| Service | Reason |
|---------|--------|
| inventory-service | Synchronizes completed production as available stock |
| order-service | Production demand signals from order volume |

## API Endpoints

```
POST   /api/production/plans              # Create production plan
GET    /api/production/plans/:id          # Get plan details
PUT    /api/production/plans/:id/approve  # Approve production plan
POST   /api/production/orders             # Create production order
PUT    /api/production/orders/:id/status  # Update production order status
POST   /api/production/quality            # Record quality checkpoint
GET    /api/production/quality/:id        # Get quality checkpoint
GET    /health                            # Health check
```

## Events

See [docs/events.md](docs/events.md) for published and consumed events.

## Testing

```bash
npm run test:production-service
npm run test:production-service:unit
npm run test:production-service:integration
npm run test:production-service:coverage
```

## Documentation

| File | Description |
|------|-------------|
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Detailed architecture and key flows |
| [docs/API.md](docs/API.md) | API reference |
| [docs/modeling/](docs/modeling/) | Sequence diagrams, state machines, use cases |
