# Wallet Service - Service Overview

## Purpose
Owns customer and merchant wallet lifecycle, COD commitment ledger, and settlement operations. Unique to Tanzania market: COD pre-authorization via wallet lock before delivery.

## Key Domain Concepts

### Wallet Aggregate
- `Wallet_Wallet` table with `version` column (optimistic locking - Phase 4)
- Balance tracking: available balance, locked balance, total balance
- Multi-currency support (TZS primary, USD secondary)

### COD Commitment Ledger
- Pre-authorization mechanism: locks customer funds before COD delivery
- Unlocks on delivery confirmation or order cancellation
- Reduces COD fraud risk from 40% to 20% (Tanzania market data)

### Transaction Types
- **Debit**: Purchase, COD lock, withdrawal
- **Credit**: Refund, COD unlock, seller payout, referral bonus
- **Transfer**: Peer-to-peer, settlement between wallets

## Primary Dependencies
- **payment-service**: COD lock requests during payment processing
- **order-service**: Settlement triggers on order completion
- **logistics-service**: COD unlock on delivery confirmation

## Entry Point
`services/wallet-service/src/index.ts`

## Database Schema
- `Wallet_Wallet`: Core wallet aggregate with version field
- `Wallet_Transaction`: Immutable transaction log
- `Wallet_CODCommitment`: Active COD locks with TTL
- `Wallet_OutboxEvent`: Event durability (Phase 1)
- `Wallet_EventIdempotency`: Duplicate event prevention (Phase 2)

## Configuration
- Event Bus: InMemoryEventBus with retry/backoff
- Outbox: Transactional outbox per service
- Redis: Redlock on wallet operations (Phase 4)
- PostgreSQL: Primary data store with optimistic locking

## Concurrency Control
- **Redlock**: Wraps all debit/credit critical sections (Phase 4)
- **Optimistic Locking**: `version` field prevents double-spend
- **Lock Timeout**: 5s with automatic retry
