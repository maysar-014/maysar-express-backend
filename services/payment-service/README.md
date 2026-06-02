# Payment Service

[![Node.js](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-blue)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15+-blue)](https://www.postgresql.org/)
[![Redis](https://img.shields.io/badge/Redis-7+-red)](https://redis.io/)
[![Docker](https://img.shields.io/badge/Docker-Ready-blue)](https://docker.com/)

> Payment processing lifecycle, fraud assessment, and COD pre-authorization via wallet-service. Gateway: PaymentGateway.

## Purpose

The Payment Service owns the full payment lifecycle from initiation to settlement. It integrates with PaymentGateway as the primary payment gateway, performs fraud risk scoring before capture, and implements a COD pre-authorization mechanism unique to the Tanzania market — locking customer wallet funds before delivery to reduce COD fraud risk. Optimistic locking on the `Payment_Payment` aggregate prevents double-charge under concurrent requests.

## Architecture

Follows Clean Architecture with strict layer separation:

```
src/
├── domain/           # Payment aggregate (with version), fraud scoring, COD pre-auth policies
├── application/      # Use cases: InitiatePayment, CapturePayment, RefundPayment, AssessFraud
├── infrastructure/   # PaymentGateway gateway adapter, Prisma repositories, circuit breaker (Redis)
└── api/              # Express routes and controllers
```

## Key Domain Concepts

### Payment State Machine

```
INITIATED → AUTHORIZED → CAPTURED → SETTLED
         ↘ FAILED
         ↘ VOIDED
         ↘ REFUNDED
```

### Fraud Assessment

- `Payment_FraudAssessment` stores risk scores per payment
- Threshold-based blocking configurable per merchant
- Integration with external fraud detection APIs

### COD Pre-Authorization

- Coordinates with wallet-service to lock customer funds before COD delivery
- Reduces COD fraud risk from ~40% to ~20% (Tanzania market)
- Funds unlocked on delivery confirmation or order cancellation

### Concurrency Control

- `version` column on `Payment_Payment` for optimistic locking
- Redis circuit breaker state for gateway calls

## Dependencies

| Service | Reason |
|---------|--------|
| wallet-service | COD wallet lock/unlock operations |
| order-service | Payment status updates trigger order state transitions |
| PaymentGateway | External payment gateway |

## API Endpoints

```
POST   /api/payments/initiate             # Initiate payment for an order
POST   /api/payments/:id/capture          # Capture authorized payment
POST   /api/payments/:id/refund           # Refund a captured payment
POST   /api/payments/:id/void             # Void an authorized payment
GET    /api/payments/:id                  # Get payment details
GET    /api/payments/:id/fraud-assessment # Get fraud risk assessment
POST   /api/payments/cod/pre-auth         # COD pre-authorization (wallet lock)
POST   /api/payments/cod/release/:id      # Release COD pre-authorization
GET    /health                            # Health check
```

## Database Schema

| Model | Description |
|-------|-------------|
| `Payment_Payment` | Core payment aggregate with `version` for optimistic locking |
| `Payment_FraudAssessment` | Risk scores and fraud flags per payment |
| `Payment_OutboxEvent` | Event durability via transactional outbox |
| `Payment_EventIdempotency` | Duplicate event prevention |

## Events

See [docs/events.md](docs/events.md) for published and consumed events.

## Sagas

See [docs/sagas.md](docs/sagas.md) for active saga definitions.

## Testing

```bash
npm run test:payment-service
npm run test:payment-service:unit
npm run test:payment-service:integration
npm run test:payment-service:coverage
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
| [../../PAYMENT_METHODS.md](../../PAYMENT_METHODS.md) | Supported payment methods reference |
