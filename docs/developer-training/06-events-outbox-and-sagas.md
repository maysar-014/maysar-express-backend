# Events, Outbox, And Sagas

This system leans heavily on event-driven behavior.

## EventBus

The EventBus lets one module react to something another module did.

Examples:

- order completed
- wallet transaction completed
- listing created
- KYC level required

## Why Events Are Useful

- They decouple modules
- They make cross-module workflows extensible
- They reduce direct HTTP chatter between domains

## Example: KYC Subscriber

When an order or wallet event arrives, the KYC subscriber can:

1. identify the user
2. aggregate data across tables
3. evaluate whether a new KYC level is required
4. emit a `kyc.level_required` event
5. create a notification

That is a classic event-reactive workflow.

## Outbox Pattern

The outbox pattern protects against lost events.

The basic idea:

1. Write your business data
2. Write the event record in the same transaction
3. A background processor publishes the event later

That means "database updated but event lost" becomes much less likely.

## Saga Pattern

A saga is a multi-step business process with failures and compensations.

Example order flow:

1. reserve stock
2. process payment
3. confirm fulfillment
4. recover if one step fails

## Useful Questions

When you add an event, ask:

- Is it a domain fact or just a technical notification?
- Should it be synchronous or asynchronous?
- Does it need deduplication?
- Does it need a retry path?

## Example Event

```ts
await eventBus.publish('kyc.status_changed', {
  userId,
  status: 'verified',
  kycLevel: 1
});
```

That event can trigger notifications, analytics, or downstream policy updates.

## Exercise

Trace one event from its publisher to its consumer.

Try with:

- order events
- wallet events
- KYC events
