# Analytics Service - Scaling Strategy

## Event Processing
- Stream processing (Kafka consumers)
- Batch aggregation every 5 minutes
- Time-series database for metrics

## Expected QPS
- Launch: 500 events/s
- Scale: 5000 events/s

## Horizontal Scaling
- Stateless event processors
- Partitioned by event type

## Resource Limits
```yaml
limits:
  cpus: '1.0'
  memory: 1G
```
