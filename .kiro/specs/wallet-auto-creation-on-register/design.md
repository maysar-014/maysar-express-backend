# Design Document — Wallet Auto-Creation on Register

## Overview

The wallet service is missing a subscriber for the `UserRegistered.v1` event that the auth service publishes after every successful registration. The fix adds a `UserRegisteredHandler` class in the wallet service's infrastructure messaging layer and wires it into the container's event bus subscriptions.

No new tables, no schema changes, no new use cases. The fix is entirely in the infrastructure layer of the wallet service.

---

## Architecture

### Event Flow (Current — Broken)

```
RegisterUserUseCase
  └── eventBus.publish('UserRegistered.v1', { userId, email, role, ... })
        └── [no subscriber in wallet-service] → event dropped silently
```

### Event Flow (Fixed)

```
RegisterUserUseCase
  └── eventBus.publish('UserRegistered.v1', { userId, email, role, ... })
        └── UserRegisteredHandler.handle(envelope)
              └── walletRepository.findByUserId(userId)  → null (new user)
              └── new Wallet({ userId, balance: 0, status: ACTIVE, currency: 'TZS', ... })
              └── walletRepository.save(wallet)
```

---

## Components

### 1. `UserRegisteredHandler` (new file)

**Location**: `services/wallet-service/src/infrastructure/messaging/user-registered.handler.ts`

**Responsibility**: Consume `UserRegistered.v1` events and create a wallet for the new user.

**Dependencies**:
- `IWalletRepository` — to check for existing wallet and persist the new one
- `EventIdempotency` — to prevent duplicate wallet creation on repeated event delivery

**Algorithm**:
```
handle(envelope):
  1. Extract userId from envelope.data
  2. If userId is missing or not a string → log warning and return (invalid payload)
  3. withIdempotency(envelope.eventId, 'UserRegisteredHandler', async () => {
       4. wallet = walletRepository.findByUserId(userId)
       5. If wallet exists → log "wallet already exists, skipping" and return
       6. Create new Wallet entity:
            id: makeId(getModelPrefix('Wallet_Wallet'))
            userId: userId
            balance: 0
            currency: 'TZS'
            status: WalletStatus.ACTIVE
            frozenAmount: 0
            codCommitmentLimit: 0
            codCommitmentUsed: 0
            codCommitmentCount: 0
            version: 0
            createdAt: new Date()
            updatedAt: new Date()
       7. walletRepository.save(wallet)
       8. Log success: "[UserRegisteredHandler] Wallet created for user {userId}"
     })
  9. On any error inside the idempotency block → log error, do NOT rethrow
     (prevents event bus from crashing on a single bad event)
```

**Idempotency strategy**: Two-layer protection:
- Outer: `EventIdempotency.withIdempotency` keyed on `envelope.eventId` — prevents re-processing the same event delivery
- Inner: `walletRepository.findByUserId` check — handles the case where idempotency record was lost but wallet was already created

---

### 2. Container wiring (modification)

**Location**: `services/wallet-service/src/container.ts`

After the existing `paymentCompletedHandler` subscription, add:

```typescript
const userRegisteredHandler = new UserRegisteredHandler(walletRepository, eventIdempotency);
this.eventBus.subscribe('UserRegistered.v1', {
  name: 'wallet-user-registered-handler',
  handler: userRegisteredHandler.handle.bind(userRegisteredHandler)
});
```

---

## Event Payload Contract

The `UserRegistered.v1` event published by `RegisterUserUseCase`:

```typescript
{
  eventId: string,          // UUID — used as idempotency key
  eventType: 'UserRegistered.v1',
  data: {
    userId: string,         // The new user's ID — required for wallet creation
    publicCode: string,
    email: string,
    role: string,
    profile: object
  },
  timestamp: Date
}
```

Only `userId` is required by the handler. All other fields are ignored.

---

## Wallet Initial State

| Field | Value | Reason |
|-------|-------|--------|
| `balance` | `0` | New wallet starts empty |
| `currency` | `'TZS'` | Tanzania-only marketplace |
| `status` | `ACTIVE` | Immediately usable |
| `frozenAmount` | `0` | Nothing frozen yet |
| `codCommitmentLimit` | `0` | No COD commitment until trust score grows |
| `codCommitmentUsed` | `0` | Nothing used |
| `codCommitmentCount` | `0` | No COD orders yet |
| `version` | `0` | Optimistic lock starts at 0 |

---

## Error Handling

| Scenario | Behaviour |
|----------|-----------|
| `userId` missing from payload | Log warning, return without throwing |
| Wallet already exists for `userId` | Log info, return without throwing (idempotent) |
| `walletRepository.save` throws | Log error, swallow — prevents event bus crash |
| Duplicate event delivery | `EventIdempotency` prevents double-processing |

Errors are swallowed (not rethrown) to match the pattern established by `PaymentCompletedHandler`. A single bad event must not crash the event bus or block other handlers.

---

## Regression Safety

The fix touches only two things:
1. A new file `user-registered.handler.ts` — no existing code modified
2. Two new lines in `container.ts` — instantiation and subscription

All existing subscriptions (`Payment.Success.v1`, `WalletTransaction.Command.v1`, `PaymentInitiated`, `SettleCODPayment`) are unchanged. The `CreditWalletUseCase` already has its own "find or create" fallback, which remains as a safety net but is no longer the primary wallet creation path for new registrations.

---

## Property-Based Correctness

**Fix checking property**: For all `UserRegistered.v1` events where no wallet exists for `userId`, after `handle()` completes, `walletRepository.findByUserId(userId)` returns a wallet with `status=ACTIVE`, `balance=0`, `currency='TZS'`.

**Preservation property**: For all other event types (`Payment.Success.v1`, `WalletTransaction.Command.v1`, `PaymentInitiated`, `SettleCODPayment`), their handlers behave identically before and after this change.

**Idempotence property**: Calling `handle()` twice with the same `envelope.eventId` for the same `userId` results in exactly one wallet record.
