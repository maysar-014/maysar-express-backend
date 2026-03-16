# shared/audit

Event bus audit logging — records all published events to an audit trail for compliance and debugging.

## Purpose

Provides audit logging for the in-process EventBus. The audit middleware intercepts every published event and writes a structured log entry. This creates a tamper-evident trail of all domain events for compliance requirements and post-incident investigation.

## Exports

| Export | Description |
|--------|-------------|
| `initEventBusAuditMiddleware()` | No-op (deprecated) — audit is now automatic in EventBus |
| `AuditService` (from `audit.service.ts`) | Direct audit trail service for manual audit entries |

## Note on Deprecation

`eventBusAudit.ts` is kept for backward compatibility. Audit logging is now integrated directly into the `EventBus` singleton in `shared/events/eventBus.ts`. No explicit initialization is required.

## Usage

```typescript
// Audit is automatic — no setup needed
import { eventBus } from '@shared/events/eventBus';

// Every publish() call is automatically audited
await eventBus.publish('OrderCreated', { orderId: 'ord_01J...' });
// → Audit entry written: { eventType: 'OrderCreated', timestamp, correlationId, ... }
```

## Dependencies

- `shared/events/eventBus` — audit hooks into the EventBus publish pipeline
- `shared/logger/logger` — structured log output
