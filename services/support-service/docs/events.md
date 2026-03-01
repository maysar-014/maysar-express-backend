# Support Service - Events

## Events Emitted

### TicketCreated
- **Topic**: `support.ticket.created`
- **Payload**: `{ ticketId, userId, category, priority }`
- **Consumers**: notification-service, analytics-service

### TicketResolved
- **Topic**: `support.ticket.resolved`
- **Payload**: `{ ticketId, resolvedAt, resolution, satisfactionScore }`
- **Consumers**: analytics-service

### EscalationTriggered
- **Topic**: `support.escalation`
- **Payload**: `{ ticketId, escalationLevel, reason }`
- **Consumers**: notification-service (alert managers)

## Events Consumed

### OrderCompleted, PaymentFailed, DeliveryFailed
- **Source**: Various services
- **Handler**: Auto-creates support tickets for failures
