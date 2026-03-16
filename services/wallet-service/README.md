# Wallet Service

[![Node.js](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-blue)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15+-blue)](https://www.postgresql.org/)
[![Redis](https://img.shields.io/badge/Redis-7+-red)](https://redis.io/)
[![Docker](https://img.shields.io/badge/Docker-Ready-blue)](https://docker.com/)

> Customer and merchant wallet lifecycle, COD commitment ledger, and settlement operations. Unique COD pre-authorization mechanism for the Tanzania market.

## Purpose

The Wallet Service is the financial backbone of the platform. It maintains wallet balances for customers and merchants, provides an immutable transaction ledger, and implements the COD commitment ledger — a pre-authorization mechanism that locks customer funds before COD delivery, reducing fraud risk from ~40% to ~20% in the Tanzania market. All debit/credit operations are protected by Redlock and optimistic locking to prevent double-spend.

## Architecture

Follows Clean Architecture with strict layer separation:

```
src/
├── domain/           # Wallet aggregate (with version), COD commitment policies, transaction types
├── application/      # Use cases: CreditWallet, DebitWallet, LockCOD, UnlockCOD, Settle
├── infrastructure/   # Prisma repositories, Redis Redlock, outbox publisher
└── api/              # Express routes and controllers
```

## Key Domain Concepts

### Wallet Balance Types

- **Available balance**: Funds free for use
- **Locked balance**: Funds held for active COD commitments
- **Total balance**: Available + locked

### COD Commitment Lifecycle

```
LockFunds (pre-auth) → DeliveryConfirmed → DebitLocked (settle)
                     → OrderCancelled   → UnlockFunds (release)
```

### Transaction Types

| Type | Description |
|------|-------------|
| Debit | Purchase, COD lock, withdrawal |
| Credit | Refund, COD unlock, seller payout, referral bonus |
| Transfer | Peer-to-peer, settlement between wallets |

### Concurrency Control

- **Redlock**: Wraps all debit/credit critical sections, 5s lock TTL with automatic retry
- **Optimistic Locking**: `version` field on `Wallet_Wallet` prevents double-spend

## Dependencies

| Service | Reason |
|---------|--------|
| payment-service | COD lock requests during payment processing |
| order-service | Settlement triggers on order completion |
| logistics-service | COD unlock on delivery confirmation |

## API Endpoints

```
GET    /api/wallets/:userId               # Get wallet balance
POST   /api/wallets/credit                # Credit wallet
POST   /api/wallets/debit                 # Debit wallet
POST   /api/wallets/cod/lock              # Lock funds for COD pre-authorization
POST   /api/wallets/cod/unlock/:id        # Unlock COD commitment
GET    /api/wallets/:userId/transactions  # Get transaction history
GET    /api/wallets/cod/:id               # Get COD commitment details
GET    /health                            # Health check
```

## Database Schema

| Model | Description |
|-------|-------------|
| `Wallet_Wallet` | Core wallet aggregate with `version` for optimistic locking |
| `Wallet_Transaction` | Immutable transaction log |
| `Wallet_CODCommitment` | Active COD locks with TTL |
| `Wallet_OutboxEvent` | Event durability via transactional outbox |
| `Wallet_EventIdempotency` | Duplicate event prevention |

## Events

See [docs/events.md](docs/events.md) for published and consumed events.

## Sagas

See [docs/sagas.md](docs/sagas.md) for active saga definitions.

## Testing

```bash
npm run test:wallet-service
npm run test:wallet-service:unit
npm run test:wallet-service:integration
npm run test:wallet-service:coverage
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
