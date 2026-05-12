# Bugfix Requirements Document

## Introduction

When a buyer places an order with `paymentMethod: 'WALLET'`, the system returns HTTP 201 and reports "succeeded with payment method WALLET", but the buyer's wallet balance is never debited. The order is persisted as if payment succeeded, yet no debit transaction is recorded and the wallet ledger is untouched.

Three compounding root causes produce this silent-success failure:

1. **String-casing mismatch** — the `Payment.Command.v1` bridge in `src/main.ts` compared `paymentMethod` against lowercase `'wallet'` while the domain stores it as uppercase `'WALLET'`, causing WALLET orders to fall through to `PaymentMethod.CARD`.
2. **Warn-and-continue stubs** — both `PlaceOrderUseCase` and `PaymentSaga.processWalletPayment` silently returned success when `walletClient` was not injected, instead of throwing.
3. **Fire-and-forget command bus** — `OrderFulfillmentSaga` published `Payment.Command.v1` into the event bus without a registered consumer in monolith mode, and the standalone bridge published `Payment.Success.v1` immediately after `paymentSaga.start()` without awaiting actual saga step completion.

The combined effect is that a WALLET order completes the full HTTP request/response cycle with a 201 status and a success payload, while zero funds are moved.

---

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN an order is placed with `paymentMethod: 'WALLET'` (uppercase, as typed in `PlaceOrderRequest`) THEN the `Payment.Command.v1` bridge compares it against lowercase `'wallet'`, evaluates to `false`, and assigns `PaymentMethod.CARD` instead of `PaymentMethod.WALLET`

1.2 WHEN `paymentMethod` is mapped to `PaymentMethod.CARD` due to the casing mismatch THEN `PaymentSaga.defineSteps()` dispatches to `processPesapalPayment` instead of `processWalletPayment`, so the wallet is never debited

1.3 WHEN `walletClient` is not injected into `PlaceOrderUseCase` and `paymentMethod` is `'WALLET'` THEN the use-case logs a warning and continues to save the order and return 201, without throwing an error or rejecting the request

1.4 WHEN `walletClient` is not injected into `PaymentSaga` and `processWalletPayment` is called THEN the saga returns `{ success: true, transactionId: 'WLT_STUB_...' }` — a fabricated success — without performing any real debit

1.5 WHEN `OrderFulfillmentSaga` publishes `Payment.Command.v1` in monolith mode (via `OrderModule.initialize`) THEN no consumer is registered for that event, so the command is silently dropped and the payment step never executes

1.6 WHEN the standalone `src/main.ts` bridge handles `Payment.Command.v1` THEN it publishes `Payment.Success.v1` immediately after calling `paymentSaga.start()`, without waiting for the saga's internal steps to complete, causing a false success acknowledgement

### Expected Behavior (Correct)

2.1 WHEN an order is placed with `paymentMethod: 'WALLET'` THEN the payment method mapping SHALL use a case-insensitive comparison (or normalise to uppercase before comparing) so that `'WALLET'` is correctly resolved to `PaymentMethod.WALLET`

2.2 WHEN `paymentMethod` is correctly resolved to `PaymentMethod.WALLET` THEN `PaymentSaga.defineSteps()` SHALL dispatch to `processWalletPayment`, which calls `walletClient.debitWallet` and records a real transaction ID

2.3 WHEN `walletClient` is not injected into `PlaceOrderUseCase` and `paymentMethod` is `'WALLET'` THEN the use-case SHALL throw an error (e.g. `'WALLET payment method requires WalletServiceClient — dependency not injected'`) and SHALL NOT save the order or return 201

2.4 WHEN `walletClient` is not injected into `PaymentSaga` and `processWalletPayment` is called THEN the saga SHALL throw an error instead of returning a stub success, so the failure propagates and the order is not marked as paid

2.5 WHEN `OrderFulfillmentSaga` publishes `Payment.Command.v1` THEN a registered consumer SHALL handle the command in all deployment modes (both monolith via `OrderModule` and standalone via `src/main.ts`), ensuring the payment step is never silently dropped

2.6 WHEN the `Payment.Command.v1` bridge completes processing THEN it SHALL only publish `Payment.Success.v1` after the wallet debit (or other payment processing) has actually succeeded, not before or unconditionally

### Unchanged Behavior (Regression Prevention)

3.1 WHEN an order is placed with `paymentMethod: 'COD'` THEN the system SHALL CONTINUE TO process the order through COD eligibility checks, commitment fee logic, and saga orchestration without any wallet debit

3.2 WHEN an order is placed with `paymentMethod: 'CARD'` or `paymentMethod: 'MOBILE_PAYMENT'` THEN the system SHALL CONTINUE TO route payment processing through `processPesapalPayment` via the `PesapalAdapter`

3.3 WHEN a WALLET order is placed and `walletClient.debitWallet` succeeds THEN the system SHALL CONTINUE TO return HTTP 201 with the order ID, tracking number, delivery code, and status

3.4 WHEN a WALLET order is placed and `walletClient.debitWallet` fails (e.g. insufficient funds, service unavailable) THEN the system SHALL CONTINUE TO return an error response and SHALL NOT persist the order as successfully paid

3.5 WHEN `OrderFulfillmentSaga` advances through StockReservation, Payment, and Delivery steps for non-WALLET orders THEN the system SHALL CONTINUE TO publish and handle the corresponding success/failure events without regression

3.6 WHEN the outbox processor, saga recovery worker, and event idempotency mechanisms are in operation THEN they SHALL CONTINUE TO function correctly for all payment methods after the fix is applied
