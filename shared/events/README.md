# shared/events

In-process EventBus for publish/subscribe communication between service modules. No network, no serialization — pure in-memory dispatch.

## Purpose

Replaces inter-service HTTP calls with a synchronous in-process event bus. All 21 service modules share a single `eventBus` singleton. Failed handlers are routed to a per-event-type dead-letter queue (DLQ) rather than silently dropped.

## Exports

| Export | Description |
|--------|-------------|
| `EventBus` | Core class — publish, subscribe, DLQ management |
| `eventBus` | Singleton instance shared across all modules |
| `inMemoryEventBus` | Alias for `eventBus` |
| `EventEnvelope<T>` | Standard event wrapper with `eventId`, `eventType`, `data`, `correlationId`, `timestamp` |
| `IEventBus` | Interface for publish + subscribe |
| `IEventPublisher` | Publish-only interface |
| `IEventSubscriber` | Subscribe-only interface |
| `EventHandler<T>` | `(envelope: T) => Promise<void>` |
| `SubscriptionOptions<T>` | Named subscriber registration |

Also exports from `registry/` and `correlatedEvents.ts`, `idempotentEventBus.ts`, `metadata.ts`.

## Usage

```typescript
import { eventBus, EventEnvelope } from '@shared/events/eventBus';

// Subscribe
await eventBus.subscribe('OrderCreated', {
  name: 'inventory-service:reserve-stock',
  handler: async (envelope: EventEnvelope) => {
    // handle event
  }
});

// Publish
await eventBus.publish({
  eventType: 'OrderCreated',
  data: { orderId: 'ord_01J...' },
  correlationId: 'req-abc-123'
});

// Or shorthand
await eventBus.publish('OrderCreated', { orderId: 'ord_01J...' });
```

## Dead-Letter Queue

Handlers that throw are caught and the envelope is pushed to the DLQ. The publish call then throws an aggregate error listing all failed subscribers.

```typescript
const dlq = eventBus.getDLQ();           // Map<eventType, EventEnvelope[]>
const size = eventBus.getDLQSize('OrderCreated');
eventBus.clearDLQ('OrderCreated');       // Clear specific type
eventBus.clearDLQ();                     // Clear all
```

## Configuration

| Env Var | Default | Description |
|---------|---------|-------------|
| `EVENT_BUS_MAX_LISTENERS` | `200` | Max subscribers per event type |

## Dependencies

None — pure in-process, no external services required.
