# Payout Service - Events

## Events Emitted

### PayoutInitiated
- **Topic**: `payout.initiated`
- **Payload**: `{ payoutId, recipientId, amount, method }`
- **Consumers**: wallet-service, notification-service

### PayoutCompleted
- **Topic**: `payout.completed`
- **Payload**: `{ payoutId, completedAt, transactionId }`
- **Consumers**: wallet-service, analytics-service

### PayoutFailed
- **Topic**: `payout.failed`
- **Payload**: `{ payoutId, failureReason, retryable }`
- **Consumers**: support-service, notification-service

## Events Consumed

### SettlementCompleted
- **Topic**: `wallet.settlement.completed`
- **Source**: wallet-service
- **Handler**: Schedules payout for seller
