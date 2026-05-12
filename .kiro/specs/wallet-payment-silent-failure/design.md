# Wallet Payment Silent Failure — Bugfix Design

## Overview

A WALLET order placed via `POST /orders` returns HTTP 201 and a success payload, yet the buyer's wallet is never debited. Three compounding defects conspire to produce this silent-success outcome:

1. **String-casing mismatch** — the `Payment.Command.v1` bridge in `src/main.ts` compared `paymentMethod` against lowercase `'wallet'` while the domain stores it as uppercase `'WALLET'`, routing WALLET orders to `PaymentMethod.CARD`.
2. **Warn-and-continue stubs** — `PlaceOrderUseCase` and `PaymentSaga.processWalletPayment` silently returned success when `walletClient` was absent, instead of throwing.
3. **Fire-and-forget command bus** — `OrderFulfillmentSaga` published `Payment.Command.v1` in monolith mode with no registered consumer, and the standalone bridge published `Payment.Success.v1` immediately after `paymentSaga.start()` without awaiting actual saga completion.

The fix strategy is:
- Normalise `paymentMethod` to uppercase before any comparison in both `src/main.ts` and `index.ts` bridges.
- Convert the warn-and-continue stubs in `PlaceOrderUseCase` and `PaymentSaga` into hard throws.
- Register a `Payment.Command.v1` consumer in `OrderModule.initialize` (monolith mode) so the command is never silently dropped.
- Ensure `Payment.Success.v1` is only published after the payment saga steps have actually completed (or propagate the error as `Payment.Failure.v1`).

---

## Glossary

- **Bug_Condition (C)**: The set of inputs that trigger the silent-success failure — specifically, any `PlaceOrderRequest` where `paymentMethod === 'WALLET'` under the defective code paths described above.
- **Property (P)**: The desired post-fix behaviour — the buyer's wallet balance is debited by the order total, a real `transactionId` is recorded, and the order is persisted only after a successful debit.
- **Preservation**: All non-WALLET payment flows (COD, CARD, MOBILE_PAYMENT), successful WALLET orders, failed WALLET orders, saga orchestration, outbox processing, and event idempotency must continue to work exactly as before.
- **PlaceOrderUseCase**: `services/order-service/src/application/use-cases/place-order.use-case.ts` — orchestrates order creation; debits the wallet synchronously for WALLET orders before persisting the order.
- **PaymentSaga**: `services/order-service/src/application/sagas/payment.saga.ts` — distributed saga that handles fraud-check and payment-processing steps; routes to `processWalletPayment` or `processPesapalPayment` based on `payment.method`.
- **OrderFulfillmentSaga**: `services/order-service/src/application/sagas/order-fulfillment.saga.ts` — top-level saga that publishes `Payment.Command.v1` as part of the Payment step.
- **Payment.Command.v1 bridge**: The `eventBus.subscribe('Payment.Command.v1', ...)` handler in `src/main.ts` (standalone) and `index.ts` (monolith) that translates the command into a `PaymentSaga.start()` call.
- **paymentMethodRaw**: The normalised uppercase string derived from `order.paymentMethod` used for routing decisions inside the bridge.
- **walletClient**: An instance of `WalletServiceClient` injected into `PlaceOrderUseCase` and `PaymentSaga`; its absence must now be a hard error for WALLET orders.

---

## Bug Details

### Bug Condition

The bug manifests when a buyer places an order with `paymentMethod: 'WALLET'`. The defective code paths are:

- The `Payment.Command.v1` bridge in `src/main.ts` compared `paymentMethod` against lowercase `'wallet'` (strict equality), so `'WALLET'` fell through to `PaymentMethod.CARD`.
- `PlaceOrderUseCase` logged a warning and continued when `walletClient` was absent, saving the order without debiting.
- `PaymentSaga.processWalletPayment` returned `{ success: true, transactionId: 'WLT_STUB_...' }` when `walletClient` was absent.
- In monolith mode (`index.ts`), no consumer was registered for `Payment.Command.v1`, so the command was silently dropped.
- In standalone mode (`src/main.ts`), `Payment.Success.v1` was published immediately after `paymentSaga.start()` without awaiting saga step completion.

**Formal Specification:**
```
FUNCTION isBugCondition(request)
  INPUT: request of type PlaceOrderRequest
  OUTPUT: boolean

  RETURN request.paymentMethod.toUpperCase() === 'WALLET'
         AND (
               walletClientMissing(placeOrderUseCase)
               OR walletClientMissing(paymentSaga)
               OR paymentCommandConsumerMissing(deploymentMode)
               OR bridgePublishesSuccessBeforeCompletion(deploymentMode)
               OR bridgeComparesLowercaseWallet(deploymentMode)
             )
END FUNCTION
```

