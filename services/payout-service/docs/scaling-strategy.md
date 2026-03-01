# Payout Service - Scaling Strategy

## Batch Processing
- Daily batch payouts at 6 AM
- Batch size: 1000 payouts
- Sequential processing to avoid bank rate limits

## Expected QPS
- Launch: 10 payouts/s (batch)
- Scale: 100 payouts/s

## Horizontal Scaling
- Single-leader for batch processing
- Leader election via Redis lock

## Resource Limits
```yaml
limits:
  cpus: '0.5'
  memory: 256M
```
