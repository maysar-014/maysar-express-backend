# Support Service - Scaling Strategy

## Queue-Based Processing
- Redis queue for ticket routing
- Agent assignment algorithm

## Expected QPS
- Launch: 50 tickets/s
- Scale: 500 tickets/s

## Horizontal Scaling
- Stateless ticket processing
- Shared Redis queue

## Resource Limits
```yaml
limits:
  cpus: '0.5'
  memory: 256M
```
