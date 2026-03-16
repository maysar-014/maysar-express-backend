# shared/middleware

Shared Express middleware: CSRF protection, idempotency key enforcement, and Redis-backed rate-limit store.

## Purpose

Provides reusable Express middleware that any service module can mount. Centralizes security and reliability concerns so they don't need to be reimplemented per service.

## Exports

| Export | File | Description |
|--------|------|-------------|
| `csrfTokenMiddleware` | `csrf.middleware.ts` | Sets `csrf-token` cookie on GET requests |
| `csrfValidationMiddleware` | `csrf.middleware.ts` | Validates `X-CSRF-Token` header on state-changing requests |
| `idempotencyMiddleware` | `idempotency.ts` | Enforces idempotency keys, caches responses in Redis |
| `RedisRateLimitStore` | `redis-rate-limit.store.ts` | Redis-backed store for `express-rate-limit` |

## Usage

### CSRF Protection

```typescript
import { csrfTokenMiddleware, csrfValidationMiddleware } from '@shared/middleware/csrf.middleware';

app.use(csrfTokenMiddleware);       // Sets cookie on GET
app.use(csrfValidationMiddleware);  // Validates header on POST/PUT/DELETE/PATCH
```

CSRF token is set as an `httpOnly: false` cookie (`csrf-token`) so frontend JS can read it and send it back as `X-CSRF-Token`. Uses `crypto.timingSafeEqual` for constant-time comparison.

### Idempotency

```typescript
import { idempotencyMiddleware } from '@shared/middleware/idempotency';

router.post('/payments', idempotencyMiddleware, paymentController.create);
```

Clients send `Idempotency-Key: <uuid>` header. Duplicate requests within the TTL window receive the cached response.

### Redis Rate Limit Store

```typescript
import rateLimit from 'express-rate-limit';
import { RedisRateLimitStore } from '@shared/middleware/redis-rate-limit.store';

app.use(rateLimit({
  store: new RedisRateLimitStore({ client: redisClient }),
  windowMs: 15 * 60 * 1000,
  max: 100
}));
```

## Dependencies

- `shared/redis` — Redis client for idempotency cache and rate-limit store
- Node.js built-in `crypto` — CSRF token generation and comparison
