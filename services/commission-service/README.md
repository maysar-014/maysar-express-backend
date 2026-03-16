# Commission Service

[![Node.js](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-blue)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15+-blue)](https://www.postgresql.org/)
[![Redis](https://img.shields.io/badge/Redis-7+-red)](https://redis.io/)
[![Docker](https://img.shields.io/badge/Docker-Ready-blue)](https://docker.com/)

> Calculates and tracks commission distribution for sellers, enablers, and customers including quality bonus structures.

## Purpose

The Commission Service owns the financial incentive layer of the platform. It computes commissions for every completed order across three actor types — sellers, enablers, and customers — and applies a quality bonus structure that rewards high-performing participants. Calculated commissions are forwarded to wallet-service for payout.

## Architecture

Follows Clean Architecture with strict layer separation:

```
src/
├── domain/           # Commission calculation engines, quality bonus policies
├── application/      # Use cases: CalculateCommission, ApplyQualityBonus, GetCommissionSummary
├── infrastructure/   # Prisma repositories, event consumers
└── api/              # Express routes and controllers
```

## Key Domain Concepts

### Commission Rates

| Actor | Base Rate | Max with Bonus |
|-------|-----------|----------------|
| Seller | 8% | 26% |
| Enabler (assignment) | 15% | — |
| Enabler (completion) | 20% | — |
| Customer referral | 3% | — |
| Customer loyalty | 1% | — |

### Quality Bonus Structure

| Condition | Bonus |
|-----------|-------|
| Rating ≥ 4.8 | +5% |
| Perfect rating | +10% |
| On-time delivery | +5% |
| Customer satisfaction | +3% |

## Dependencies

| Service | Reason |
|---------|--------|
| order-service | Order completion events trigger commission calculation |
| wallet-service | Commission amounts credited to participant wallets |
| analytics-service | Performance metrics feed quality bonus computation |

## API Endpoints

```
GET    /api/commissions/:id               # Get commission record
GET    /api/commissions/seller/:sellerId  # List seller commissions
GET    /api/commissions/enabler/:enablerId # List enabler commissions
GET    /api/commissions/summary/:actorId  # Commission summary with quality metrics
GET    /health                            # Health check
```

## Database Schema

| Model | Description |
|-------|-------------|
| `Commission_Commission` | Commission records per order per actor |
| `Commission_QualityMetrics` | Seller/enabler performance scores |

## Events

See [docs/events.md](docs/events.md) for published and consumed events.

## Sagas

See [docs/sagas.md](docs/sagas.md) for active saga definitions.

## Testing

```bash
npm run test:commission-service
npm run test:commission-service:unit
npm run test:commission-service:integration
npm run test:commission-service:coverage
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
