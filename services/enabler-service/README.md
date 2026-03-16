# Enabler Service

[![Node.js](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-blue)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15+-blue)](https://www.postgresql.org/)
[![Redis](https://img.shields.io/badge/Redis-7+-red)](https://redis.io/)
[![Docker](https://img.shields.io/badge/Docker-Ready-blue)](https://docker.com/)

> Third-party sales facilitation network — enabler onboarding, tier management, task assignment, and commission settlement.

## Purpose

The Enabler Service manages Maysar's decentralized sales network. Enablers are third-party individuals or businesses who facilitate sales for existing sellers — handling product photography, listing optimization, inventory management, and customer service. The service manages their onboarding, tier progression (Bronze → Silver → Gold → Platinum), task lifecycle, and commission settlement.

## Architecture

Follows Clean Architecture with strict layer separation:

```
src/
├── domain/           # Enabler entity, tier policies, task lifecycle, commission rules
├── application/      # Use cases: OnboardEnabler, AssignTask, CompleteTask, PromoteTier
├── infrastructure/   # Prisma repositories, event bus adapter
└── api/              # Express routes and controllers
```

## Key Domain Concepts

### Enabler Roles

- Product photography
- Listing optimization
- Inventory management
- Customer service support

### Task Lifecycle

`POSTED` → `ASSIGNED` → `IN_PROGRESS` → `COMPLETED` → `PAID`

### Tier System

| Tier | Criteria |
|------|---------|
| Bronze | New enabler |
| Silver | Performance threshold met |
| Gold | High volume + rating |
| Platinum | Top performer |

### Commission Structure

- Assignment: 15% of task value
- Completion: 20% of task value

## Dependencies

| Service | Reason |
|---------|--------|
| order-service | Task creation from seller requests |
| commission-service | Commission calculation on task completion |
| wallet-service | Enabler commission payouts |
| training-service | Enabler onboarding and certification |

## API Endpoints

See [openapi.yaml](openapi.yaml) for the full API specification.

```
POST   /api/enablers                      # Register enabler
GET    /api/enablers/:id                  # Get enabler profile
PUT    /api/enablers/:id/tier             # Update enabler tier
POST   /api/enablers/tasks                # Post a task
PUT    /api/enablers/tasks/:id/assign     # Assign task to enabler
PUT    /api/enablers/tasks/:id/complete   # Mark task complete
GET    /api/enablers/:id/tasks            # List enabler tasks
GET    /health                            # Health check
```

## Database Schema

| Model | Description |
|-------|-------------|
| `Enabler_Enabler` | Enabler profiles with tier and status |
| `Enabler_Task` | Task assignments with lifecycle state |
| `Enabler_Collaboration` | Seller-enabler partnership records |

## Events

See [docs/events.md](docs/events.md) for published and consumed events.

## Sagas

See [docs/sagas.md](docs/sagas.md) for active saga definitions.

## Testing

```bash
npm run test:enabler-service
npm run test:enabler-service:unit
npm run test:enabler-service:integration
npm run test:enabler-service:coverage
```

## Documentation

| File | Description |
|------|-------------|
| [openapi.yaml](openapi.yaml) | OpenAPI 3.0 API specification |
| [docs/service-overview.md](docs/service-overview.md) | Purpose, domain concepts, dependencies |
| [docs/events.md](docs/events.md) | Published and consumed events |
| [docs/sagas.md](docs/sagas.md) | Saga definitions |
| [docs/failure-matrix.md](docs/failure-matrix.md) | Failure modes and compensations |
| [docs/scaling-strategy.md](docs/scaling-strategy.md) | Scaling approach |
| [docs/revenue-impact.md](docs/revenue-impact.md) | Business value |
| [docs/modeling/](docs/modeling/) | Sequence diagrams, state machines, use cases |
