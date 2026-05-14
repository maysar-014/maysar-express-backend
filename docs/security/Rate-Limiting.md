# Rate Limiting (Project Implementation)

This document describes how rate limiting is implemented in this repo, including Redis-backed counters and per-service defaults.

## Shared Redis Store

Primary source:
- `C:\Users\abdal\Desktop\maysar-express-backend\shared\middleware\redis-rate-limit.store.ts`

Implementation details:
- Uses `ioredis` to store counters
- Increments use a Lua script to ensure:
  - atomic increment
  - TTL set only once
- Returns `totalHits` and `resetTime` to `express-rate-limit`

Prefix:
- Default prefix is `rl:`
- Each service typically overrides the prefix per limiter

## Auth Service Rate Limits

File:
- `C:\Users\abdal\Desktop\maysar-express-backend\services\auth-service\src\api\middleware\rate-limiting.middleware.ts`

Defined limiters:

- `generalLimiter`
  - window: 15 minutes
  - max: 100
  - prefix: `rl:general:`
  - message: `Too many requests, please try again later.`

- `strictLimiter`
  - window: 15 minutes
  - max: 10
  - prefix: `rl:strict:`
  - message: `Too many requests, please try again later.`

- `loginLimiter`
  - window: 15 minutes
  - max: 5
  - prefix: `rl:login:`
  - message: `Too many login attempts, please try again later.`

All limiters:
- Use `RedisRateLimitStore`
- Set `passOnStoreError: true` to avoid blocking on Redis failure

The auth service mounts the `generalLimiter` by default:
- `C:\Users\abdal\Desktop\maysar-express-backend\services\auth-service\src\main.ts`

## Dynamic Rate Limit Builder

File:
- `services/auth-service/src/api/middleware/rate-limiting.middleware.ts`

Two helper functions:
- `rateLimit(options)` for custom limits
- `createRateLimit(options)` for defaults

Defaults in `createRateLimit`:
- window: 15 minutes
- max: 100
- message: `Too many requests from this IP, please try again later.`

## Redis Configuration

Redis connection is shared via:
- `getSharedRedisClient(resolveRedisUrl(process.env.REDIS_URL))`

Required env var:
- `REDIS_URL`

If Redis is unavailable:
- `passOnStoreError: true` allows requests to proceed

## Observability

The order-service logging middleware watches for rate-limit exhaustion:
- `C:\Users\abdal\Desktop\maysar-express-backend\services\order-service\src\middleware\logging.middleware.ts`

Behavior:
- When `X-RateLimit-Remaining` becomes `0`, it logs a security event and metrics.

---

## Chat Service Rate Limits

The chat-service enforces its own rate limits via Redis counters (independent of the global Express rate limiter).

| Limit | Value | Redis key | Error code |
|---|---|---|---|
| New conversations per user | 20 / 60 min | `chat:ratelimit:conv:{userId}` | `CHAT_RATE_LIMIT_EXCEEDED` |
| Messages sent per user | 200 / 60 min | `chat:ratelimit:msg:{userId}` | `CHAT_MESSAGE_RATE_LIMIT_EXCEEDED` |
| Same-content messages (mass-messaging) | 5 / 5 min | `chat:ratelimit:massmsg:{userId}:{hash}` | Spam score elevated to 85 |
| Rapid conversation initiation (risk flag) | 10 / 10 min | Tracked by RiskEngine | Account flagged for review |

Counters use atomic `INCR` + `EXPIRE` (set on first increment only) to prevent race conditions under concurrent requests.
