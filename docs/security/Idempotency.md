# Idempotency (Project Implementation)

This document describes how HTTP and event idempotency are enforced in this repo.

## HTTP Idempotency Middleware

Primary source:
- `C:\Users\abdal\Desktop\maysar-express-backend\shared\middleware\idempotency.ts`

Class:
- `IdempotencyMiddleware`

### When It Applies

The middleware only enforces idempotency for:
- `POST`
- `PUT`
- `DELETE`

Other methods pass through unchanged.

### Required Header

Header name:
- `idempotency-key`

If missing, response is:
- HTTP `400`
```json
{
  "error": "Missing idempotency key",
  "message": "Header 'idempotency-key' is required for <METHOD> requests"
}
```

### Redis Keys

Prefixes:
- `idempotency:` for cached responses
- `idempotency:<key>:lock` for in-flight requests

Defaults:
- Cache TTL: 24 hours
- Lock TTL: 30 seconds
- Wait-for-response: 1200 ms

### Cache Behavior

If a cached response exists:
- The middleware responds immediately with the stored `statusCode` and `body`.

If a lock is already held:
- The middleware waits up to 1200 ms for the cached response.
- If still missing, returns HTTP `409`:
```json
{
  "error": "Request already in progress",
  "message": "A request with this idempotency key is currently being processed."
}
```

### Response Capture

The middleware wraps:
- `res.json`
- `res.send`

On response, it caches:
- `statusCode`
- `body`

It also removes the lock key when the response is stored or when the response is closed early.

### Custom Key Generation

`IdempotencyMiddleware` accepts a `generateKey` function for advanced use cases.

There is also a shared helper:
- `generateIdempotencyKey(req)`

That helper creates a SHA-256 hash from:
- method
- path
- body
- userId (if available)

## Event Idempotency

Class:
- `EventIdempotency`

Purpose:
- Prevent duplicate processing of events in consumers

Redis prefix:
- `event:processed:`

TTL:
- 24 hours

### Storage Strategy

Fast path:
- Redis `GET` / `SETEX`

Optional DB fallback:
- Prisma `eventLog` table
- Unique constraint on `{ eventId, consumerName }`

Behavior:
- If Redis is unavailable, it falls back to DB
- On duplicate insert (`P2002`), it treats the event as already processed
- On handler failure after DB claim, it deletes the DB record so the event can retry

## Configuration and Dependencies

Redis client:
- `getSharedRedisClient(resolveRedisUrl(redisUrl))`

Required env var in most deployments:
- `REDIS_URL`
