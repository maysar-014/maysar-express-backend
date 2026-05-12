# Implementation Plan

- [x] 1. Write bug condition exploration test
  - **Property 1: Bug Condition** - WALLET Order Silent Debit Failure
  - **CRITICAL**: This test MUST FAIL on unfixed code — failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior — it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate each of the three root causes
  - **Scoped PBT Approach**: For deterministic bugs, scope the property to the concrete failing cases to ensure reproducibility
  - Write the following scoped property-based tests in `services/order-service/src/__tests__/wallet-payment-bug-condition.test.ts`:
    - **Sub-test A — Casing mismatch**: Construct a `Payment.Command.v1` envelope where `order.paymentMethod === 'WALLET'` (uppercase). Assert that `walletClient.debitWallet` is called. On unfixed code the bridge evaluates `'WALLET' === 'wallet'` → `false` → routes to `PaymentMethod.CARD` → debit never called.
    - **Sub-test B — Warn-and-continue in PlaceOrderUseCase**: Call `PlaceOrderUseCase.execute` with `paymentMethod: 'WALLET'` and `walletClient` not injected. Assert that an error is thrown and `orderRepository.save` is NOT called. On unfixed code the use-case logs a warning and saves the order.
    - **Sub-test C — Stub success in PaymentSaga**: Instantiate `PaymentSaga` without a `walletClient`. Call `processWalletPayment` (via `start`) with `payment.method === PaymentMethod.WALLET`. Assert that the saga throws instead of returning `{ success: true, transactionId: 'WLT_STUB_...' }`.
    - **Sub-test D — No consumer in monolith mode**: Publish `Payment.Command.v1` on the event bus without registering a consumer. Assert that a handler is invoked (i.e., a subscriber exists). On unfixed code the event is silently dropped.
    - **Sub-test E — Fire-and-forget success**: Simulate `paymentSaga.start()` that takes time to complete. Assert that `Payment.Success.v1` is NOT published before the saga's `ProcessPayment` step completes.
  - Use property-based testing (e.g., `fast-check`) to generate random `buyerId`, `amount`, and `currency` values for sub-tests A, B, and C to confirm the bug is not input-specific
  - Run tests on UNFIXED code (or a deliberately reverted version)
  - **EXPECTED OUTCOME**: Tests FAIL (this is correct — it proves the bugs exist)
  - Document counterexamples found (e.g., `debitWallet` never called for any `buyerId`/`amount` combination)
  - Mark task complete when tests are written, run, and failures are documented
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_

- [x] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Non-WALLET Payment Flows Unchanged
  - **IMPORTANT**: Follow observation-first methodology
  - Observe behavior on UNFIXED code for non-WALLET inputs (cases where `isBugCondition` returns false)
  - Write property-based tests in `services/order-service/src/__tests__/wallet-payment-preservation.test.ts`:
    - **Preservation A — COD orders**: For all random `buyerId`/`sellerId`/`items` combinations with `paymentMethod: 'COD'`, assert that `walletClient.debitWallet` is NEVER called, COD eligibility checks run, and commitment fee is secured
    - **Preservation B — CARD and MOBILE_PAYMENT orders**: For all random inputs with `paymentMethod` in `['CARD', 'MOBILE_PAYMENT']`, assert that `processPesapalPayment` is called and `walletClient.debitWallet` is NEVER called
    - **Preservation C — Successful WALLET order (walletClient present)**: For all random `buyerId`/`amount`/`currency` combinations with `paymentMethod: 'WALLET'` and a mock `walletClient` that succeeds, assert HTTP 201 is returned, `debitWallet` is called exactly once, and the order is persisted
    - **Preservation D — Failed WALLET order (walletClient throws)**: For all random inputs with `paymentMethod: 'WALLET'` and a mock `walletClient` that throws (insufficient funds), assert that an error response is returned and the order is NOT persisted
    - **Preservation E — Saga step progression**: Assert that `OrderFulfillmentSaga` step order (StockReservation → Payment → Delivery) is unchanged for COD, CARD, and MOBILE_PAYMENT orders
  - Verify all preservation tests PASS on UNFIXED code (confirms baseline behavior to preserve)
  - **EXPECTED OUTCOME**: Tests PASS (this confirms baseline behavior)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

