# Event Bus Architecture - Before & After

## BEFORE: Fragmented Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    SHARED LAYER (Parallel Buses)                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────────┐        ┌──────────────────────┐     │
│  │   EventBus           │        │  InMemoryEventBus    │     │
│  │  (eventBus.ts)       │        │  (in-memory-...)     │     │
│  ├──────────────────────┤        ├──────────────────────┤     │
│  │ - EventEmitter       │        │ - EventEmitter       │     │
│  │ - handleWithRetry()  │        │ - handleWithRetry()  │     │
│  │ - IEventPublisher    │        │ - (no interface)     │     │
│  │ - IEventSubscriber   │        │                      │     │
│  └──────────┬───────────┘        └──────────┬───────────┘     │
│             │                               │                  │
│             │ eventBus                      │ inMemoryEventBus │
│             │ singleton                     │ singleton        │
└─────────────┼───────────────────────────────┼──────────────────┘
              │                               │
              │                               │
    ┌─────────┴─────────┐         ┌──────────┴──────────┐
    │                   │         │                     │
    ▼                   ▼         ▼                     ▼
┌─────────┐      ┌──────────┐  ┌──────────┐     ┌──────────┐
│  Saga   │      │Idempotent│  │ Outbox   │     │ Service  │
│Orchestr.│      │EventBus  │  │Publisher │     │Containers│
└─────────┘      └──────────┘  └──────────┘     └──────────┘
   Uses             Uses          Uses             Use
 eventBus         eventBus    inMemoryEventBus  inMemoryEventBus

PROBLEM: Two separate EventEmitter instances!
         Events published to one don't reach subscribers on the other!
```

### Service Layer Interfaces (Before)

```
┌──────────────────────────────────────────────────────────────┐
│                    SERVICE LAYER                             │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  Wallet Service          Analytics Service                  │
│  ┌─────────────────┐    ┌─────────────────┐               │
│  │ IEventBus       │    │ IEventBus       │               │
│  │ - publish(      │    │ - publish(      │               │
│  │   eventType,    │    │   {type,data})  │  ← Different! │
│  │   data,         │    │ - subscribe()   │               │
│  │   metadata)     │    │                 │               │
│  └─────────────────┘    └─────────────────┘               │
│                                                              │
│  Production Service      Payout Service                     │
│  ┌─────────────────┐    ┌─────────────────┐               │
│  │ IEventBus       │    │ IEventBus       │               │
│  │ - publish(any)  │    │ - publish(      │  ← Different! │
│  │ - subscribe()   │    │   eventType,    │               │
│  │                 │    │   data,         │               │
│  │                 │    │   metadata)     │               │
│  └─────────────────┘    └─────────────────┘               │
│                                                              │
└──────────────────────────────────────────────────────────────┘

PROBLEM: Four incompatible interface definitions!
         No type safety across services!
```

---

## AFTER: Unified Architecture (Single File)

```
┌─────────────────────────────────────────────────────────────────┐
│                    SHARED LAYER (Unified Bus)                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                    EventBus                              │  │
│  │                  (eventBus.ts)                           │  │
│  │                  ONE FILE ONLY                           │  │
│  ├──────────────────────────────────────────────────────────┤  │
│  │  - Single EventEmitter instance                          │  │
│  │  - handleWithRetry() (one implementation)                │  │
│  │  - implements IEventBus                                  │  │
│  │                                                          │  │
│  │  Interfaces:                                             │  │
│  │  ┌────────────────────────────────────────────────┐     │  │
│  │  │ IEventBus = IEventPublisher & IEventSubscriber │     │  │
│  │  └────────────────────────────────────────────────┘     │  │
│  │                                                          │  │
│  │  Exports (all from ONE file):                           │  │
│  │  • eventBus (singleton)                                  │  │
│  │  • inMemoryEventBus = eventBus (alias)                  │  │
│  │  • EventHandler type                                     │  │
│  └──────────────────────┬───────────────────────────────────┘  │
│                         │                                       │
│                         │ ONE singleton instance                │
│                         │ (accessible via both names)           │
└─────────────────────────┼───────────────────────────────────────┘
                          │
                          │ ONE singleton instance
                          │ (accessible via both names)
                          │
        ┌─────────────────┼─────────────────┬─────────────────┐
        │                 │                 │                 │
        ▼                 ▼                 ▼                 ▼
  ┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
  │  Saga    │     │Idempotent│     │  Outbox  │     │ Service  │
  │Orchestr. │     │EventBus  │     │Publisher │     │Containers│
  └──────────┘     └──────────┘     └──────────┘     └──────────┘
  implements       implements       uses IEventBus   use eventBus
  IEventBus        IEventBus        interface        singleton

