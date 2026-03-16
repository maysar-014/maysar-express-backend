# Payout Service

[![Node.js](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-blue)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15+-blue)](https://www.postgresql.org/)
[![Redis](https://img.shields.io/badge/Redis-7+-red)](https://redis.io/)
[![Docker](https://img.shields.io/badge/Docker-Ready-blue)](https://docker.com/)

> Manages seller and enabler payouts to bank accounts and mobile money with scheduling, batching, and reconciliation.

## Purpose

The Payout Service handles the disbursement of earned funds to sellers and enablers. It supports bank transfers and mobile money (M-Pesa, Airtel Money), implements daily/weekly/on-demand payout schedules, batches payouts for efficiency, and reconciles wallet debits against bank credits. Failed payouts are retried with exponential backoff.

## Architecture

Follows Clean Architecture with strict layer separation:

```
src/
├── domain/           # Payout aggregate, scheduling policies, reconciliation logic
├── application/      # Use cases: SchedulePayout, ProcessPayout, ReconcilePayout
├── infrastructure/   # Bank transfer adapter, mobile money adapter, Prisma repositories
└── api/              # Express routes and controllers
```

## Key Domain Concepts

### Payout Methods

| Method | Provider |
|--------|---------|
| Bank transfer | Direct bank integration |
| Mobile money | M-Pesa, Airtel Money |
| Wallet balance | Internal wallet-service credit |

### Payout Schedules

- **Daily**: High-volume sellers (configurable threshold)
- **Weekly**: Standard sellers
- **On-demand**: Available with processing fee

### Reconciliation

Matches wallet debits to bank/mobile money credits. Handles failed payouts with retry logic and flags unresolved discrepancies for manual review.

## Dependencies

| Service | Reason |
|---------|--------|
| wallet-service | Source of payout funds (wallet debit) |
| Bank integration | Bank transfer execution |
| Mobile money provider | M-Pesa/Airtel Money execution |

## API Endpoints

```
POST   /api/payouts/request               # Request a payout
GET    /api/payouts/:id                   # Get payout status
GET    /api/payouts/seller/:sellerId      # List seller payouts
POST   /api/payouts/bank-accounts         # Register bank account
GET    /api/payouts/bank-accounts/:id     # Get bank account details
GET    /api/payouts/reconciliation/:id    # Get reconciliation record
GET    /health                            # Health check
```

## Database Schema

| Model | Description |
|-------|-------------|
| `Payout_Payout` | Payout records with status and method |
| `Payout_BankAccount` | Seller bank details (PII-encrypted) |
| `Payout_ReconciliationLog` | Reconciliation tracking per payout batch |

## Events

See [docs/events.md](docs/events.md) for published and consumed events.

## Sagas

See [docs/sagas.md](docs/sagas.md) for active saga definitions.

## Testing

```bash
npm run test:payout-service
npm run test:payout-service:unit
npm run test:payout-service:integration
npm run test:payout-service:coverage
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