### Examples

- **Casing mismatch (standalone)**: `paymentMethod: 'WALLET'` → bridge evaluates `'WALLET' === 'wallet'` → `false` → routes to `PaymentMethod.CARD` → `processPesapalPayment` called → wallet never debited, HTTP 201 returned.
- **Missing walletClient (PlaceOrderUseCase)**: `paymentMethod: 'WALLET'`, `walletClient` not injected → use-case logs warning, saves order, returns 201 — no debit, no error.
- **Missing walletClient (PaymentSaga)**: `processWalletPayment` called with no `walletClient` → returns `{ success: true, transactionId: 'WLT_STUB_abc123' }` — fabricated success, no real debit.
- **No consumer (monolith)**: `OrderFulfillmentSaga` publishes `Payment.Command.v1` → no subscriber in `index.ts` → event silently dropped → Payment step never executes → saga may stall or time out.
- **Fire-and-forget (standalone)**: `paymentSaga.start()` called → `Payment.Success.v1` published immediately → `OrderFulfillmentSaga` advances Payment step before wallet debit completes.

---

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- COD orders must continue to pass eligibility checks, secure the commitment fee, and complete the saga without any wallet debit.
- CARD and MOBILE_PAYMENT orders must continue to route through `processPesapalPayment` via `PesapalAdapter`.
- Successful WALLET orders (where `walletClient.debitWallet` succeeds) must continue to return HTTP 201 with `orderId`, `trackingNumber`, `deliveryCode`, and `status`.
- Failed WALLET orders (insufficient funds, service unavailable) must continue to return an error response and must NOT persist the order as successfully paid.
- `OrderFulfillmentSaga` step progression (StockReservation → Payment → Delivery) must remain unchanged for all payment methods.
- Outbox processor, saga recovery worker, and event idempotency mechanisms must continue to function correctly.

**Scope:**
All inputs where `paymentMethod !== 'WALLET'` (or where `paymentMethod === 'WALLET'` and `walletClient.debitWallet` succeeds) must be completely unaffected by this fix. This includes:
- Mouse clicks / API calls for COD, CARD, MOBILE_PAYMENT orders.
- Saga compensation flows (StockRelease, PaymentRefund).
- Outbox retry and dead-letter handling.

**Note:** The actual expected correct behaviour for WALLET orders is defined in the Correctness Properties section (Property 1). This section focuses on what must NOT change.

---

## Hypothesized Root Cause

Based on the bug description and code inspection, the root causes are confirmed:

1. **Strict lowercase comparison in `src/main.ts` bridge** (`lines 197–213`):
   The original bridge used `String((order as any).paymentMethod ?? '') === 'wallet'` (strict equality, lowercase). Since `order.paymentMethod` is stored as `'WALLET'` (uppercase), this always evaluated to `false`, routing every WALLET order to `PaymentMethod.CARD`.
   - The fix in `src/main.ts` already uses `.toUpperCase()` — this root cause is resolved in the current codebase but must be verified and locked in by tests.

2. **Warn-and-continue in `PlaceOrderUseCase`** (`lines 117–119`):
   The original code checked `if (!this.walletClient)` and logged a warning before continuing. The current code already throws — but the stub behaviour must be confirmed absent and covered by tests.

3. **Stub success in `PaymentSaga.processWalletPayment`** (`lines 121–128`):
   The original code returned `{ success: true, transactionId: 'WLT_STUB_...' }` when `walletClient` was absent. The current code already throws — same as above.

4. **No `Payment.Command.v1` consumer in monolith mode** (`index.ts lines 30–52`):
   `OrderModule.initialize` did not register a subscriber for `Payment.Command.v1`. The current `index.ts` already includes the bridge — but it must be verified and covered by tests.

5. **Fire-and-forget `Payment.Success.v1` in standalone bridge** (`src/main.ts lines 197–213`):
   The bridge called `paymentSaga.start()` and immediately published `Payment.Success.v1` without awaiting saga step completion. The current `src/main.ts` still exhibits this pattern — `paymentSaga.start()` is async but the saga steps are event-driven, so `await paymentSaga.start()` does not guarantee step completion. The fix must ensure `Payment.Success.v1` is only published after the saga's `ProcessPayment` step has actually completed (or propagate `Payment.Failure.v1` on error).

---

## Correctness Properties

Property 1: Bug Condition — WALLET Order Debits Buyer Wallet

_For any_ `PlaceOrderRequest` where `paymentMethod === 'WALLET'` and `walletClient` is properly injected, the fixed system SHALL call `walletClient.debitWallet` exactly once with the correct `buyerId`, `totalAmount`, and `currency`, record a real `transactionId`, persist the order, and return HTTP 201 — and SHALL NOT return 201 without a successful debit.

**Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 2.6**

Property 2: Preservation — Non-WALLET Payment Flows Unchanged

_For any_ `PlaceOrderRequest` where `paymentMethod !== 'WALLET'` (COD, CARD, MOBILE_PAYMENT), the fixed system SHALL produce exactly the same observable behaviour as the original system — same HTTP status codes, same saga step progression, same payment routing — with no wallet debit occurring.

**Validates: Requirements 3.1, 3.2, 3.5, 3.6**

---

## Fix Implementation

### Changes Required

Assuming our root cause analysis is correct (confirmed by code inspection):

**File 1**: `services/order-service/src/main.ts` (lines 197–213)

**Function**: `Payment.Command.v1` event handler (inside `initializeService`)

**Specific Changes**:
1. **Normalise `paymentMethod` before comparison**: Replace any remaining lowercase `'wallet'` comparison with `.toUpperCase() === 'WALLET'` (already done in current code — verify and add regression test).
2. **Await saga completion before publishing success**: After `await paymentSaga.start(payment.id, { payment })`, do NOT publish `Payment.Success.v1` immediately. Instead, the `PaymentSaga` itself should publish `Payment.Success.v1` (or `Payment.Failure.v1`) upon step completion. Alternatively, restructure the bridge so it awaits a promise that resolves only after `ProcessPayment` step completes. The safest approach: move the `Payment.Success.v1` publish into the `PaymentSaga`'s `ProcessPayment` step completion handler, or use a local promise that the saga resolves.

**File 2**: `services/order-service/src/application/use-cases/place-order.use-case.ts` (lines 117–119)

**Function**: `PlaceOrderUseCase.execute`

**Specific Changes**:
3. **Hard throw on missing walletClient**: Confirm the guard `if (!this.walletClient) { throw new Error('WALLET payment method requires WalletServiceClient — dependency not injected'); }` is present and not bypassed. Add test coverage.

**File 3**: `services/order-service/src/application/sagas/payment.saga.ts` (lines 121–128)

**Function**: `PaymentSaga.processWalletPayment`

**Specific Changes**:
4. **Hard throw on missing walletClient**: Confirm `if (!this.walletClient) { throw new Error('[PaymentSaga] WalletServiceClient not injected — cannot process WALLET payment'); }` is present. Add test coverage.

**File 4**: `services/order-service/index.ts` (lines 30–52)

**Function**: `OrderModule.initialize`

**Specific Changes**:
5. **Register `Payment.Command.v1` consumer**: Confirm the `eventBus.subscribe('Payment.Command.v1', ...)` bridge is present in `OrderModule.initialize`. The current `index.ts` already includes this bridge with `.toUpperCase()` normalisation and a WALLET fast-path (acknowledges success because `PlaceOrderUseCase` already debited synchronously). Verify this logic is correct and add test coverage.

---

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate the bug on unfixed code (or on a deliberately broken version), then verify the fix works correctly and preserves existing behaviour.

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate the bug BEFORE the fix is confirmed. Confirm or refute the root cause analysis. If we refute, we will need to re-hypothesize.

**Test Plan**: Write unit tests that exercise each defective code path in isolation. Run these tests against the current code to confirm the fixes are in place, and against a deliberately reverted version to confirm the tests catch the bugs.

**Test Cases**:
1. **Casing mismatch test**: Construct a `Payment.Command.v1` envelope where `order.paymentMethod === 'WALLET'` (uppercase). Assert that `walletClient.debitWallet` is called (will fail if bridge uses lowercase comparison). *(will fail on unfixed code)*
2. **Missing walletClient in PlaceOrderUseCase**: Call `PlaceOrderUseCase.execute` with `paymentMethod: 'WALLET'` and no `walletClient` injected. Assert that an error is thrown and the order is NOT saved. *(will fail on warn-and-continue stub)*
3. **Missing walletClient in PaymentSaga**: Call `PaymentSaga` with `payment.method === PaymentMethod.WALLET` and no `walletClient`. Assert that `processWalletPayment` throws instead of returning a stub success. *(will fail on stub-success code)*
4. **No consumer in monolith mode**: Publish `Payment.Command.v1` on the event bus without registering a consumer. Assert that the event is handled (i.e., a consumer exists). *(will fail if consumer is absent)*
5. **Fire-and-forget success**: Simulate `paymentSaga.start()` that takes time to complete. Assert that `Payment.Success.v1` is NOT published before the saga's `ProcessPayment` step completes. *(will fail on fire-and-forget bridge)*

