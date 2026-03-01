# Commission Service - Scaling Strategy

## Calculation Pattern
- Triggered by order completion events
- Stateless calculation engine
- Cache commission rates in Redis

## Expected QPS
- Launch: 50 calculations/s
- Scale: 500 calculations/s

## Horizontal Scaling
- Fully stateless
- No shared state

## Resource Limits
```yaml
limits:
  cpus: '0.25'
  memory: 128M
```