SOLUTION: One EventEmitter, one subscriber registry!
          All events reach all subscribers!
```

### Service Layer Interfaces (After)

```
┌──────────────────────────────────────────────────────────────┐
│                    SERVICE LAYER                             │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │         ALL SERVICES USE SHARED IEventBus              │ │
│  ├────────────────────────────────────────────────────────┤ │
│  │  export { IEventBus } from '@shared/events/eventBus'   │ │
│  │                                                        │ │
│  │  Unified Interface:                                    │ │
│  │  • publish(eventType, data, metadata?)                │ │
│  │  • publish({ type, data, ... })                       │ │
│  │  • subscribe(eventType, handler)                      │ │
│  │  • subscribe(eventType, { name, handler })            │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  Wallet Service    Analytics Service    Production Service  │
│  ┌─────────────┐  ┌─────────────┐      ┌─────────────┐    │
│  │ re-exports  │  │ re-exports  │      │ re-exports  │    │
│  │ IEventBus   │  │ IEventBus   │      │ IEventBus   │    │
│  └─────────────┘  └─────────────┘      └─────────────┘    │
│                                                              │
│                   Payout Service                             │
│                   ┌─────────────┐                           │
│                   │ re-exports  │                           │
│                   │ IEventBus   │                           │
│                   └─────────────┘                           │
│                                                              │
└──────────────────────────────────────────────────────────────┘

SOLUTION: One interface definition, type-safe across all services!
```

---

## Event Flow Comparison

### BEFORE (Broken)
```
Publisher A                    Publisher B
    │                              │
    │ publish to                   │ publish to
    │ eventBus                     │ inMemoryEventBus
    ▼                              ▼
┌─────────┐                    ┌─────────┐
│EventBus │                    │InMemory │
│Instance │                    │Instance │
└────┬────┘                    └────┬────┘
     │                              │
     │ emit                         │ emit
     ▼                              ▼
Subscribers on                 Subscribers on
eventBus only                  inMemoryEventBus only

❌ Events don't cross between buses!
❌ Saga can't hear Outbox events!
```

### AFTER (Fixed)
```
Publisher A                    Publisher B
    │                              │
    │ publish to                   │ publish to
    │ eventBus                     │ inMemoryEventBus
    │                              │
    └──────────┬───────────────────┘
               │
               │ SAME INSTANCE
               ▼
         ┌─────────┐
         │EventBus │
         │(unified)│
         └────┬────┘
              │
              │ emit to all
              ▼
    ┌─────────┴─────────┐
    │                   │
    ▼                   ▼
Subscriber 1        Subscriber 2
(any source)        (any source)

✅ All events reach all subscribers!
✅ Complete event visibility!
```

---

## Key Improvements

| Aspect | Before | After |
|--------|--------|-------|
| **EventEmitter Instances** | 2 separate | 1 unified |
| **Retry Logic** | Duplicated in 2 places | Single implementation |
| **Interface Definitions** | 4 incompatible | 1 shared contract |
| **Type Safety** | ❌ Inconsistent | ✅ Enforced |
| **Event Visibility** | ❌ Fragmented | ✅ Complete |
| **Singleton Guarantee** | ❌ No | ✅ Yes |
| **Backward Compatibility** | N/A | ✅ 100% |
| **Code Duplication** | High | Eliminated |

---

## Runtime Verification

```typescript
// Proof that unification worked:
import { eventBus } from './shared/events/eventBus';
import { inMemoryEventBus } from './shared/events/in-memory-event-bus';

console.log(eventBus === inMemoryEventBus); // true ✅

// Subscribe on one, publish on the other - it works!
await eventBus.subscribe('test.event', async (envelope) => {
  console.log('Received:', envelope.data);
});

await inMemoryEventBus.publish('test.event', { message: 'Hello!' });
// Output: "Received: { message: 'Hello!' }" ✅
```
