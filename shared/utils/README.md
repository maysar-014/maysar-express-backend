# shared/utils

Utility functions: currency formatting, enum mapping, and retry with exponential backoff.

## Purpose

Provides small, pure utility functions used across multiple service modules. No external state, no side effects.

## Exports

### `currency.util.ts`

| Export | Description |
|--------|-------------|
| Currency formatting utilities | Format amounts in TZS and other currencies |

### `enum-mappers.ts`

| Export | Description |
|--------|-------------|
| Enum mapping utilities | Convert between domain enums and database/API string values |

### `retry.util.ts`

| Export | Description |
|--------|-------------|
| `withRetry<T>(operation, options?)` | Retries an async operation with exponential backoff + jitter |
| `createRetryableFunction(fn, options?)` | Wraps a function to auto-retry on failure |
| `RetryOptions` | `{ maxAttempts, baseDelay, maxDelay, backoffFactor, retryCondition?, onRetry? }` |
| `RetryResult<T>` | `{ success, data?, error?, attempts, totalDuration }` |
| `RetryPresets` | Pre-configured retry profiles |
| `retryStats` | Global `RetryStats` instance for monitoring |

## Retry Presets

| Preset | maxAttempts | baseDelay | maxDelay | Use Case |
|--------|-------------|-----------|----------|---------|
| `FAST` | 3 | 100ms | 1s | Quick in-process operations |
| `STANDARD` | 3 | 1s | 10s | Normal service calls |
| `SLOW` | 5 | 2s | 30s | Expensive/critical operations |
| `NETWORK` | 5 | 500ms | 15s | Network calls (ECONNRESET, ETIMEDOUT) |
| `DATABASE` | 3 | 1s | 10s | DB operations (deadlocks, serialization) |
| `API` | 3 | 1s | 10s | External API calls (429, 5xx) |

## Usage

```typescript
import { withRetry, RetryPresets } from '@shared/utils/retry.util';

const result = await withRetry(
  () => pesapalGateway.charge(amount),
  {
    ...RetryPresets.API,
    onRetry: (attempt, error, delay) => {
      logger.warn(`Gateway retry ${attempt} after ${delay}ms`, { error });
    }
  }
);

if (!result.success) {
  throw result.error;
}
```

## Dependencies

None — no external dependencies.
