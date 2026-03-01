# Compliance Service - Scaling Strategy

## Event-Driven Monitoring
- Consumes all transaction events
- Real-time rule evaluation

## Expected QPS
- Launch: 1000 transactions/s
- Scale: 10000 transactions/s

## Horizontal Scaling
- Stateless rule engine
- Partitioned by transaction type

## Resource Limits
```yaml
limits:
  cpus: '0.5'
  memory: 512M
```
