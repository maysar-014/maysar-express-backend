# Module Communication (Modular Monolith)

This system is a single Node.js process that hosts multiple service modules. Modules **do not** call each other over HTTP. They communicate **in-process** via internal facades/clients for synchronous work and via a shared event bus plus outbox for asynchronous work and durability.

## Goals
- Preserve **modular boundaries** while eliminating standalone deployments.
- Keep communication **fast, reliable, and observable** inside one process.
- Avoid confusion about “service-to-service” calls by standardizing the allowed patterns.

## Allowed Communication Patterns
### 1) Synchronous in-process calls
Use internal facades or in-process clients to call another module’s use cases directly.
- Example: Auth module uses a User Service client that calls the User Service facade.
- Pattern: `module A -> module B internal facade -> module B use case`.

References:
- `C:\Users\abdal\Desktop\maysar-express-backend\services\auth-service\src\infrastructure\clients\user-service.client.ts`
- `C:\Users\abdal\Desktop\maysar-express-backend\services\user-service\src\internal\user-service.facade.ts`

### 2) Asynchronous domain events (event bus + outbox)
Use domain events for cross-module coordination, sagas, and eventual consistency.
- Events are **published in-process** via the shared event bus.
- Events are **persisted** in a service outbox table for durability and retry.

References:
- `C:\Users\abdal\Desktop\maysar-express-backend\shared\events\eventBus.ts`
- `C:\Users\abdal\Desktop\maysar-express-backend\shared\outbox\outbox.repository.ts`

## Prohibited Patterns
- **No HTTP calls between modules** inside the monolith.
- **No standalone module processes** running outside the monolith runtime.
- **No shared database writes across module boundaries** without going through the owning module’s repository or facade.

## Runtime Wiring
All modules are registered and initialized in a single process:
- Module registry bootstraps each module.
- Express mounts module routes in one app.

References:
- `C:\Users\abdal\Desktop\maysar-express-backend\src\main.ts`
- `C:\Users\abdal\Desktop\maysar-express-backend\src\core\module-registry.ts`

## Event Registry (Schema Safety)
Shared event schemas are registered once during startup.
- This prevents incompatible event payloads across modules.

Reference:
- `C:\Users\abdal\Desktop\maysar-express-backend\shared\events\registry\index.ts`

## Communication Diagram
```mermaid
flowchart LR
  subgraph Monolith[Modular Monolith (Single Process)]
    Auth["Auth Module"]
    User["User Module"]
    Order["Order Module"]
    Notification["Notification Module"]
    Chat["Chat Module"]
    Bus["Event Bus (In-Process)"]
    Outbox["Outbox Tables (Per Module)"]
  end

  Auth -->|Sync facade/client| User
  Order -->|Sync facade/client| User
  User -->|Publish event| Bus
  Notification -->|Publish event| Bus
  Auth -->|Persist event| Outbox
  Order -->|Persist event| Outbox
  Bus -->|Deliver event| Notification
  Bus -->|"OrderDelivered / OrderCancelled"| Chat
  Chat -->|"notifyOfflineParticipants"| Notification
```

## How to Add a New Module (Communication Checklist)
1. Expose an internal facade for synchronous calls.
2. Use the shared event bus for cross-module events.
3. Persist domain events to the module’s outbox table.
4. Register any new event schemas in the registry.
5. Add module initialization to the module registry export.

## Operational Notes
- In-process calls are fast but must still respect module ownership.
- Event-driven flows should be preferred for side effects and eventual consistency.
- Outbox processors handle retries if event publishing fails.


## Chat Service Communication Patterns

The `chat-service` follows the same in-process module pattern with two additional infrastructure dependencies:

### Event subscriptions (async)

```
EventBus.subscribe('OrderDelivered')  → ArchiveCourierConversationsJob
EventBus.subscribe('OrderCancelled') → ArchiveCourierConversationsJob
```

When an order is delivered or cancelled, the chat-service automatically archives the associated `BUYER_COURIER` conversation.

### Notification integration (sync HTTP)

The chat-service calls the `notification-service` HTTP API directly to deliver push/SMS/email notifications to offline participants. This is the only HTTP call the chat-service makes to another module — it goes through the internal service URL, not an external network hop.

### Shared Prisma client (sync in-process)

Product card snapshots and order reference snapshots are resolved by querying the shared PostgreSQL database directly via the shared Prisma client. This avoids an HTTP round-trip to catalog-service or order-service.

### WebSocket fan-out (Redis Pub/Sub)

Messages are published to `chat:conv:{conversationId}` Redis channels. The WsGateway subscribes to these channels and fans out to all connected WebSocket clients. This means multiple Node.js instances (if horizontally scaled) can all serve the same conversation without coordination overhead.
