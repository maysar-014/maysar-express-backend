# Logistics Service - Events

## Events Emitted

### CourierAssigned
- **Topic**: `delivery.assigned`
- **Payload**: `{ deliveryId, orderId, courierId, assignedAt, estimatedDeliveryTime }`
- **Consumers**: order-service (update delivery status), notification-service

### DeliveryStarted
- **Topic**: `delivery.started`
- **Payload**: `{ deliveryId, orderId, courierId, startedAt, currentLocation }`
- **Consumers**: order-service, notification-service (customer tracking)

### DeliveryCompleted
- **Topic**: `delivery.completed`
- **Payload**: `{ deliveryId, orderId, courierId, completedAt, deliveryProof }`
- **Consumers**: order-service (advance to COMPLETED), wallet-service (trigger settlement)

### CODCollected
- **Topic**: `logistics.cod.collected`
- **Payload**: `{ deliveryId, orderId, courierId, collectedAmount, collectedAt }`
- **Consumers**: wallet-service (settlement saga), order-service (update COD reputation)

### DeliveryFailed
- **Topic**: `delivery.failed`
- **Payload**: `{ deliveryId, orderId, courierId, failureReason, failedAt, retryable }`
- **Consumers**: order-service (trigger compensation), inventory-service (release stock)

### ReturnInitiated
- **Topic**: `delivery.return.initiated`
- **Payload**: `{ deliveryId, orderId, returnReason, initiatedAt }`
- **Consumers**: order-service (refund flow), inventory-service (restock)

## Events Consumed

### OrderConfirmed
- **Topic**: `order.confirmed`
- **Source**: order-service
- **Handler**: Creates delivery record, triggers courier assignment
- **Idempotency**: `EventIdempotency.withIdempotency` (Phase 2)

### OrderCancelled
- **Topic**: `order.cancelled`
- **Source**: order-service
- **Handler**: Cancels delivery, releases courier assignment

### PaymentCaptured
- **Topic**: `payment.captured`
- **Source**: payment-service
- **Handler**: Confirms delivery can proceed (payment secured)

## Retry Policy
- Exponential backoff: 1s, 2s, 4s, 8s, 16s (Phase 3)
- Dead-letter threshold: 5 retries
- Dead-letter topic: `logistics.dlq`

## Idempotency Strategy
- Delivery creation keyed by `delivery-{orderId}`
- Courier assignment keyed by `assign-{deliveryId}`
- COD collection keyed by `cod-{deliveryId}`
