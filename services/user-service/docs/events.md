# User Service - Events

## Events Emitted

### UserRegistered
- **Topic**: `user.registered`
- **Payload**: `{ userId, email, role, registeredAt }`
- **Consumers**: wallet-service (create wallet), notification-service

### UserProfileUpdated
- **Topic**: `user.profile.updated`
- **Payload**: `{ userId, updatedFields, updatedAt }`
- **Consumers**: analytics-service

### CODReputationUpdated
- **Topic**: `user.cod.reputation.updated`
- **Payload**: `{ userId, oldScore, newScore, reason }`
- **Consumers**: wallet-service (adjust pre-auth thresholds), order-service

### UserVerified
- **Topic**: `user.verified`
- **Payload**: `{ userId, verificationType, verifiedAt }`
- **Consumers**: business-registry, compliance-service

## Events Consumed

### OrderCompleted
- **Topic**: `order.completed`
- **Source**: order-service
- **Handler**: Updates COD reputation if COD order

### DeliveryFailed
- **Topic**: `delivery.failed`
- **Source**: logistics-service
- **Handler**: Decrements COD reputation if customer fault
