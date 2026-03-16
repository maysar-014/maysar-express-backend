# shared/saga

Distributed saga orchestration framework for managing multi-step transactions with automatic compensation, retry, and dead-letter routing.

## Purpose

Provides the `DistributedSagaOrchestrator` base class that all service sagas extend. Each saga defines an ordered list of steps; if any step fails, previously completed steps are compensated in reverse order. Prometheus metrics track step duration, failures, compensations, and dead letters.

## Exports

| Export | Description |
|--------|-------------|
| `DistributedSagaOrchestrator<T>` | Abstract base class — extend and implement `defineSteps()` |
| `SagaStep<T>` | `{ name, execute, compensate, validateCompensation? }` |
| `SagaFactory` | Factory for creating saga instances |
| `SagaLogRepository` | Persists saga state to database |
| `SagaDeadLetterRepository` | Stores permanently failed sagas |
| `SagaRecoveryWorker` | Resumes stuck sagas on startup |

## Usage

```typescript
import { DistributedSagaOrchestrator, SagaStep } from '@shared/saga/saga.orchestrator';

export class OrderFulfillmentSaga extends DistributedSagaOrchestrator<OrderPayload> {
  protected sagaType = 'OrderFulfillmentSaga';

  protected defineSteps(): SagaStep<OrderPayload>[] {
    return [
      {
        name: 'ReserveInventory',
        execute: async (payload, sagaId) => { /* ... */ },
        compensate: async (payload, sagaId) => { /* release reservation */ }
      },
      {
        name: 'ProcessPayment',
        execute: async (payload, sagaId) => { /* ... */ },
        compensate: async (payload, sagaId) => { /* refund */ }
      }
    ];
  }
}

// Start a saga
const sagaId = await saga.start(payload, correlationId);

// Resume a stuck saga
await saga.resume(sagaId);
```

## Saga Lifecycle

```
STARTED → IN_PROGRESS → COMPLETED
                      → COMPENSATING → COMPENSATED
                                     → FAILED (dead letter)
```

## Retry Configuration

Steps use `RetryPresets.STANDARD` (3 attempts, 1s base delay) by default. Compensation uses `RetryPresets.SLOW` (5 attempts, 2s base delay). Both are configurable via constructor options.

## Metrics (Prometheus)

| Metric | Description |
|--------|-------------|
| `saga_step_duration_seconds` | Step execution duration by type/name/outcome |
| `saga_failures_total` | Failed steps by saga type and step name |
| `saga_compensations_total` | Compensation executions by saga type |
| `saga_dead_letters_total` | Dead-lettered sagas by type and reason |
| `saga_active_total` | Active saga count by type and status |

## Dependencies

- `shared/events/eventBus` — publishes `SagaStarted`, `SagaCompleted`, `SagaFailed`, `SagaCompensated` events
- `shared/utils/retry.util` — exponential backoff for step and compensation retries
- `shared/metrics/metrics.factory` — Prometheus metrics registry
- `shared/logger/logger` — structured logging
- PostgreSQL (via Prisma) — saga log and dead-letter persistence