- [x] 3. Fix for WALLET payment silent failure (three root causes)

  - [x] 3.1 Verify and lock in case-insensitive `paymentMethod` normalisation in `src/main.ts`
    - In `services/order-service/src/main.ts` (lines 197–213), confirm the `Payment.Command.v1` bridge uses `.toUpperCase()` before comparing `paymentMethod` — the current code already does this, but add a regression test to lock it in
    - Ensure the normalisation reads: `String((order as any).paymentMethod ?? '').toUpperCase() === 'WALLET'`
    - Confirm the same `.toUpperCase()` normalisation is present in `services/order-service/index.ts` (monolith bridge) — already present, verify and add test coverage
    - _Bug_Condition: `isBugCondition(request)` where `request.paymentMethod.toUpperCase() === 'WALLET'` AND bridge compares lowercase `'wallet'`_
    - _Expected_Behavior: `paymentMethodRaw === 'WALLET'` routes to `PaymentMethod.WALLET` and triggers `processWalletPayment`_
    - _Preservation: CARD and MOBILE_PAYMENT routing to `processPesapalPayment` must be unaffected_
    - _Requirements: 2.1, 2.2_

  - [x] 3.2 Verify and lock in hard throw on missing `walletClient` in `PlaceOrderUseCase`
    - In `services/order-service/src/application/use-cases/place-order.use-case.ts` (lines 117–119), confirm the guard reads: `if (!this.walletClient) { throw new Error('WALLET payment method requires WalletServiceClient — dependency not injected'); }`
    - Confirm the guard is NOT bypassed by any warn-and-continue path
    - Confirm `orderRepository.save` is NOT called when the guard throws
    - _Bug_Condition: `walletClientMissing(placeOrderUseCase)` AND `request.paymentMethod === 'WALLET'`_
    - _Expected_Behavior: Error thrown before `orderRepository.save`; order NOT persisted; HTTP 4xx/5xx returned_
    - _Preservation: COD and CARD orders must not be affected by this guard (guard is inside `if (request.paymentMethod === 'WALLET')` block)_
    - _Requirements: 2.3_

  - [x] 3.3 Verify and lock in hard throw on missing `walletClient` in `PaymentSaga.processWalletPayment`
    - In `services/order-service/src/application/sagas/payment.saga.ts` (lines 121–128), confirm the guard reads: `if (!this.walletClient) { throw new Error('[PaymentSaga] WalletServiceClient not injected — cannot process WALLET payment'); }`
    - Confirm the stub `{ success: true, transactionId: 'WLT_STUB_...' }` return path is completely absent
    - _Bug_Condition: `walletClientMissing(paymentSaga)` AND `payment.method === PaymentMethod.WALLET`_
    - _Expected_Behavior: Error thrown; saga step fails; `Payment.Failure.v1` published; order NOT marked as paid_
    - _Preservation: `processPesapalPayment` path for CARD/MOBILE_MONEY must be unaffected_
    - _Requirements: 2.4_

  - [x] 3.4 Verify `Payment.Command.v1` consumer is registered in `OrderModule.initialize` (monolith mode)
    - In `services/order-service/index.ts` (lines 30–52), confirm `eventBus.subscribe('Payment.Command.v1', ...)` is present inside `OrderModule.initialize`
    - Confirm the WALLET fast-path in the monolith bridge correctly acknowledges success (since `PlaceOrderUseCase` already debited synchronously): `if (paymentMethodRaw === 'WALLET') { await eventBus.publish('Payment.Success.v1', ...); return; }`
    - Confirm the non-WALLET path runs `paymentSaga.start()` and publishes `Payment.Success.v1` only after it completes (or `Payment.Failure.v1` on error)
    - _Bug_Condition: `paymentCommandConsumerMissing(deploymentMode === 'monolith')`_
    - _Expected_Behavior: `Payment.Command.v1` is handled in all deployment modes; payment step never silently dropped_
    - _Preservation: Saga step progression for all payment methods must be unaffected_
    - _Requirements: 2.5_

  - [x] 3.5 Fix fire-and-forget `Payment.Success.v1` in standalone bridge (`src/main.ts`)
    - In `services/order-service/src/main.ts` (lines 197–213), the bridge currently calls `await paymentSaga.start(payment.id, { payment })` and then immediately publishes `Payment.Success.v1` — this is fire-and-forget because `paymentSaga.start()` is async but saga steps are event-driven
    - Move `Payment.Success.v1` publication into the `PaymentSaga`'s `ProcessPayment` step completion handler, OR restructure the bridge to await a promise that resolves only after the `ProcessPayment` step completes
    - Recommended approach: after `await paymentSaga.start(...)`, subscribe to a one-shot `PaymentSaga.{sagaId}.Completed` internal event, or refactor `PaymentSaga` to return a promise that resolves after all steps complete
    - Ensure `Payment.Failure.v1` is published (not swallowed) if `paymentSaga.start()` throws
    - _Bug_Condition: `bridgePublishesSuccessBeforeCompletion(deploymentMode === 'standalone')`_
    - _Expected_Behavior: `Payment.Success.v1` published ONLY after `ProcessPayment` step completes; `Payment.Failure.v1` published on error_
    - _Preservation: `OrderFulfillmentSaga` must still advance the Payment step correctly after the fix_
    - _Requirements: 2.6_

  - [x] 3.6 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - WALLET Order Debits Buyer Wallet
    - **IMPORTANT**: Re-run the SAME tests from task 1 — do NOT write new tests
    - The tests from task 1 encode the expected behavior
    - When these tests pass, it confirms the expected behavior is satisfied for all five sub-tests (A–E)
    - Run bug condition exploration tests from step 1
    - **EXPECTED OUTCOME**: All five sub-tests PASS (confirms all three root causes are fixed)
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

  - [x] 3.7 Verify preservation tests still pass
    - **Property 2: Preservation** - Non-WALLET Payment Flows Unchanged
    - **IMPORTANT**: Re-run the SAME tests from task 2 — do NOT write new tests
    - Run preservation property tests from step 2
    - **EXPECTED OUTCOME**: All preservation tests PASS (confirms no regressions for COD, CARD, MOBILE_PAYMENT, and successful/failed WALLET flows)
    - Confirm all tests still pass after fix (no regressions)

- [x] 4. Checkpoint — Ensure all tests pass
  - Run the full order-service test suite: `cd services/order-service && npx jest --testPathPattern="wallet-payment" --run` (or equivalent)
  - Confirm all five bug condition sub-tests (A–E) pass
  - Confirm all five preservation sub-tests (A–E) pass
  - Confirm no pre-existing tests have regressed
  - Ensure all tests pass; ask the user if questions arise
