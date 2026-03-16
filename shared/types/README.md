# shared/types

Shared TypeScript interfaces, base classes, and type definitions used across all service modules.

## Purpose

Provides the foundational type contracts that enforce consistency across the platform — repository interfaces, use case interfaces, event bus types, error classes, and pagination types. All service modules import from here rather than defining their own base types.

## Exports

### Interfaces

| Export | Description |
|--------|-------------|
| `BaseEntity` | `{ id: string; createdAt: Date; updatedAt: Date }` |
| `IRepository<T>` | `findById`, `save`, `update`, `delete` |
| `IUseCase<TRequest, TResponse>` | `execute(request): Promise<response>` |
| `IEventBus` | `publish`, `emit`, `subscribe` |
| `ILogger` | `info`, `error`, `warn`, `debug` |
| `EventEnvelope<TData, TMetadata>` | Standard event wrapper |
| `SubscriptionOptions<T>` | Named subscriber registration |
| `EventHandler<T>` | `(envelope: T) => Promise<void>` |
| `SagaStep<T>` | `{ name, execute, compensate }` |
| `HealthCheckResult` | `{ status, checks, timestamp }` |

### Types

| Export | Description |
|--------|-------------|
| `Result<T, E>` | `{ success: true; value: T } \| { success: false; error: E }` |
| `PaginationParams` | `{ page?, limit?, sortBy?, sortOrder? }` |
| `PaginatedResult<T>` | `{ data, total, page, limit, totalPages }` |
| `PrismaTransaction` | `Prisma.TransactionClient` alias |

### Error Classes

| Export | Description |
|--------|-------------|
| `DomainError` | Base domain error with optional `code` |
| `ValidationError` | Input validation failure with `fields` map |
| `NotFoundError` | Resource not found — `{resource} with id {id} not found` |

Also re-exports all `@prisma/client` types.

## Usage

```typescript
import { IRepository, BaseEntity, PaginatedResult } from '@shared/types';

interface IOrderRepository extends IRepository<Order> {
  findByUserId(userId: string): Promise<Order[]>;
  findPaginated(params: PaginationParams): Promise<PaginatedResult<Order>>;
}
```

## Dependencies

- `@prisma/client` — re-exported for convenience
