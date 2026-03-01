# Order Service - Events

## Events Emitted

### OrderCreated
- **Event**: `OrderCreated`
- **Payload**: `{ orderId, customerId, items[], totalAmount, paymentMethod, codEnabled }`
- **Consumers**: payment-service, inventory-service, logistics-service
- **Durability**: Persisted in `Order_OutboxEvent`, dispatched via InMemoryEventBus

### OrderConfirmed
- **Event**: `OrderConfirmed`
- **Payload**: `{ orderId, confirmedAt, reservationIds[] }`
- **Consumers**: inventory-service (commit stock), logistics-service (assign courier)

### OrderCompleted
- **Event**: `OrderCompleted`
- **Payload**: `{ orderId, completedAt, finalAmount, commissionBreakdown }`
- **Consumers**: wallet-service (settlement), commission-service

### OrderCancelled
- **Event**: `OrderCancelled`
- **Payload**: `{ orderId, cancelledAt, reason, refundRequired }`
- **Consumers**: payment-service (refund), inventory-service (release stock)

### OrderPaymentFailed
- **Event**: `OrderPaymentFailed`
- **Payload**: `{ orderId, failureReason, retryable }`
- **Consumers**: notification-service, saga recovery worker

## Events Consumed

### PaymentCaptured
- **Event**: `PaymentCaptured`
- **Source**: payment-service
- **Handler**: Advances order to PROCESSING state
- **Idempotency**: `EventIdempotency.withIdempotency` (Phase 2)

### StockReserved
- **Event**: `StockReserved`
- **Source**: inventory-service
- **Handler**: Records reservation IDs, triggers payment capture

### DeliveryCompleted
- **Event**: `DeliveryCompleted`
- **Source**: logistics-service
- **Handler**: Advances order to COMPLETED, triggers settlement saga

### CODCollected
- **Event**: `CODCollected`
- **Source**: logistics-service
- **Handler**: Triggers wallet settlement, updates COD reputation score

## Event Schema Registry
Deferred to Phase 13 (Avro schema evolution)

## Retry Policy
- Exponential backoff: 1s, 2s, 4s, 8s, 16s (Phase 3)
- Dead-letter threshold: 5 retries
- Dead-letter handling: `OutboxProcessor.markAsDeadLetter`
