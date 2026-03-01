# Notification Service - Scaling Strategy

## High-Volume Delivery
- Queue-based processing (Redis queue)
- Batch delivery for marketing campaigns
- Rate limiting per provider

## Expected QPS
- Launch: 100 notifications/s
- Scale: 1000 notifications/s

## Horizontal Scaling
- Stateless workers
- Redis queue shared

## Resource Limits
```yaml
limits:
  cpus: '0.5'
  memory: 256M
```
