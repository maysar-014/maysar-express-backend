# Commission Service - Events

## Events Emitted

### CommissionCalculated
- **Topic**: `commission.calculated`
- **Payload**: `{ orderId, breakdown: { seller, enabler, platform }, qualityBonus }`
- **Consumers**: wallet-service (settlement), analytics-service

### QualityBonusAwarded
- **Topic**: `commission.bonus.awarded`
- **Payload**: `{ recipientId, bonusAmount, reason }`
- **Consumers**: notification-service, wallet-service

## Events Consumed

### OrderCompleted
- **Topic**: `order.completed`
- **Source**: order-service
- **Handler**: Calculates commission breakdown

### DeliveryCompleted
- **Topic**: `delivery.completed`
- **Source**: logistics-service
- **Handler**: Updates on-time delivery metrics for quality bonus
