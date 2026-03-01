# Analytics Service - Events

## Events Emitted

### MetricCalculated
- **Topic**: `analytics.metric.calculated`
- **Payload**: `{ metricName, value, timestamp, dimensions }`
- **Consumers**: dashboard-service, reporting-service

## Events Consumed

### All Platform Events
- Consumes events from all services for analytics
- Aggregates into metrics and reports
- No event emission (pure consumer)

**Key Event Sources:**
- order.created, order.completed
- payment.captured, payment.failed
- delivery.completed, delivery.failed
- commission.calculated
- user.registered
