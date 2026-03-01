# User Service - Scaling Strategy

## Read-Heavy Workload
- 80% reads (profile lookups), 20% writes
- Cache user profiles in Redis (TTL: 5 minutes)

## Expected QPS
- Launch: 100 reads/s, 10 writes/s
- Scale: 1000 reads/s, 100 writes/s

## Horizontal Scaling
- Stateless pods
- Redis cache shared across instances

## Resource Limits
```yaml
limits:
  cpus: '0.5'
  memory: 256M
```