**Expected Counterexamples**:
- `walletClient.debitWallet` is never called when `paymentMethod === 'WALLET'` (casing mismatch).
- Order is saved and 201 returned even when `walletClient` is absent (warn-and-continue).
- `processWalletPayment` returns `{ success: true, transactionId: 'WLT_STUB_...' }` when `walletClient` is absent.
- `Payment.Command.v1` is published but no handler is invoked in monolith mode.
- `Payment.Success.v1` is published before wallet debit completes.

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds, the fixed system produces the expected behaviour.

**Pseudocode:**
```
FOR ALL request WHERE isBugCondition(request) DO
  result := placeOrder_fixed(request)
  ASSERT walletClient.debitWallet WAS CALLED with (request.buyerId, totalAmount, currency)
  ASSERT result.status === 201
  ASSERT order IS PERSISTED with real transactionId
  ASSERT Payment.Success.v1 IS PUBLISHED only after debit succeeds
END FOR
```

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold, the fixed system produces the same result as the original system.

**Pseudocode:**
```
FOR ALL request WHERE NOT isBugCondition(request) DO
  ASSERT placeOrder_original(request) BEHAVIOUR === placeOrder_fixed(request) BEHAVIOUR
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:
- It generates many test cases automatically across the input domain (random payment methods, amounts, buyer IDs).
- It catches edge cases that manual unit tests might miss (e.g., unusual currency codes, zero-item orders).
- It provides strong guarantees that behaviour is unchanged for all non-buggy inputs.

**Test Plan**: Observe behaviour on the current (fixed) code for COD, CARD, and MOBILE_PAYMENT orders, then write property-based tests capturing that behaviour to guard against regressions.

**Test Cases**:
1. **COD Preservation**: Verify COD orders continue to pass eligibility checks, secure commitment fee, and complete saga without wallet debit — across many random buyer/seller/item combinations.
2. **CARD/MOBILE_PAYMENT Preservation**: Verify these orders continue to route to `processPesapalPayment` and never call `walletClient.debitWallet`.
3. **Successful WALLET Preservation**: Verify that when `walletClient.debitWallet` succeeds, the order is persisted and HTTP 201 is returned — same as before the fix.
4. **Failed WALLET Preservation**: Verify that when `walletClient.debitWallet` throws (insufficient funds, service error), the order is NOT persisted and an error response is returned.
5. **Saga Step Preservation**: Verify that `OrderFulfillmentSaga` step progression (StockReservation → Payment → Delivery) is unchanged for all payment methods.

### Unit Tests

- Test `PlaceOrderUseCase.execute` with `paymentMethod: 'WALLET'` and `walletClient` present — assert debit called, order saved, 201 returned.
- Test `PlaceOrderUseCase.execute` with `paymentMethod: 'WALLET'` and `walletClient` absent — assert error thrown, order NOT saved.
- Test `PaymentSaga.processWalletPayment` with `walletClient` present — assert `debitWallet` called, real `transactionId` returned.
- Test `PaymentSaga.processWalletPayment` with `walletClient` absent — assert error thrown (not stub success).
- Test `Payment.Command.v1` bridge with `order.paymentMethod === 'WALLET'` (uppercase) — assert `walletClient.debitWallet` called (not `processPesapalPayment`).
- Test `Payment.Command.v1` bridge with `order.paymentMethod === 'CARD'` — assert `processPesapalPayment` called, `debitWallet` NOT called.
- Test `OrderModule.initialize` registers a `Payment.Command.v1` subscriber.

### Property-Based Tests

- Generate random `PlaceOrderRequest` objects with `paymentMethod: 'WALLET'` and varying amounts/currencies — assert `debitWallet` is always called with the correct amount.
- Generate random `PlaceOrderRequest` objects with `paymentMethod` in `['COD', 'CARD', 'MOBILE_PAYMENT']` — assert `debitWallet` is NEVER called.
- Generate random `Payment` objects with `method !== PaymentMethod.WALLET` — assert `PaymentSaga` never calls `walletClient.debitWallet`.
- Generate random `Payment` objects with `method === PaymentMethod.WALLET` and a mock `walletClient` — assert `debitWallet` is always called exactly once.

### Integration Tests

- Full order placement flow with `paymentMethod: 'WALLET'` — assert HTTP 201, wallet debited, order persisted with real `transactionId`.
- Full order placement flow with `paymentMethod: 'COD'` — assert HTTP 201, no wallet debit, COD commitment fee secured.
- Full order placement flow with `paymentMethod: 'CARD'` — assert HTTP 201, `processPesapalPayment` called, no wallet debit.
- WALLET order where `walletClient.debitWallet` throws — assert HTTP 4xx/5xx, order NOT persisted.
- Saga step progression for WALLET order — assert `Payment.Success.v1` published only after debit completes, `OrderFulfillmentSaga` advances to Delivery step.
