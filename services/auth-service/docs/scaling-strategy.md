# Auth Service - Scaling Strategy

## Session Storage
- Redis cluster for session data
- Session TTL: 24 hours
- Refresh token TTL: 30 days

## Expected QPS
- Launch: 50 logins/s, 200 session validations/s
- Scale: 500 logins/s, 2000 validations/s

## Horizontal Scaling
- Stateless JWT validation
- Redis session store shared

## Resource Limits
```yaml
limits:
  cpus: '0.5'
  memory: 256M
```

## Security
- Rate limiting: 5 login attempts per 15 minutes
- JWT rotation every 15 minutes
