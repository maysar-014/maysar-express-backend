# Training Service - Scaling Strategy

## Low Volume Service
- Expected: 10 enrollments/s
- Scale: 100 enrollments/s

## Video Streaming
- CDN for video content
- Progress tracking in database

## Horizontal Scaling
- Stateless enrollment
- CDN handles video load

## Resource Limits
```yaml
limits:
  cpus: '0.25'
  memory: 128M
```
