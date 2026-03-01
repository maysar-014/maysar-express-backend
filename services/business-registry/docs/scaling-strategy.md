# Business Registry - Scaling Strategy

## Low Volume Service
- Expected: 5 registrations/s at launch
- Scale: 50 registrations/s

## Horizontal Scaling
- Stateless validation
- Document storage via S3

## Resource Limits
```yaml
limits:
  cpus: '0.25'
  memory: 128M
```
