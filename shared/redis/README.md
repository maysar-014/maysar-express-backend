# shared/redis

ioredis client factory with a shared connection pool — one Redis connection per URL across the entire process.

## Purpose

Prevents connection proliferation by maintaining a single `ioredis` client per Redis URL. All service modules that need Redis (caching, locking, rate limiting, sessions) call `getSharedRedisClient()` and receive the same connection instance.

## Exports

| Export | Description |
|--------|-------------|
| `getSharedRedisClient(redisUrl?)` | Returns (or creates) a shared `Redis` instance for the given URL |
| `resolveRedisUrl(redisUrl?)` | Resolves URL from argument → `REDIS_URL` env → `redis://localhost:6379` |
| `pingSharedRedis(redisUrl?)` | Health check — returns `true` if Redis responds to PING |

Also exports `scanKeys` from `scan-keys.ts` for cursor-based key scanning.

## Usage

```typescript
import { getSharedRedisClient } from '@shared/redis/ioredis-client';

const redis = getSharedRedisClient();

await redis.set('key', 'value', 'EX', 60);
const value = await redis.get('key');
```

## Configuration

| Env Var | Default | Description |
|---------|---------|-------------|
| `REDIS_URL` | `redis://localhost:6379` | Redis connection URL |
| `REDIS_PASSWORD` | — | Redis password (include in URL or set separately) |

## Dependencies

- `ioredis` — Redis client library
