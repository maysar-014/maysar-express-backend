# Shared Libraries

Cross-cutting infrastructure shared by all 21 service modules. Each module is imported directly — no network calls, no separate processes.

## Modules

| Module | Description |
|--------|-------------|
| [events](events/) | In-process EventBus, publish/subscribe, dead-letter queue |
| [saga](saga/) | `DistributedSagaOrchestrator` — step execution, compensation, dead-letter routing |
| [outbox](outbox/README.md) | Transactional outbox pattern for guaranteed event delivery |
| [database](database/) | Prisma client singleton with prefixed-ULID ID middleware |
| [encryption](encryption/) | AES-256-GCM PII encryption and HMAC-SHA256 hashing |
| [errors](errors/) | `AppError` hierarchy, optimistic lock errors |
| [audit](audit/) | Event bus audit logging (integrated into EventBus) |
| [middleware](middleware/) | CSRF protection, idempotency keys, Redis rate-limit store |
| [redis](redis/) | ioredis client factory with shared connection pool |
| [locking](locking/) | Redis-based distributed locking (`RedisLock`) |
| [logger](logger/) | Winston structured logger factory (`createLogger`, `ServiceLogger`) |
| [metrics](metrics/) | Prometheus metrics factory (`createServiceMetrics`, `MetricsCollector`) |
| [tracing](tracing/) | OpenTelemetry `TracingService`, correlation ID middleware |
| [i18n](i18n/) | i18next configuration, English and Swahili locales |
| [ids](ids/) | Prefixed ULID generation (`makeId`), domain prefix registry |
| [config](config/) | Service base URL helpers (`getServiceBaseUrl`) |
| [types](types/) | Shared TypeScript interfaces: `BaseEntity`, `IRepository`, `IUseCase`, `IEventBus` |
| [utils](utils/) | Currency utilities, enum mappers, retry with exponential backoff |
| [validation](validation/) | Zod and Joi ID validators using `isSystemId` |

## Usage Pattern

All shared modules are imported via TypeScript path aliases configured in `tsconfig.json`:

```typescript
import { eventBus } from '@shared/events/eventBus';
import { createLogger } from '@shared/logger/logger';
import { RedisLock } from '@shared/locking/redis-lock';
import { makeId } from '@shared/ids/id';
```

## Adding a New Shared Module

1. Create a directory under `shared/my-module/`
2. Export a clean public API from an `index.ts` or named files
3. Add a path alias in `tsconfig.json` if needed
4. Add a `README.md` documenting purpose, exports, and usage
5. Register in this index
