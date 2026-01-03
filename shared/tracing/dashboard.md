# Tracing Dashboard Configuration

## Jaeger Setup

### Docker Compose
```yaml
version: '3.8'
services:
  jaeger:
    image: jaegertracing/all-in-one:latest
    ports:
      - "16686:16686"  # Jaeger UI
      - "14268:14268"  # Jaeger collector
    environment:
      - COLLECTOR_OTLP_ENABLED=true
```

### Environment Variables
```bash
JAEGER_ENDPOINT=http://localhost:14268/api/traces
SERVICE_NAME=order-service
SERVICE_VERSION=1.0.0
NODE_ENV=development
```

## Grafana Dashboard

### Correlation ID Tracking
```json
{
  "dashboard": {
    "title": "Event Correlation Tracking",
    "panels": [
      {
        "title": "Event Chains by Correlation ID",
        "type": "table",
        "targets": [
          {
            "expr": "sum by (correlation_id) (event_published_total)",
            "legendFormat": "{{correlation_id}}"
          }
        ]
      },
      {
        "title": "Saga Completion Rate",
        "type": "stat",
        "targets": [
          {
            "expr": "rate(saga_completed_total[5m]) / rate(saga_started_total[5m]) * 100"
          }
        ]
      }
    ]
  }
}
```

## Trace Queries

### Find Order Saga Traces
```
service.name="order-service" AND operation.name="order-creation"
```

### Find Failed Payment Traces
```
service.name="payment-service" AND error=true
```

### Find Long-Running Sagas
```
duration > 30s AND tags.correlation_id exists
```

## Metrics to Monitor

### Event Correlation
- Events per correlation ID
- Orphaned events (no correlation)
- Correlation chain length
- Chain completion time

### Trace Performance
- Service latency P95/P99
- Cross-service call duration
- Error rates by trace
- Span count per trace

### Business Metrics
- Order completion rate
- Payment success rate
- Inventory reservation time
- End-to-end order time