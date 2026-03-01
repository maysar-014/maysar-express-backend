# Notification Service - Events

## Events Emitted

### NotificationSent
- **Topic**: `notification.sent`
- **Payload**: `{ notificationId, userId, channel, sentAt }`
- **Consumers**: analytics-service

### NotificationDelivered
- **Topic**: `notification.delivered`
- **Payload**: `{ notificationId, deliveredAt }`
- **Consumers**: analytics-service

## Events Consumed

### OrderCreated
- **Topic**: `order.created`
- **Source**: order-service
- **Handler**: Sends order confirmation

### PaymentCaptured
- **Topic**: `payment.captured`
- **Source**: payment-service
- **Handler**: Sends payment confirmation

### DeliveryCompleted
- **Topic**: `delivery.completed`
- **Source**: logistics-service
- **Handler**: Sends delivery confirmation
