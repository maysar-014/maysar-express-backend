# Enabler Service - Scaling Strategy

## Task Matching
- Skill-based matching algorithm
- Availability cache in Redis

## Expected QPS
- Launch: 5 tasks/s
- Scale: 50 tasks/s

## Horizontal Scaling
- Stateless task assignment
- Redis cache shared

## Resource Limits
```yaml
limits:
  cpus: '0.25'
  memory: 128M
```
