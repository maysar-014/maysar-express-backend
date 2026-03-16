# shared/locking

Redis-based distributed locking (`RedisLock`) for protecting critical sections across concurrent requests.

## Purpose

Prevents race conditions in operations that must be atomic — stock reservation, wallet debit/credit, buy-box computation. Uses a compare-and-delete Lua script for safe lock release, ensuring only the lock owner can release it.

## Exports

| Export | Description |
|--------|-------------|
| `RedisLock` | Distributed lock with acquire, release, and `withLock` helper |

## Usage

```typescript
import { RedisLock } from '@shared/locking/redis-lock';
import { getSharedRedisClient } from '@shared/redis/ioredis-client';

const lock = new RedisLock(getSharedRedisClient(), {
  retries: 3,
  retryDelayMs: 100,
  maxRetryDelayMs: 1000,
  keyPrefix: 'lock:'
});

// Option 1: withLock helper (auto-release)
const result = await lock.withLock('inventory:lock:variant-123', async () => {
  // critical section — check stock and reserve atomically
  return await reserveStock(variantId, quantity);
});

// Option 2: Manual acquire/release
const acquired = await lock.acquireLock('wallet:lock:user-456', 5000); // 5s TTL
if (!acquired) throw new Error('Could not acquire lock');
try {
  await debitWallet(userId, amount);
} finally {
  await lock.releaseLock('wallet:lock:user-456');
}
```

## Lock Key Conventions

| Domain | Key Pattern |
|--------|-------------|
| Inventory | `inventory:lock:{productVariantId}` |
| Wallet | `wallet:lock:{userId}` |
| Buy-box | `catalog:lock:buybox:{productId}` |

## Configuration

| Option | Default | Description |
|--------|---------|-------------|
| `retries` | `3` | Max acquisition retry attempts |
| `retryDelayMs` | `100` | Base retry delay (ms) |
| `maxRetryDelayMs` | `1000` | Max retry delay after exponential backoff |
| `keyPrefix` | `lock:` | Prefix prepended to all lock keys |
| TTL (per call) | `5000` | Lock TTL in milliseconds |

## Dependencies

- `shared/redis` — Redis client for SET NX PX and Lua eval
