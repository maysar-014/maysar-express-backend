# Inventory Service - Events

## Events Emitted

### StockReserved
- **Topic**: `inventory.reserved`
- **Payload**: `{ reservationId, productVariantId, quantity, orderId, expiresAt }`
- **Consumers**: order-service (proceed with payment), catalog-service (update availability)
- **Durability**: Persisted in `Inventory_OutboxEvent`

### StockReleased
- **Topic**: `inventory.released`
- **Payload**: `{ reservationId, productVariantId, quantity, reason }`
- **Consumers**: order-service, catalog-service (restore availability)

### StockCommitted
- **Topic**: `inventory.committed`
- **Payload**: `{ reservationId, productVariantId, quantity, orderId, committedAt }`
- **Consumers**: catalog-service (update sold count), analytics-service

### StockReplenished
- **Topic**: `inventory.replenished`
- **Payload**: `{ productVariantId, quantity, newAvailableStock, replenishedBy }`
- **Consumers**: catalog-service (update availability), notification-service

### ReservationExpired
- **Topic**: `inventory.reservation.expired`
- **Payload**: `{ reservationId, productVariantId, quantity, orderId, expiredAt }`
- **Consumers**: order-service (cancel order), catalog-service (restore availability)

## Events Consumed

### OrderCreated
- **Topic**: `order.created`
- **Source**: order-service
- **Handler**: Creates stock reservation via `StockEngine.reserve`
- **Idempotency**: `EventIdempotency.withIdempotency` (Phase 2)

### OrderConfirmed
- **Topic**: `order.confirmed`
- **Source**: order-service
- **Handler**: Commits reservation (permanent allocation)

### OrderCancelled
- **Topic**: `order.cancelled`
- **Source**: order-service
- **Handler**: Releases reservation, restores available stock

### DeliveryFailed
- **Topic**: `delivery.failed`
- **Source**: logistics-service
- **Handler**: Releases committed stock (return flow)

## Retry Policy
- Exponential backoff: 1s, 2s, 4s, 8s, 16s (Phase 3)
- Dead-letter threshold: 5 retries
- Dead-letter topic: `inventory.dlq`

## Idempotency Strategy
- Reservation keyed by `reserve-{orderId}-{productVariantId}`
- Duplicate requests return existing reservation (HTTP 200)
- Commit/release keyed by `{action}-{reservationId}`

## Concurrency Guarantees
- **Redlock**: Ensures atomic check-and-reserve (Phase 4)
- **Redis INCRBY**: Atomic stock decrement
- **Optimistic Locking**: Version field on `Inventory_Stock` (Phase 4)
