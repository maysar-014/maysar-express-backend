# Implementation Tasks — Wallet Auto-Creation on Register

## Tasks

- [x] 1. Create `UserRegisteredHandler` class
  - [x] 1.1 Create `services/wallet-service/src/infrastructure/messaging/user-registered.handler.ts`
  - [x] 1.2 Implement `handle(envelope: EventEnvelope): Promise<void>` with payload validation, idempotency, wallet existence check, wallet creation, and error swallowing
  - [x] 1.3 Create `services/wallet-service/src/infrastructure/messaging/user-registered.handler.test.ts` with tests for: new user wallet creation, idempotent duplicate event, missing userId payload

- [x] 2. Wire handler into container
  - [x] 2.1 Import `UserRegisteredHandler` in `services/wallet-service/src/container.ts`
  - [x] 2.2 Instantiate `UserRegisteredHandler` with `walletRepository` and `eventIdempotency`
  - [x] 2.3 Subscribe to `'UserRegistered.v1'` on `this.eventBus`

- [x] 3. Verify fix
  - [x] 3.1 Run the new handler unit tests — all pass
  - [x] 3.2 Run existing wallet service tests — no regressions
  - [x] 3.3 Confirm `container.ts` compiles without TypeScript errors
