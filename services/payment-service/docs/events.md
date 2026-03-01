# Payment Service - Events

## Events Emitted

### PaymentInitiated
- **Topic**: `payment.initiated`
- **Payload**: `{ paymentId, orderId, amount, currency, method, customerId }`
- **Consumers**: order-service, fraud-detection-service
- **Durability**: Persisted in `Payment_OutboxEvent`

### PaymentCaptured
- **Topic**: `payment.captured`
- **Payload**: `{ paymentId, orderId, capturedAmount, gatewayTransactionId, capturedAt }`
- **Consumers**: order-service (advance to PROCESSING), wallet-service (settlement)

### PaymentFailed
- **Topic**: `payment.failed`
- **Payload**: `{ paymentId, orderId, failureReason, gatewayErrorCode, retryable }`
- **Consumers**: order-service (trigger compensation), notification-service

### RefundRequested
- **Topic**: `refund.requested`
- **Payload**: `{ paymentId, orderId, refundAmount, reason, requestedBy }`
- **Consumers**: payment-gateway-adapter, order-service

### RefundCompleted
- **Topic**: `refund.completed`
- **Payload**: `{ paymentId, orderId, refundedAmount, gatewayRefundId, completedAt }`
- **Consumers**: order-service, wallet-service, notification-service

### FraudAssessmentCompleted
- **Topic**: `fraud.assessment.completed`
- **Payload**: `{ paymentId, riskScore, decision, factors[] }`
- **Consumers**: payment-service (internal), order-service (high-risk orders)

## Events Consumed

### OrderCreated
- **Topic**: `order.created`
- **Source**: order-service
- **Handler**: Initiates payment processing saga
- **Idempotency**: `EventIdempotency.withIdempotency` (Phase 2)

### OrderCancelled
- **Topic**: `order.cancelled`
- **Source**: order-service
- **Handler**: Triggers refund if payment captured

### CODCommitmentLocked
- **Topic**: `wallet.cod.locked`
- **Source**: wallet-service
- **Handler**: Proceeds with payment capture for COD orders

### CODCommitmentFailed
- **Topic**: `wallet.cod.lock.failed`
- **Source**: wallet-service
- **Handler**: Fails payment, triggers order cancellation

## Retry Policy
- Exponential backoff: 1s, 2s, 4s, 8s, 16s (Phase 3)
- Dead-letter threshold: 3 retries for gateway calls, 5 for internal events
- Dead-letter topic: `payment.dlq`

## Idempotency Strategy
- Payment capture keyed by `order-{orderId}-payment`
- Refund keyed by `refund-{paymentId}-{timestamp}`
- Duplicate requests return existing payment record (HTTP 200)
