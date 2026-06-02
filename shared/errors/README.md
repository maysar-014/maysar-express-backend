# shared/errors

Application error hierarchy and optimistic lock error types used across all service modules.

## Purpose

Provides a consistent error taxonomy so all services throw and handle errors in a uniform way. The `AppError` base class carries an HTTP status code and structured metadata, enabling the global error handler to produce consistent API error responses.

## Exports

| Export | Description |
|--------|-------------|
| `AppError` | Base application error with `statusCode` and `metadata` |
| `OptimisticLockError` | Thrown when a versioned aggregate has a concurrent update conflict |

From `shared/types/index.ts` (re-exported pattern):

| Export | Description |
|--------|-------------|
| `DomainError` | Base domain error with optional `code` |
| `ValidationError` | Input validation failure with `fields` map |
| `NotFoundError` | Resource not found with resource name and ID |

## Usage

```typescript
import { AppError } from '@shared/errors/app-error';
import { OptimisticLockError } from '@shared/errors/optimistic-lock.error';

// Throw a domain error
throw new AppError('Payment gateway unavailable', { gateway: 'paymentGateway' }, 503);

// Catch optimistic lock conflict and retry
try {
  await paymentRepository.save(payment);
} catch (err) {
  if (err instanceof OptimisticLockError) {
    // reload and retry
  }
}
```

## Error Shape

```typescript
class AppError extends Error {
  name: 'AppError';
  message: string;
  statusCode?: number;       // HTTP status code
  metadata?: Record<string, unknown>;  // Structured context
}
```

## Dependencies

None — no external dependencies.
