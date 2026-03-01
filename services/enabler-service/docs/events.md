# Enabler Service - Events

## Events Emitted

### TaskAssigned
- **Topic**: `enabler.task.assigned`
- **Payload**: `{ taskId, enablerId, sellerId, taskType, value }`
- **Consumers**: commission-service, notification-service

### TaskCompleted
- **Topic**: `enabler.task.completed`
- **Payload**: `{ taskId, enablerId, completedAt, qualityScore }`
- **Consumers**: commission-service (trigger payout), wallet-service

### CollaborationStarted
- **Topic**: `enabler.collaboration.started`
- **Payload**: `{ collaborationId, enablerId, sellerId }`
- **Consumers**: analytics-service

## Events Consumed

### OrderCreated
- **Topic**: `order.created`
- **Source**: order-service
- **Handler**: Creates task if seller has enabler collaboration
