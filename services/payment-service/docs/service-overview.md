# Payment Service - Service Overview

## Purpose
Owns payment processing lifecycle, fraud assessment, and COD pre-authorization integration with wallet-service. Manages payment capture, refunds, and gateway orchestration.

## Key Domain Concepts

### Payment Aggregate
- `Payment_Payment` table with `version` column (optimistic locking - Phase 4)
- States: INITIATED → AUTHORIZED → CAPTURED → SETTLED
- Failure states: FAILED, VOIDED, REFUNDED

### Fraud Assessment
- `Payment_FraudAssessment` table stores risk scores
- Threshold-based blocking (configurable per merchant)
- Integration with external fraud detection APIs

### COD Pre-Authorization
- Coordinates with wallet-service to lock customer funds before delivery
- Unique to Tanzania market: reduces COD fraud risk
- Unlocks funds on delivery confirmation or order cancellation

## Primary Dependencies
- **wallet-service**: COD wallet lock/unlock operations
- **order-service**: Payment status updates trigger order state transitions
- **External payment gateways**: Stripe, M-Pesa, Airtel Money

## Entry Point
`services/payment-service/src/index.ts`

## Database Schema
- `Payment_Payment`: Core payment aggregate with version field
- `Payment_FraudAssessment`: Risk scoring and fraud flags
- `Payment_OutboxEvent`: Event durability (Phase 1)
- `Payment_EventIdempotency`: Duplicate event prevention (Phase 2)

## Configuration
- Event Bus: InMemoryEventBus with retry/backoff
- Outbox: Transactional outbox per service
- Redis: Circuit breaker state for gateway calls (Phase 7)
- PostgreSQL: Primary data store with optimistic locking
