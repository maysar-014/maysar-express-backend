# shared-contracts

Cross-service event contracts and shared type definitions. The single source of truth for inter-module communication schemas.

## Purpose

Defines the TypeScript types for all events published and consumed between service modules. Any service that publishes or subscribes to a cross-service event must use the types defined here — this prevents schema drift and makes breaking changes visible at compile time.

## Structure

```
shared-contracts/
├── events/
│   └── index.ts          # Re-exports from canonical events/ catalog
├── types/
│   └── index.ts          # Shared primitive types (UUID, Money, UserRole, etc.)
├── order-service-contracts.ts
├── payment-service-contracts.ts
├── wallet-service-contracts.ts
├── inventory-service-contracts.ts
├── logistics-service-contracts.ts
├── commission-service-contracts.ts
├── notification-service-contracts.ts
├── user-service-contracts.ts
├── catalog-service-contracts.ts
├── business-registry-service-contracts.ts
├── compliance-service-contracts.ts
├── support-service-contracts.ts
├── training-service-contracts.ts
├── payout-service-contracts.ts
├── campaign-service-contracts.ts
└── pricing-service-contracts.ts
```

## Shared Types (`types/index.ts`)

| Type | Description |
|------|-------------|
| `UUID` | `string` alias for ID fields |
| `Money` | `{ amount: number; currency: string }` (amount in cents) |
| `UserRole` | `'buyer' \| 'seller' \| 'supplier' \| 'courier' \| 'enabler' \| 'system'` |
| `OrderStatus` | `'pending' \| 'paid' \| 'shipped' \| 'delivered' \| 'cancelled'` |
| `PaymentStatus` | `'pending' \| 'succeeded' \| 'failed' \| 'refunded'` |
| `ShippingAddress` | `{ street, city, region, country, postalCode }` |
| `EventEnvelope<T>` | `{ event, version, eventId, producer, timestamp, payload }` |

## Usage

```typescript
// Publishing a contract-typed event
import { OrderCreatedPayload } from '@shared-contracts/order-service-contracts';
import { eventBus } from '@shared/events/eventBus';

await eventBus.publish('OrderCreated', {
  orderId: 'ord_01J...',
  userId: 'usr_01J...',
  total: { amount: 50000, currency: 'TZS' }
} satisfies OrderCreatedPayload);

// Subscribing with type safety
import { PaymentSucceededPayload } from '@shared-contracts/payment-service-contracts';

await eventBus.subscribe<PaymentSucceededPayload>('PaymentSucceeded', {
  name: 'order-service:handle-payment-succeeded',
  handler: async (envelope) => {
    const { orderId, amount } = envelope.data!;
  }
});
```

## Adding a New Contract

1. Create `shared-contracts/{service-name}-contracts.ts`
2. Export typed payload interfaces for each event the service publishes
3. Add corresponding test file `{service-name}-contracts.test.ts`
4. Import and use in both the publishing and subscribing services
5. Register the event in `events/CATALOG.md`

## Relationship to `events/`

`shared-contracts/events/index.ts` re-exports from the canonical `events/` module (schema registry, validation). The contracts files in this directory add TypeScript-level type safety on top of the runtime schema validation in `events/`.
