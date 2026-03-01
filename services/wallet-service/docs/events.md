# Wallet Service - Events

## Events Emitted

### WalletDebited
- **Topic**: `wallet.debited`
- **Payload**: `{ walletId, transactionId, amount, currency, reason, balanceAfter }`
- **Consumers**: order-service, notification-service
- **Durability**: Persisted in `Wallet_OutboxEvent`

### WalletCredited
- **Topic**: `wallet.credited`
- **Payload**: `{ walletId, transactionId, amount, currency, reason, balanceAfter }`
- **Consumers**: order-service, notification-service

### CODCommitmentLocked
- **Topic**: `wallet.cod.locked`
- **Payload**: `{ walletId, orderId, lockedAmount, lockId, expiresAt }`
- **Consumers**: payment-service (proceed with capture), order-service

### CODCommitmentReleased
- **Topic**: `wallet.cod.released`
- **Payload**: `{ walletId, orderId, lockId, releasedAmount, reason }`
- **Consumers**: order-service, notification-service

### WalletTransactionFailed
- **Topic**: `wallet.transaction.failed`
- **Payload**: `{ walletId, transactionId, failureReason, attemptedAmount }`
- **Consumers**: order-service (trigger compensation), saga recovery worker

### SettlementCompleted
- **Topic**: `wallet.settlement.completed`
- **Payload**: `{ orderId, sellerWalletId, enablerWalletId, platformAmount, commissionBreakdown }`
- **Consumers**: order-service, commission-service, analytics-service

## Events Consumed

### OrderCompleted
- **Topic**: `order.completed`
- **Source**: order-service
- **Handler**: Triggers `CODSettlementSaga`
- **Idempotency**: `EventIdempotency.withIdempotency` (Phase 2)

### DeliveryCompleted
- **Topic**: `delivery.completed`
- **Source**: logistics-service
- **Handler**: Releases COD commitment lock, triggers settlement

### OrderCancelled
- **Topic**: `order.cancelled`
- **Source**: order-service
- **Handler**: Releases COD commitment lock, processes refund if applicable

### PaymentCaptured
- **Topic**: `payment.captured`
- **Source**: payment-service
- **Handler**: Records payment source for settlement

### RefundCompleted
- **Topic**: `refund.completed`
- **Source**: payment-service
- **Handler**: Credits customer wallet (COD orders)

## Retry Policy
- Exponential backoff: 1s, 2s, 4s, 8s, 16s (Phase 3)
- Dead-letter threshold: 5 retries
- Dead-letter topic: `wallet.dlq`

## Idempotency Strategy
- Debit/credit keyed by `wallet-{walletId}-{transactionId}`
- COD lock keyed by `cod-lock-{orderId}`
- Duplicate requests return existing transaction (HTTP 200)

## Concurrency Guarantees
- **Redlock**: Ensures single-writer per wallet (Phase 4)
- **Optimistic Locking**: `version` field prevents race conditions
- **Lock Acquisition Timeout**: 5s with retry
