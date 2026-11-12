# Alignment Backlog — every known issue, verifiable

**Purpose.** Single source of truth for what is *not yet* aligned between the documented flows, the API contract, and the running system — plus the guards that stop the same defect class recurring. Companion to [`defect-register.md`](./defect-register.md), which is the *resolved* history (DEF-001…DEF-036).

**Status legend.** `OPEN` not started · `PARTIAL` started, not verified end to end · `GUARDED` known gap with an automated guard that prevents it growing.

**How to keep this true.** Every item carries a command. Re-run the measurement block in §1 first; if a number has drifted, this file is stale and must be updated before it is trusted.

---

## 1. Current position (measured, not estimated)

| Measure | Value | Command |
|---|---|---|
| Live e2e | **149 / 149 passing** (19 suites) | `RUN_LIVE_E2E=true npx jest --selectProjects e2e --runInBand` |
| Contract suites | **14 / 14 passing** (4 files) | `npx jest --selectProjects contract-scripts` |
| Documented-but-unmounted paths | **0** (hard invariant, holds) | same as contract suites |
| Mounted-but-undocumented | **121** | `node scripts/contract/measure-undocumented-routes.cjs` |
| TypeScript errors | **0** — was 30 at the start of this pass | `npx tsc --noEmit -p tsconfig.json` |
| Failing unit tests | **29** unique (order-service + user-service) | `npx jest --selectProjects order-service user-service --runInBand` |
| Flow docs vs e2e | **46 docs / 19 suites** — no 1:1 mapping | `ls docs/FLOWS/*/user-flow/*.md` |
| Defects recorded | 36 (32 resolved, 2 workaround, 1 removed, 1 open) | `docs/FLOWS/_verification/defect-register.md` |

**The honest headline.** The 149 passing e2e tests certify the flows those tests exercise. They do **not** certify the platform. Three structural facts cap the claim:

1. **CI does not gate the contract guards.** `npm test` is red (~29 failures), and the `contract-tests` job runs only on pushes to `dev` — so the field-persistence guard and the route ratchet never run on a PR into `staging` (BLG-021).
2. **The compiler gate is now real.** All 30 type errors are fixed, and `Typecheck` is an unconditional, blocking CI step (BLG-002 ✅). This was the weakest of the three claims at the start of the pass; it is now the strongest.
3. **The suite did not find the critical bugs — manual probing did.** Every one of the five critical defects (DEF-022, DEF-027, DEF-030, DEF-034, DEF-035) was found by exercising the running system while the suite stayed green. The pattern held again in this pass: password reset was dead, the COD tier was pinned to NEW_BUYER for every buyer, notification writes were silently dropped, the COD/CARD payment saga could not receive its own payload, and a compliance endpoint ordered by a column that does not exist — all while the suites were green.

---

## 2. P0 — Structural guards (do these first)

These matter more than any individual bug. Four of the five critical defects were the *same* defect class; nothing currently prevents it recurring.

### BLG-001 · Silent field drop: a value crosses the API boundary that no persistence layer carries

- **Severity** P0 · **Class** systemic · **Status** OPEN
- **Evidence** four separate production-breaking instances:
  - `orders.trackingNumber` — declared in schema after the column was dropped → *every order write 422* (DEF-022)
  - `verificationDeadlineAt` — computed, never in the `save()` INSERT → countdown never returned (DEF-027)
  - `deliveryFee` — accepted by the API, existed nowhere → COD commitment never held (DEF-030)
  - `codCommitmentHoldId` — on the entity, not in the read mapper → cancel compensation silently skipped (DEF-035)
- **Why it recurs** the writer and the reader each look correct in isolation. Only a live probe or a direct DB read exposes the gap. `prisma migrate status` reports "up to date" — it compares migrations to history, never schema to database.
- **Fix** add a contract-integrity test that, per model, asserts every field accepted by the inbound DTO is (a) present in the `save()`/create payload and (b) present in the read mapping. Generate expectations from the Prisma model so a new field cannot be added without the check failing.
- **Verification** `npx jest --selectProjects contract-scripts`
- **Done when** adding a field to any inbound DTO without wiring both halves fails CI. **Effort** M (1–2 days)
- **STATUS: DELIVERED.** Shipped as `scripts/contract/field-persistence-audit.cjs` (AST analysis, no hardcoded field names) + `field-persistence.manifest.json` + `field-persistence.test.js`, wired into the `contract-scripts` project — **14/14 green**. It enforces four things: every entity field is persisted or allow-listed *with a reason*; every field is read back or allow-listed with a reason; a bare allow-list entry fails; and the exception count is ratcheted (33 for `Order_Order`) so it can only fall.
  It immediately found a **real, unremediated instance of the class it was written to prevent** — see **BLG-020**. That is the strongest available evidence the guard works: it detected a live gap that the entire test suite, including 149 passing e2e tests, never surfaced.
  *Known analyzer limitations* (recorded as `ANALYZER:` reasons in the manifest, not hidden): the static pass cannot see a field assigned imperatively after the returned object literal, and cannot attribute a key written through a helper call.

### BLG-002 · `tsc --noEmit` — RESOLVED

- **Severity** P0 · **Status** RESOLVED
- **Why it mattered** with no compiler gate, "the code matches the contract" is unverifiable. This was the single largest obstacle to any alignment claim.
- **Done** `npx tsc --noEmit -p tsconfig.json` now reports **0 errors**, down from 30. All 30 were real defects, not type noise — see §4.5 for what each one actually was (a dead seller-scoped lookup, a payment saga that could not receive its payload, a schema column that does not exist, a partial update that silently reset every field, and 11 logger calls that discarded their error).
- **Gate** already present and **blocking**: `.github/workflows/ci.yml` step `Typecheck` (line 82) runs `npx tsc --noEmit --pretty false` with no `if:` and no `continue-on-error`. The only `continue-on-error` in the file is on the **lint** step, and the only `if:` is the staging lint advisory. Verified by reading the workflow, not assumed.
- **Verification** `npx tsc --noEmit -p tsconfig.json && echo CLEAN` · **Done when** ✅ met.

### BLG-003 · `npm test` is red, so CI cannot gate anything

- **Severity** P0 · **Status** OPEN
- **Evidence** 29 unique failing tests (§5). `npx jest --selectProjects order-service user-service --runInBand`
- **Why it matters** a merge gate that always fails trains the team to ignore it. Every guarantee in this document is unenforceable while it is red.
- **Fix** work §5 to green in severity order. Jest projects must run **serially** — parallel projects cause wall-clock assertion failures that read as regressions (DEF-017).
- **Verification** `npm test` · **Done when** every project green in one serial run. **Effort** L

### BLG-004 · Money and hold paths have no fault injection — PARTIAL

- **Severity** P0 · **Status** PARTIAL (wallet/hold side covered; Redis and live-stack injection NOT covered)
- **Why it matters** the hold-stranding defect (DEF-034/035) only surfaced because a release failed for reasons nobody anticipated.
- **Done** 15 new fault-injection tests asserting money-safety *invariants* rather than per-method expectations:
  - `hold-reconciliation.fault-injection.test.ts` (8) — a failed release/capture is RETRIED and the next sweep recovers the funds; the idempotency key is stable across retries (`reconcile-release-${hold.id}`) so a retry cannot double-settle; release and capture of the same hold use *distinct* keys, so a capture cannot be swallowed by the wallet dedupe; a transient capture failure never leaves the hold eligible for a release (which would hand the buyer money the seller is owed); concurrent sweeps cannot settle the same hold twice; every failure is attributable to a hold; a hold-store outage does not wedge the job with `running` stuck true.
  - `cod-commitment.fault-injection.test.ts` (7) — a hold that could not be placed never yields a hold id, so the order cannot be recorded as secured and proceed to packaging; release/capture/forfeit failures propagate rather than being swallowed; the order reference is threaded even on a failed call, because a hold accepted by the wallet with a lost response is only recoverable if the reconciliation job can attribute it.
- **Verification** `npx jest --selectProjects wallet-service -t 'reconciliation under failure'` → 8/8 · `-t 'wallet failure injection'` (order-service) → 7/7
- **These tests were mutation-checked.** Disabling the concurrency guard and making the idempotency key non-stable caused exactly the three intended tests to fail, so they are not vacuous — the failure mode found in CheckCODEligibility (8 green assertions that never ran) is explicitly guarded against here.
- **Still open**
  - **Redis down is not covered and is not unit-testable** — hold state lives in Postgres, so a Redis outage test here would prove nothing about money. It needs an integration test against a real Redis.
  - **The 15 tests run against a live stack only for the *job* boundary.** No test proves the wallet HTTP client actually rejects the reconciliation payload with a real 4xx/5xx, nor that the order flow retries on `secureCommitment` failure — `BuyerConfirmCheckoutUseCase` has no test for that path.
  - **No test asserts the end-to-end invariant** “an order is never left paid-but-undelivered”. That needs the live e2e stack and is the one thing BLG-004 originally asked for.

### BLG-005 · `/api/request/*` (procurement) is entirely unverified

- **Severity** P1 · **Status** OPEN
- **Why it matters** 31 undocumented endpoints — the largest single block — plus zero live e2e. A whole procurement subsystem exists, is documented, and has never been executed against a running system.
- **Fix** (a) document the 31 endpoints; (b) write an e2e suite for request → quote → assess → assign → convert.
- **Verification** ratchet must fall by 31; new e2e suite green. **Effort** L

### BLG-006 · KYC, payout, community, analytics, notification, maps, inventory, business-registry, user have no live e2e

- **Severity** P1 · **Status** OPEN
- **Why it matters** 11 flow documents describing behaviour never run end to end. The 149 green tests say nothing about any of them.
- **Fix** one e2e suite per service, prioritised by money/security exposure: KYC and payout first (money and identity), then business-registry and user, then the rest.
- **Verification** each new suite green under `RUN_LIVE_E2E=true`. **Effort** L (9 suites)

### BLG-007 · No machine-checkable mapping from flow doc to verifying test

- **Severity** P1 · **Status** OPEN
- **Why it matters** 46 flow documents, 19 suites, nothing linking them. Drift is invisible: a doc can describe a flow no test exercises and nothing complains.
- **Fix** a manifest (`docs/FLOWS/_verification/flow-coverage.json`) mapping each flow doc to the e2e spec that verifies it; a contract test fails when a flow doc has no entry or names a test that does not exist.
- **Verification** `npx jest --selectProjects contract-scripts` · **Effort** M



---

## 4. TypeScript debt — CLEARED (0 errors)

`npx tsc --noEmit -p tsconfig.json` is now **clean**: 0 errors, down from 30 at the
start of this alignment pass. Every remaining entry below was a real defect, not
a type nuisance — the recurring pattern was again *the contract says one thing,
the runtime object does another*.

**By service (was 15 at last measurement):** auth 0 · catalog 0 · kyc 0 ·
notification 0 · order 0 · training 0.

### 4.1 Password reset — fixed (was a live dead user journey)

### 4.2 COD tier progression — fixed, and the test that hid it

`deriveTier(score, lifetimeCODValue)` is **dual-axis**: every tier above
`NEW_BUYER` also requires a lifetime COD threshold. All three call sites passed
only the score, so `lifetimeCODValue` was `undefined`, every `>= threshold`
comparison was false, and **the function returned `NEW_BUYER` for every buyer** —
COD progression was dead and the whole platform was capped at the 30,000 TZS
`NEW_BUYER` limit. All three call sites now pass the lifetime value.

Three separate test problems were uncovered while verifying this:

1. `trust-score-functions.pbt.test.ts` called `deriveTier(score)` with one
   argument — **the test encoded the bug**. It also asserted
   `deriveTier(21) === 'TRUSTED_BEGINNER'`, which the real function has never
   satisfied. Both are corrected, and the boundary cases now assert all four
   dual-axis combinations (score-only, lifetime-only, both, neither).
2. `progressive-cod-eligibility.test.ts` **never compiled and therefore never
   ran** — its fixture omitted `lifetimeCODValue`/`activeExposure` and 5 of the 8
   `ICODTrustScoreRepository` methods. It is now complete.
3. Once it ran, 6 cases failed and exposed a worse issue: the fixture passed a
   `tier` argument the engine **never reads** (it re-derives from both axes) and
   set `lifetimeCODValue: 0`. Every `TRUSTED_*` case was silently exercising the
   `NEW_BUYER` limit and concurrency rules while appearing to cover trusted-tier
   behaviour. The fixture now places buyers on the requested tier via a
   `TIER_AXES` table.

**Measured:** COD suites 2/2 files, **39/39 tests** passing.
`progressive-cod-eligibility.test.ts` went from *0 tests executed* to 23/23.

### 4.3 Notification saga handlers — 11 implemented, and they were never firing

The 11 `TS2339` errors in `saga-event-handler.ts` were subscribed event names with
**no handler method behind them**, so `request.*` / `quote.*` /
`supplier.invite_recommended` events reached the bus and did nothing. All 11 are
now implemented against the **real payload shapes** read from the publishers
(`create-request`, `assess-request`, `cancel-request`, `publish-quote`,
`convert-quote-to-order`, `mark-supplier-invite`, `request-expiration-sweeper`).

**Audience resolution.** These payloads carry domain ids only — `requestId`,
`customerId`, `providerId`, `quoteId`, `supplierId` — never a notification
recipient. `resolveRequestRecipients()` reads `Request_Request` for
`customerId` / `assignedProviderId` / `title`, falling back to a payload
`customerId`. `request.cancelled` deliberately notifies the **assigned provider**,
not the customer. `supplier.invite_recommended` names a supplier rather than a
user, so it only acts when `discoveredViaRequestId` links back to a request.

**The more serious defect this uncovered.** `sendInAppNotification` was already
present and was a **silent no-op for every caller**, including the four order
handlers that predated this work:

- It probed `prisma.notification_Notification` then `prisma.notification`. The
  model is **`Notification`**. Because it used `?.create?.` it resolved to
  `undefined`, skipped the body, and returned without throwing or logging — so
  order-verification notifications (seller prompt, buyer confirmation) were never
  persisted, and nothing indicated a problem.
- `Notification.type` is a **CHANNEL** enum (`email|sms|push|in_app|webhook`), but
  callers wrote semantic values such as `'ORDER_PLACED'` / `'ORDER_VERIFIED'`
  that match no enum member. With a correct model name those writes would still
  have been rejected by Prisma enum validation. `type` now carries the channel;
  the semantic category travels as `data.notificationType`. There is no `channel`
  column — `type` *is* the channel — so that field was also removed.

**Measured:** new `request-event-handlers.test.ts` **21/21 passing**, asserting
the exact `create()` argument so a regression in the model name or channel enum
fails in CI. It also drives a real subscription callback end-to-end and asserts
every subscribed event has a handler method that exists.

> **Newly observed, not yet fixed.** `request-outbox.ts` also publishes
> `link.expired` and `request.expired`, and `setupSubscriptions` has no
> subscription for either. Same class of defect as the 11 above: an event with no
> consumer. Logged for the next pass rather than fixed here.

### 4.5 What each of the final 15 errors actually was

None of these were cosmetic. Grouped by the defect class:

**A dead code path that threw and was swallowed (3)**
- `catalog-service` — `CreateProductUseCase` called
  `sellerLocationRepository.findByIdForSeller(...)` on a method
  `PrismaSellerLocationRepository` never had. The `TypeError` was caught by the
  surrounding try/catch and surfaced as a generic "Seller location lookup
  failed", so the legacy supplier-location branch was dead. Implemented with the
  `sellerId` predicate **deliberately**, not via `findById`: the seller filter is
  the ownership check that stops a seller attaching another seller's location,
  so an id-only lookup would have been an IDOR.
- `order-service/index.ts` — `paymentSaga.start(payment.id, { payment })`, but
  the signature is `start(payload, correlationId?)`. The saga received a **string**
  as its payload, so `onStart`'s `payload.payment` was `undefined` and the
  COD/CARD payment saga could not execute at all. Now `start({ payment })`, using
  the returned saga id.
- `kyc-service/index.ts` — the compliance audit-log endpoint ordered by
  `createdAt`, but `Kyc_AuditLog` has no such column; the real one is
  `timestamp`. The query would have failed at runtime.

**Silent data loss / silent no-op (2)**
- `order.controller.ts` read `response.commitmentPaymentUrl`, which is not on
  `PlaceOrderResponse`. `PlaceOrderUseCase` returns `commitmentFee: 0` and
  `commitmentPaymentMethod: undefined` because payment is deferred to
  `BuyerConfirmCheckoutUseCase`, so the `commitmentFee > 0` branch was
  unreachable and `paymentUrl` was never emitted. Removed as dead code.
- `TrainingModule` had no `toJSON()`, so the repository's
  `existing.toJSON?.()` evaluated to `undefined`, the spread collapsed to `{}`,
  and a *partial* update silently reset every field the caller did not supply.
  Added `toJSON()` (the convention across 25+ sibling entities).

**A port that demanded more than the code consumed (2)**
- `auth-service` registered `PrismaUserRepository` into an `IUserRepository`
  returning `AuthUser`, but the concrete repository returns the `User` aggregate.
  Both forgot/reset flows read only `id` and `email`, so they now depend on a new
  narrow port `IPasswordResetUserReader` rather than the broad interface.

**Diagnostics that were lying (8)**
- `catalog-service` passed a caught `Error` as the logger's *context object*
  argument at 11 sites. A structured logger serialises that as `{}`, so the
  message and stack were lost — meaning swallowed background-job failures looked
  like empty log lines. All 11 now go through one `errorContext(e)` helper that
  keeps `error` **and** `stack`. Four of the eleven were not compile errors
  (`e: any`) but had the identical defect.

### 4.6 Highest-risk item resolved

`catalog-service/index.ts` previously held 8 of 15 errors, 7 of them the logger
mistake above. The 8th — the `findByIdForSeller` gap — was the one most likely to
be a real runtime bug, and it was: a dead validation branch on a seller-scoped
lookup.

---

## 5. Test debt — see the per-item entries below

Regenerate with `npx jest --selectProjects order-service user-service --runInBand`. Grouped by root cause, not by file, because most share a cause.

### BLG-008 · `PlaceOrderUseCase` suite (7 failures) — mocks never wired to the real dependencies

- **Failing** `should place order successfully with WALLET payment`, `should start saga orchestrator`, `should allow COD order when delivery fee is missing`, `should fail COD order when buyer ineligible`, `should fail COD order when seller ineligible`, `should fail COD order when order ineligible`, `should place COD order when buyer eligible`
- **Cause** the suite constructs the use case with mocks that do not satisfy its dependencies, so it fails before reaching any assertion under test (e.g. `Database not initialized. Call initialize() first.` from a real `CatalogProductRepository` the Layer-3 COD guard instantiates directly).
- **Note** this suite was **not running at all** before the DEF-022 fix removed a compile error in the file it covers. Its 7 failures are newly *visible*, not newly caused.
- **Fix** inject the repository rather than `new`-ing it inside the use case, then complete the mock graph.
- **Verification** `npx jest --selectProjects order-service -t PlaceOrderUseCase` · **Effort** S

### BLG-009 · COD eligibility / commitment property tests (14 failures)

- **Failing** all 8 `CheckCODEligibilityUseCase › …`, `Preservation A › …` (2), `Preservation C › …` (2), `Preservation D › …` (2), `Sub-test B › …` (2)
- **Cause** same class as BLG-008 — property tests assert `debitWallet`/commitment behaviour through mocks that are not wired to the code under test, so they exercise the harness rather than the engine.
- **Important** several assert *"COD order does not call debitWallet"* — that property was true before DEF-023 and is now **intentionally false**: COD orders do secure a commitment at checkout. These assertions encode the pre-enforcement contract and must be reviewed, not mechanically repaired.
- **Fix** classify each: mock-wiring bug (repair) vs obsolete assertion (update with a comment citing DEF-023/DEF-030).
- **Verification** `npx jest --selectProjects order-service -t 'COD'` · **Effort** M

### BLG-010 · `user-service` repository + SMTP (4 failures)

- **Failing** `PrismaUserRepository more methods › search, queries, analytics, security and bulk operations`, `PrismaUserRepository unit tests › findById -> returns null when not found`, `… › exportUserData -> throws when user missing`, `SMTPService configuration › throws when SMTP is not configured`
- **Cause** incomplete Prisma mocks (delegates/methods not stubbed) and an SMTP assumption that no longer matches the configuration path.
- **Fix** complete the mock delegates; assert the real SMTP-not-configured behaviour.
- **Verification** `npx jest --selectProjects user-service` · **Effort** S

### BLG-011 · Orphan suites importing a deleted module (4 suites fail to run)

- **Failing** `user.controller.e2e.test.ts`, `main.startup.test.ts`, `main.start.test.ts` (+1 more) — all `TS2307: Cannot find module '../main' / '../../../main'`
- **Cause** these predate a `src/` migration and import a `main` module that no longer exists. They have never executed.
- **Fix** decide per suite: re-point at the real entrypoint, or delete. Leaving them is the worst option — they inflate the suite count while testing nothing.
- **Verification** `npx jest --selectProjects user-service` reports no `failed to run`. **Effort** S

### BLG-012 · One flaky-looking property test (verify before fixing)

- **Failing** `Phase 4 Gate F4.6 — Maps Service Geocoding (Tanzania fallback) › Property 2: Partial address match works › resolves "Kariakoo Market, Dar es Salaam" via partial match`
- **Cause** not yet root-caused. Could be a genuine maps defect or a fast-check generator producing values the resolver does not handle (a sibling test in the same file was exactly that and was fixed with `noInvalidDate`).
- **Fix** re-run 10× to establish flakiness vs deterministic; only then decide.
- **Verification** `npx jest --selectProjects order-service -t 'Property 2' --repeat` · **Effort** S

### BLG-013 · `CODDisputeController › returns 400 when resolution payload is incomplete`

- **Cause** not yet root-caused. Single assertion on a validation contract.
- **Verification** `npx jest --selectProjects order-service -t CODDisputeController` · **Effort** S



---

## 6. Contract & documentation debt

### BLG-014 · 121 mounted endpoints are absent from the published spec — `GUARDED`

- **Status** `GUARDED` (ratchet prevents growth; does not close the gap)
- **Registered as** DEF-018 · **Baseline** `scripts/contract/openapi-coverage-baseline.json`
- **Why it matters** a client cannot discover these operations from the contract. For any flow that depends on them, "the docs match the API" is unverifiable.
- **Guard in place** `scripts/contract/openapi-coverage.test.js` fails if the count exceeds the baseline, or if any documented operation stops being mounted (`extra in spec: 0` is a hard invariant). Proven working: adding the three consent endpoints pushed 121 → 124 and failed CI; documenting them returned it to 121.
- **Remaining, by service** `request` 31 · `training` 16 · `catalog` 14 · `chat` 13 · `auth` 11 · `order` 10 · `kyc` 8 · `enabler` 5 · `logistics` 5 · `payment` 5 · `user` 1 · `payout` 1 · `checkout` 1
- **Fix** work service by service; lower the baseline with each batch via `node scripts/contract/emit-openapi-coverage-baseline.js`. **Never** raise the baseline to make a failure go away.
- **Re-measure** `node scripts/contract/measure-undocumented-routes.cjs` (added with this backlog; prints the total, the per-service breakdown, and any documented-but-unmounted paths)
- **Verification** `npx jest --selectProjects contract-scripts` · **Effort** L (121 operations)

### BLG-015 · `prisma migrate status` cannot detect schema↔database drift

- **Severity** P1 · **Status** OPEN
- **Evidence** DEF-022. `migrate status` reported "Database schema is up to date!" while the Prisma schema declared a column the database had dropped, and *every order write was failing*. It compares the migrations folder to the migration-history table, never the schema to the live database.
- **Fix** add a `prisma migrate diff` (schema-datasource vs schema-datamodel) as a CI step, failing on a non-empty diff.
- **Verification** `npx prisma migrate diff --from-schema-datasource prisma/schema.prisma --to-schema-datamodel prisma/schema.prisma --exit-code ; echo $?` must be `0`. **Effort** S

### BLG-016 · Migrations must run with the server stopped

- **Severity** P2 · **Status** OPEN (documented workaround only)
- **Evidence** `prisma generate` fails with `EPERM … rename query_engine-windows.dll.node` while the server runs; the engine DLL is locked. This cost real time twice.
- **Fix** put it in the runbook, or wrap regenerate in a script that stops/starts the server, so the failure mode is not rediscovered.
- **Effort** S

---

## 7. Operational & resilience gaps

### BLG-017 · Reconciliation covers wallet holds, but not orders or shipments

- **Status** PARTIAL
- **Done** `HoldReconciliationJob` (DEF-036) settles stranded COD holds on a timer; both background jobs start and stop with the module.
- **Gap** no equivalent for orders stuck in a non-terminal state, nor for shipments whose order is terminal but which were never cancelled. The shipment-cancel path exists (DEF-033) but is event-driven only — a failure between "order cancelled" and "shipment cancelled" is unrecovered.
- **Fix** extend reconciliation to (a) orders past their verification deadline with no seller action, (b) shipments whose `orderId` references a terminal order but which are still `CREATED`.
- **Verification** a job test seeding each orphan state and asserting convergence · **Effort** M

### BLG-018 · No environment other than a seeded dev database has been verified

- **Status** OPEN
- **Gap** every result in §1 comes from one local stack — no staging run, no clean-database run, no production-shaped volumes. The plaintext-PII migration (DEF-021) and both order migrations were applied to a live dev database with a hand-taken backup.
- **Fix** (a) rehearse every `20260928*` migration against a **fresh** database; (b) run the e2e suite against staging once; (c) document backup and rollback paths.
- **Verification** migration rehearsal script + a staging `RUN_LIVE_E2E=true` run · **Effort** M

### BLG-019 · Health checks cover one service's dependencies

- **Status** PARTIAL
- **Done** commission health reports a real Redis `PING`, real in-process bus subscription counts, and a `degraded` state (DEF-024) — honest instead of claiming health it did not verify.
- **Gap** other services still expose simpler health. Apply the same pattern to order, wallet, payment and logistics — **wallet especially, since it owns money**.
- **Fix** replicate the `HealthCheckService` pattern; add a test asserting no check reports `healthy` without having performed a real probe.
- **Verification** `curl -s localhost:3000/api/<service>/health` for each · **Effort** M


### BLG-021 · The contract guards do not run on pull requests

- **Severity** P0 · **Status** OPEN · **Found while verifying BLG-002, not by a test**
- **Evidence** `.github/workflows/ci.yml` job `contract-tests` is gated on
  `if: github.ref == 'refs/heads/dev' && github.event_name == 'push'` (line 126).
  That job is what runs `contract-scripts` — the only place the field-persistence
  guard (BLG-001) and the undocumented-route ratchet (BLG-014) execute. The job's
  own name says it: *"Contract Tests (dev branch)"*.
- **Consequence** the workflow triggers on `pull_request` and on pushes to
  `staging`, but the contract guards run **only** for pushes to `dev`. A pull
  request can merge into `staging` without the field-persistence guard or the
  route ratchet ever executing. Both guards are real and working — they are simply
  not consulted for the branch that ships. The `Typecheck` gate is unconditional
  by contrast, which is why BLG-002 could be closed.
- **Why this matters more than it looks** BLG-001 exists specifically because four
  critical defects were invisible to the suite. Its value depends entirely on
  running on every change; today it does not.
- **Fix** run `contract-scripts` inside the unconditional `quality-gates` job, or
  relax the condition so it covers `pull_request` and `staging`. The ratchet
  baseline is already machine-checked, so this cannot break a green branch except
  by finding a real regression — which is the intent.
- **Verification** open a PR touching a DTO field and confirm the contract job
  runs on it · **Effort** S

### BLG-020 · A second, dead `OrderRepositoryImpl` writes fields the live repository never touches — found by BLG-001

- **Severity** P0 candidate · **Status** OPEN · **Found by** the BLG-001 guard, not by a test
- **Evidence** two implementations of `OrderRepository` exist:
  - `infrastructure/database/prisma-order.repository.ts` → `PrismaOrderRepository` — **wired at runtime** (`services/order-service/index.ts:87`)
  - `infrastructure/repositories/order.repository.ts` → `OrderRepositoryImpl` — imported **only by its own test**; dead code
- **Consequence** the dead implementation writes 13 entity fields the live one never persists or reads back: `codDeliveryOtp`, `codOtpExpiresAt`, `codProofGpsLat/Lng`, `codProofTimestamp`, `codDeliveryConfirmedAt/By`, `codReputationScore`, `codEligibilityChecked`, `enablerId`, `enablerCode`, `version`
- **Highest risk** **`codDeliveryOtp` / `codOtpExpiresAt`** — a COD delivery OTP that is never persisted cannot survive the next read, so COD delivery confirmation is probably non-functional, and the 149 passing e2e tests do not cover it. Also `version`: the optimistic-lock column is never incremented or read, so the lock is inert.
- **Why the suite missed it** the live COD e2e specs stop at delivery; nothing exercises COD delivery confirmation or proof-of-delivery. The dead repository's own unit tests pass, because they test the dead repository.
- **Next step (not yet done)** write a functional test for COD delivery confirmation against the live stack to establish whether the OTP path is actually broken, then either wire the fields into `PrismaOrderRepository` or delete `OrderRepositoryImpl` and the misleading coverage it appears to provide.
- **Interim handling** all 13 are recorded in `scripts/contract/field-persistence.manifest.json` with `BLG-020` reasons, and the test ratchets the exception count at 33 so it can only fall.
- **Update (after the COD OTP fix)** the *functional* COD OTP lives in **logistics-service**, not on the order: `CODDeliveryConfirmationSaga` issues it and `VerifyCODDeliveryUseCase` reads it back via `logistics_deliveries`. That path was itself broken (the OTP was passed to a repository with no column for it, so verification could never succeed) and is now fixed. The order-entity `codDeliveryOtp` / `codOtpExpiresAt` / `codProofGps*` fields therefore look **vestigial** — before wiring them into `PrismaOrderRepository`, confirm nothing reads them; if nothing does, delete the fields and the columns rather than propagating a second OTP store.

---

## 8. Resolved — audit index

Full detail with root causes and live evidence lives in [`defect-register.md`](./defect-register.md). Index for traceability only:

| ID | Severity | Area | One-line |
|---|---|---|---|
| DEF-020 | Critical | auth | Login leaked `passwordHash` + `twoFactorSecret` → deny-by-default allow-list |
| DEF-021 | High | user/auth | Reversible PII encryption → normalized plaintext + HMAC lookup, migrated with backup |
| DEF-022 | Critical | order + schema | Prisma schema/migration drift → **all order writes 422** |
| DEF-023 | High | order | COD eligibility engine injected but never called → limits bypassable |
| DEF-024 | Medium | commission | Health reported `healthy` for stub checks → real probes + `degraded` |
| DEF-025 | High | e2e harness | Entire live suite silently skipped; seed broken → 149/149 now |
| DEF-026 | Critical | order + wallet | Cancelled orders never refunded (debit had no `referenceId`) |
| DEF-027 | High | order | Verification deadline never persisted nor returned |
| DEF-028 | Medium | e2e fixture | COD cleanup missed the new statuses → buyer hit the concurrency cap |
| DEF-029 | Medium | policy | Seller-consent cancellation had no implementation → consent workflow built |
| DEF-030 | Critical | order | COD commitment never held (`deliveryFee` existed nowhere) |
| DEF-031 | High | order | COD geographic + concurrency limits unenforced at placement |
| DEF-032 | Medium | training | `/start` returned no top-level `status` |
| DEF-033 | Medium | order + logistics | Direct order placement created no shipment → untrackable orders |
| DEF-034 | Critical | order → wallet | Hold release/capture broken (wrong route, rejected identity, swallowed error) |
| DEF-035 | Critical | order | `codCommitmentHoldId` missing from read mapping → compensation skipped |
| DEF-036 | Critical | wallet | `HoldExpiryJob` constructed and never started; no reconciliation → stranded funds |

*(DEF-001 … DEF-019 predate this work and are recorded in the same register.)*

---

## 9. Recommended execution order

1. **BLG-001** — the silent-field-drop guard. Prevents recurrence of the class that caused four criticals.
2. **§4 items #3, #13–22, #27–28** — code the compiler already flags as broken or unimplemented, on the password-reset, notification and COD-trust paths.
3. **BLG-002 + BLG-003** — get `tsc` and `npm test` green, *then* gate CI. Nothing else is enforceable until this lands.
4. **BLG-008 → BLG-013** — test debt; largely mechanical once the above is green.
5. **BLG-015, then BLG-005/006/007/014** — contract and flow coverage, service by service.
6. **BLG-004 + BLG-017** — fault injection and reconciliation completion, once the suite can be trusted.

Steps 1–3 are what make every later guarantee real rather than aspirational.

---

## 10. Change log

| Date | Change |
|---|---|
| 2026-09-28 | Created. 20 items (BLG-001…BLG-020) + DEF-018 carried as a guarded gap. Baseline: e2e 149/149, contract 9/9, 30 TS errors, 29 failing unit tests, 121 undocumented endpoints, 46 flow docs / 19 e2e suites. |
| 2026-09-28 | **BLG-001 delivered** — field-persistence audit + test wired into `contract-scripts` (now 14/14). It immediately found **BLG-020**: a dead second `OrderRepository` masking 13 fields the live one never persists, including the COD delivery OTP. Exception count ratcheted at 33 so it can only fall. |
| 2026-09-28 | **COD delivery OTP fixed (Critical, found via BLG-020)** - the OTP was passed to a delivery repository with no column for it, so every COD verification silently failed and no courier could ever complete a COD delivery or collect cash. Migration 20260928050000 adds otp/otpExpiresAt, the repository now persists and reads them, and validateOTP fails closed on a missing code (the old expiry check silently never fired on a NaN comparison). 2 regression tests added; engine 6/6 green; no new logistics failures. |


### BLG-022 · COD delivery and order tracking were reported as covered but never executed

- **Severity** P0 candidate · **Status** OPEN · **Found by** live e2e re-run, not by any test
- **Evidence** the full live suite reported **149/149 passing** while executing **zero** COD delivery-OTP and zero tracking assertions. Two causes, both fixed/exposed in `tests/e2e/checkout-saga.e2e.test.ts`:
  1. **A test bug.** The BUY-04 tracking test called `/orders/:id/verify` and `/orders/:id/buyer/confirm-checkout` **without `method: 'POST'`**. `requestJson(pathname, init: RequestInit = {})` has no default method, so `fetch` sent a GET, which these POST-only routes reject with **405**. The response was never asserted, so the test continued.
  2. **A silent skip.** Both the COD lifecycle and tracking tests did `console.warn('...skipping assertions'); return;` when no delivery was found. A test that skips its own assertions still reports **PASS** — a permanent blind spot that reads as coverage.
- **Confirmed real, not just a test artefact.** After fixing the missing POST and adding `expect(...status).toBe(200)` on both calls, checkout still returns 200 and **still no delivery is created**. The live API has exactly one delivery: the seeded `e2e-seed-delivery-order-001` (already `delivered`, and explicitly filtered out by the fallback).
- **Both skips now throw** with a diagnostic naming the likely cause. Suite result for `checkout-saga` is now **5 passed, 2 failed** — the 2 failures are `[P1] [COU-03] COD order: full lifecycle` and `[P1] [BUY-04] order tracking`.
- **Corrected causal analysis** (supersedes an earlier note in this entry that blamed `OrderFulfillmentSaga`):
  - There are **two** classes named `OrderFulfillmentSaga` and **neither creates deliveries**.
    `order-service`'s is a **stock-reservation** saga; `checkout-service`'s is a
    **checkout→order-creation** saga (it is not even instantiated in
    `checkout-service/index.ts`). The earlier attribution was wrong.
  - The **only** code that creates logistics records is
    `logistics-service/.../create-order-shipments.use-case.ts`, reached solely via
    `globalThis.__createOrderShipments`, registered at logistics boot and called from
    3 sites (`checkout.controller.ts:504`, `multi-seller-checkout.use-case.ts:243`,
    `place-order.use-case.ts:146`). The app **is** a single process
    (`src/main.ts` → `import('../services')`), so `globalThis` is shared.
  - **That use case creates `logistics_Shipment`, not `logistics_Delivery`.**
    A `logistics_Delivery` arises later, from courier assignment/acceptance. So
    "confirm-checkout should create a delivery" is **not** the correct expectation —
    the COD OTP flow is courier-side, on a delivery that checkout does not create.
    The e2e tests may be asserting the wrong entity at this stage.
  - **Why this went unnoticed for so long: the entire path is fail-silent.** Three
    independent no-ops swallow the failure and still let the caller believe it worked:
    `place-order.use-case.ts:147-151` (returns silently if the global is missing),
    `place-order.use-case.ts:351` (`.catch()` → `console.warn` only), and
    `create-order-shipments.use-case.ts:123-125` (returns `{created: 0}` if
    `!prisma || !request?.sellers?.length`, with no log).
- **MEASURED (live DB probe, `npx tsx`):** `logistics_Shipment` = **92**,
  `logistics_Delivery` = **1** (the seeded `e2e-seed-delivery-order-001`, status
  `delivered`). Recent shipments are `CREATED`/`CANCELLED` with real `TRK-*`
  numbers, one per e2e order.
  - **So none of the three silent no-ops is firing.** Shipment creation works
    normally, for every order placed. The earlier "sellers empty / prisma global
    missing" hypothesis is **disproven** — 92 shipments prove the path is healthy.
  - **Deliveries are never created by checkout, and that is the design**: a
    `logistics_Delivery` comes from courier assignment/acceptance, which no e2e
    test drives. The two failing tests poll for a delivery that checkout was never
    supposed to create.
  - **Therefore the correct fix is to the tests, not to the product**: the COD
    OTP and tracking tests must first drive courier assignment to obtain a
    `logistics_Delivery`, then exercise OTP issuance/verification against it. The
    COD OTP flow remains genuinely unverified until that step exists — but the
    product is not broken here.
- **RETRACTED — the alleged schema/client drift does not exist.** An earlier draft of
  this entry claimed `prisma/schema.prisma` declares `model Order_Order` while the
  database has no such table and the generated client lacks the accessor. **All
  three sub-claims were artefacts of a bad probe, and there is nothing to fix.**
  - `model Order_Order` carries `@@map("orders")`, and the `orders` table **does**
    exist. The earlier table listing missed it only because the output was
    truncated at 40 rows and `orders` sorts after those.
  - The generated Prisma client **does** expose `prisma.Order_Order` (typeof
    `'object'`), verified directly.
  - The probe that produced the false positive queried the *table* as
    `"Order_Order"`. Postgres folds/case-sensitises quoted identifiers, so that is
    a different name from the mapped table `orders` and it correctly failed with
    `42P01 relation "Order_Order" does not exist` — a bad query, not a missing
    table. The Prisma validation error surfaced in the same run was the model's
    own field list, which I misread as evidence of a missing accessor.
  - **Lesson worth keeping:** the truncated read and the case-mismatched SQL are
    both ways a probe manufactures evidence for a conclusion already reached.
    Verify a claim about absence by querying the specific name directly, not by
    reading a bounded, filtered list.

### BLG-023 · Monolith opened 3 Prisma pools (150 conns) against max_connections=100

- **Severity** P0 (it invalidated the entire e2e signal) · **Status** FIXED & VERIFIED
- **Symptom** a full live e2e run reported 8 failures, 6 of them `Exceeded timeout of
  30000 ms` across the wallet, COD-eligibility and both smoke suites. The server
  logged ~2100 error lines: 475 pool errors, 208 "Can't reach database", 43
  `P1001`, 3 `P2024` (timed out fetching a connection from the pool).
- **Root cause** the server log showed **3 × "Starting a postgresql pool with 50
  connections" = 150**, while Postgres reported `max_connections = 100`. The
  over-budget connections were refused, so requests blocked until `pool_timeout`
  and then failed as P1001/P2024. The 30s test timeouts were the symptom; the
  cause was pool sizing.
- **Why the tuning knob was dead:** `shared/database/prisma-client.ts` consulted
  `DB_CONNECTION_LIMIT` only when the URL had **no** `connection_limit` parameter.
  `.env`'s `DATABASE_URL` hardcodes `connection_limit=50`, so both
  `DB_CONNECTION_LIMIT` and `DB_POOL_TIMEOUT` were silently ignored — the one
  lever an operator would reach for had no effect.
- **Fix** the env vars are now authoritative when set (URL value used only as
  fallback), and `.env` sets `DB_CONNECTION_LIMIT=15`, `DB_POOL_TIMEOUT=10`
  (3 × 15 = 45, ample headroom; the shorter timeout makes a starved pool fail
  legibly instead of hanging 30s).
- **Verified** after restart: **1 pool with 15 connections**, and the re-run had
  **0** P1001/P2024/"Can't reach database" lines.
- **Result: 8 failures → 2.** `147 passed / 149`. `wallet`, `cod-trust` and
  `flow-smoke` all PASS. The only 2 remaining failures are the intentional loud
  throws from BLG-022 (COD lifecycle, order tracking).
- **Correction to the previous entry:** the `422` on COD order placement in
  `cod-trust` was **not** a minimum-basket-value regression — that suite passes
  cleanly now, and the 422 was a downstream effect of the exhausted pool. The
  minimum-basket issue is real but only in the **unit** layer (see BLG-022's
  open unit failures), not in the e2e journey.

### BLG-024 · COD OTP fixture exposed that successful verification never marks the delivery delivered

- **Severity** P0 · **Status** FIXED (mutation-verified) · **Found by** the BLG-022 fixture
  · **Root cause shared with BLG-027** — see that entry for the second half of the fix.
- **Fixture** `tests/e2e/helpers/cod-delivery-fixture.ts` creates a COD delivery for an
  order directly through Prisma, following the pattern already used by
  `scripts/seed-e2e-users.ts`. It was needed because **no public API produces a
  `logistics_Delivery`** for a confirmed order: checkout creates a
  `logistics_Shipment`, and `DeliverySaga` (which would create the delivery) is
  constructed and registered but never started. `POST /api/v1/deliveries` cannot
  substitute — `create-delivery.use-case.ts` only *returns a plan* and never
  persists a row.
- **IDs** must satisfy `SYSTEM_ID_PATTERN`
  (`^[a-z]{2,6}(?:_[a-z]{2,6})?_[0-9A-HJKMNP-TV-Z]{26}$`), so the fixture derives a
  deterministic 26-char Crockford suffix from the order id and asserts the pattern
  before writing. Verified: valid, distinct per order, never collides with the
  seeded `log_del_01ARZ3NDEKTSV4RRFFQ69G5FAV`.
- **Two test defects the fixture also exposed:**
  - The test verified COD using the **order's `deliveryCode`**, not the OTP the
    saga issued. `POST /cod/:id/otp` returns `{ success: true }` with no code — the
    OTP goes to the buyer out of band — so that assertion was vacuous. It now reads
    the real OTP from the delivery row.
  - It now also asserts a **wrong OTP is rejected**, otherwise "200 on success"
    proves nothing.
- **The real defect.** With a genuine delivery, the saga **does issue a real OTP**,
  correct-code verification returns **200 / success: true**, and a wrong code is
  rejected. But the delivery's status afterwards is **`in_transit`, not
  `delivered`** — successful COD confirmation never settles the delivery.
  `verify-cod-delivery.use-case.ts:41` calls
  `codDeliveryConfirmationSaga.start(...)` — it *starts* the saga again rather
  than resuming it, passing `otp: delivery.otp` (the stored code) rather than the
  `providedOtp`, so the completing step appears not to run.
- **Note** that use case also returns **success** when `buyerId`/`sellerId` are
  missing (line 34-38, "completing without saga") — another fail-silent path in the
  same flow, consistent with the BLG-022 pattern.
- **Root cause.** The flow had **one** `CODDeliveryConfirmationSaga` used from both
  ends. `verify-cod-delivery.use-case.ts` called `saga.start(...)` again, which
  restarted it from **step 0**. So a verify request re-ran the OTP-*issuance* step:
  the delivery was re-statused, a **fresh OTP was minted and overwrote the stored
  one**, and `NotifyBuyerOTP` was re-sent — while the step that would have marked the
  delivery `delivered` (and called `completeCodTransaction`) never ran to completion.
  The verify request passed its own freshly-minted code as "the" OTP, so verification
  returned `200 / success: true` while the row stayed `in_transit`. The `otp:
  delivery.otp`-vs-`providedOtp` detail noted earlier was a symptom of this restart,
  not the underlying cause.
- **Note** that use case also returned **success** when `buyerId`/`sellerId` were
  missing (line 34-38, "completing without saga") — another fail-silent path in the
  same flow, consistent with the BLG-022 pattern. It now throws instead, and the
  initiation step carries the same fail-closed guard (see BLG-027).
- **Fix applied** the single saga was **split in two** so that initiation and
  settlement can no longer share a code path:
  - `CODInitiationSaga` (`cod-initiation.saga.ts`) — one step,
    `initiate_secure_delivery`: fail-closed attribution guard → `generateOTP()` →
    `updateStatus('in_transit', { isCOD, otp, otpExpiresAt })` → `NotifyBuyerOTP`.
    **It cannot settle.** It has no `SettleCODPayment` and no `RecordCODSuccess`.
    The OTP write and the notification are wrapped in try/catch that logs and
    rethrows, so a failed write never produces a notify for a code nobody received.
  - `CODSettlementSaga` (`cod-settlement.saga.ts`) — `verify_delivery` →
    `mark_delivered` → `complete_cod_transaction`. **It is the only path that can
    emit `SettleCODPayment` / `RecordCODSuccess`.**
  - `initiate-cod-delivery.use-case.ts` starts the initiation saga and persists the
    resulting saga id; `verify-cod-delivery.use-case.ts` now starts the
    **settlement** saga with the **`providedOtp`** the courier typed, and fails
    closed when attribution is missing.
  - `Logistics_Delivery.codSagaId` (schema + migration
    `20261001000000_logistics_delivery_cod_saga_id` + repository persist/read) is
    recorded **for tracing only**. It is explicitly **not** a resume handle —
    resuming the old combined saga is precisely what caused BLG-027.
  - `cod.controller.ts` now **requires `lat`/`lng`** instead of defaulting to
    `{0,0}`, so a settlement cannot be recorded at the Gulf of Guinea.
- **Verification**
  - COD suites: **44 passed / 44**.
  - Full `logistics-service` project: **931 passed, 2 skipped, 21 failed** of 954,
    against a **pre-change baseline of 23 failed** in the same 11 suites.
    `comm -13` between the baseline and post-change failure sets is **empty — zero
    new failures**. Two baseline failures were incidentally fixed:
    `InitiateCODDeliveryUseCase › should fail when not COD delivery` and
    `VerifyCODDeliveryUseCase › should fail when not COD delivery`.
  - `npx tsc --noEmit`: clean, rc=0.
- **Mutation-checked, because every regression here would be a test going green
  for the wrong reason.** Three temporary mutations were applied to the production
  code and reverted; **all three were caught**:
  1. letting the initiation step fall through to settlement → caught (settlement
     suite fails);
  2. weakening the fail-closed attribution guard → caught;
  3. reverting `verify` to restart from step 0 / re-mint the OTP → caught.
  Details and the exact commands are recorded under BLG-027.
- **Two regressions the split introduced, found by the baseline diff and fixed:**
  - The `Layer Isolation` saga-structure lint greps every saga file for
    `/catch|try|error|failure/`. The freshly-written initiation saga matched on none
    of them. Rather than pad a comment to satisfy the regex, the genuine gap the
    lint was pointing at was closed: the OTP write + notify are now in a `try/catch`
    that logs and rethrows, so the orchestrator compensates instead of leaving a
    stored code the buyer never received. Covered by a new test (*"fails loudly when
    the OTP cannot be persisted, rather than silently issuing an unusable code"*)
    which also pins that `NotifyBuyerOTP` is **not** published in that case.
  - `create-delivery.use-case.test.ts` was missing an `updateStatus` mock and now
    supplies one.
  After both fixes: `layer-isolation` is back to exactly its **5 pre-existing**
  failures — the post-change failure set is identical to the baseline — and the
  COD/`create-delivery` suites are green.
- **Live e2e** `[COU-03]` — see the re-verification note at the end of this file.

### BLG-025 · A second Prisma pool still started at 50, bypassing the BLG-023 env override

- **Severity** P1 · **Status** FIXED (source-level), full re-verification PENDING
- **Found by** the final verification run, which was green (148/149) but whose
  server log still showed pools above the intended size:
  `2 × "with 15 connections"` and `1 × "with 50 connections"`.
- **Cause** the BLG-023 fix made `DB_CONNECTION_LIMIT` authoritative inside
  `createPrismaClient()`. Any client that constructs itself from `DATABASE_URL`
  directly, bypassing that helper, still reads the URL's own `connection_limit`.
  `.env` hardcoded `connection_limit=50`, so those readers kept opening 50-connection
  pools. Total was 15+15+50 = 80, under `max_connections=100`, which is why the
  suite passed — but it was one process away from exhausting the server again,
  so the fix was incomplete rather than sufficient.
- **Fix** `.env`'s `DATABASE_URL` now carries `connection_limit=15`, so the URL
  and the env knob agree and no construction path can reintroduce a 50-connection
  pool. Expected steady state: 3 × 15 = 45.
- **Caveat, stated plainly:** this was applied *after* the 148/149 run, and the
  server was **not** restarted, so this specific change is **not** verified by a
  live run. It is directionally safe — it strictly lowers the connection ceiling
  and cannot increase pressure — but it should be confirmed on the next server
  start by re-checking `grep -o 'with [0-9]* connections' server.log`.
- **Residual** 95 "Can't reach database", 24 P1001, 49 pool timeouts accumulated
  over the run despite no test failing on them. Worth watching: if these persist
  once every pool is 15, the cause is not pool sizing and needs its own
### BLG-026 · `wallet-payment-preservation.test.ts` asserts payment on a use case that deliberately does not pay

- **Severity** P1 · **Status** FIXED (17/17, mutation-checked) · **Found by** repairing
  `wallet-payment-preservation.test.ts`, whose 6 failures I had wrongly attributed
  to minimum-basket fixture amounts
- **Correction to my own first analysis.** I initially wrote this entry as a P0
  production defect — "a WALLET order placed via `POST /api/order/orders` is
  persisted as accepted and never charged". **That was wrong.** The missing
  payment in `PlaceOrderUseCase.execute()` is intentional and documented in four
  places, and the payment path is correctly wired:
  - `place-order.use-case.ts:272-275` — "All orders enter
    PENDING_SELLER_VERIFICATION first. No payment processing occurs here. Payment
    is deferred to BuyerConfirmCheckoutUseCase which runs after the seller
    confirms stock availability within the verification window."
  - `place-order.use-case.ts:41-44` — `deferPayment` is marked `@deprecated`,
    "All payment is now deferred to BuyerConfirmCheckoutUseCase".
  - `order.controller.ts:330-337` — a comment that deliberately *removed* the
    commitment-payment branch, explaining the field was dead and that the payment
    URL now comes from `BuyerConfirmCheckoutUseCase`.
  - `git log -S` dates the deferral to `18423129` ("feat:latest0409"), i.e. a
    deliberate architectural change, not an accidental deletion.
  The real payment step is `BuyerConfirmCheckoutUseCase.execute()`
  (`buyer-confirm-checkout.use-case.ts:97-127`), which calls `debitWallet` with a
  `referenceId` and one retry, then persists the order to `CONFIRMED` in a
  transaction. It is wired at `index.ts:137` and reached from
  `verification.controller.ts`, gated on the valid
  `SELLER_VERIFIED → CONFIRMED` (actor `buyer`) transition
  (`verification-state-machine.ts:34`).

- **Actual cause of the 7 failures** the suite is a *characterization* suite —
  its own header says "These tests MUST PASS on the current (unfixed/fixed) code"
  — written against the **pre-deferral** architecture. Preservation C/D construct a
  `PlaceOrderUseCase` and assert `debitWallet` is called on it. Under the current
  design that can never happen, so they fail on valid input at any basket size.
  The properties themselves are still *true* and still worth keeping; they are
  just attached to the wrong unit. Full breakdown of all 7:
  | # | Test | Cause | Real or stale? |
  |---|------|-------|----------------|
  | 1 | A · PBT | `itemsArb` `price: 100` → `Minimum basket value … Add TZS 49,900` | test bug |
  | 2 | A · Unit | `Database not initialized. Call initialize() first.` (prisma-client.ts:67) | test bug — `catalogLookup` defaults to a real Prisma-backed repo |
  | 3 | C · PBT | `debitWallet` 0 calls at TZS 100,000 | **stale contract** |
  | 4 | C · Unit | same | **stale contract** |
  | 5 | D · PBT | promise resolved instead of rejected | **stale contract** |
  | 6 | D · Unit (insufficient funds) | same | **stale contract** |
  | 7 | D · Unit (service unavailable) | same | **stale contract** |
  The 6→7 move is explained: the min-basket fix removed the throw that was masking
  test 7, which asserts `.rejects.toThrow()` and so had been passing *vacuously* —
  it was rejecting for the wrong reason.
- **Fix applied** Preservations A, C and D were retargeted onto
  `BuyerConfirmCheckoutUseCase`, which is the unit that now owns wallet payment.
  **Test-only change; no production behaviour was altered.** Concretely:
  - A now asserts on a real COD checkout: no debit, both eligibility checks run,
    commitment secured, order confirmed. It previously could not hold anywhere.
  - C asserts `debitWallet` is called exactly once with
    `(buyerId, amount, currency, description, orderId)` — the 5th argument is the
    transaction `referenceId` that cancellation uses to locate the debit. The old
    test asserted a 4-argument call, which the checkout path never makes.
  - D asserts a failed debit throws `PAYMENT_FAILED` and that the order is **not**
    confirmed, and its `.rejects.toThrow()` was tightened to match the actual
    message (it was passing *vacuously* — see the 6→7 note).
  - Two tests were **added** to cover guards that previously had none: a missing
    wallet client must fail closed with `PAYMENT_UNAVAILABLE`/503, and a transient
    lock error is retried exactly once. The retry test also pins that the
    non-contention failures in the D PBT are *not* retried.
  - Removed the now-dead `makeBaseRequest`, `itemsArb`, `makeMockOrderRepository`,
    `makeMockSagaOrchestrator` and `makeMockCatalogLookup` helpers plus the
    `PlaceOrderUseCase`/`PlaceOrderRequest` imports.
- **Verification**
  - `wallet-payment-preservation.test.ts`: **17 passed / 17 total** (was 7 failing).
  - `npx tsc --noEmit`: clean, rc=0.
  - **Mutation-checked, because the failure mode here was vacuous tests.** Two
    temporary mutations were applied to `buyer-confirm-checkout.use-case.ts` and
    reverted:
    - disabling the `debitWallet` call → **3 failures** (C PBT, C Unit, retry test)
    - suppressing the `lastErr` throw → **3 failures** (D PBT, both D unit tests)
    So the suite has real teeth and is not passing by construction. Both mutations
    are fully reverted; `grep -rn MUTATION` over `services` and `shared` returns
    nothing, and the only remaining diff in that production file is the pre-existing
    `referenceId` fix from the earlier COD/wallet work.
  - Full `order-service` project: **553 passed, 2 skipped, 4 failed** of 559. All
    4 failures are **pre-existing** and in files this change never touched
    (`wallet-payment-bug-condition.test.ts`, a Maps geocoding gate F4.6 property,
    and a `CODDisputeController` 400 case). No new failures were introduced.
- **Follow-up still open** `wallet-payment-bug-condition.test.ts` contains a sub-test
  titled *"Warn-and-continue: PlaceOrderUseCase must throw when walletClient is
  absent"*. That is the **same stale-contract defect** as this entry — it expects
  `PlaceOrderUseCase` to throw when the wallet client is missing, which cannot
  happen now that payment is deferred. I did not touch it: it is a different file
  with a different intended contract, and I had not established what it is trying
  to pin before changing it. It should be triaged alongside this entry.

  investigation.

### BLG-027 · Settlement ran during OTP generation — a bare `return` counted as saga success

- **Severity** P0 · **Status** FIXED (mutation-verified) · **Found by** splitting the
  saga for BLG-024, then reasoning about what the *old* code must have been doing.
- **What actually happened.** In the old single `CODDeliveryConfirmationSaga`, the
  verification step contained an early `return` on some branch (e.g. missing
  attribution / already-verified). The step's `execute` resolved **normally** — a
  bare `return` is a successful promise, not a failure. The orchestrator therefore
  marked the step **completed**, advanced, and ran `mark_delivered` →
  `complete_cod_transaction`. **So a request that only asked for an OTP could settle
  the payment**, because there was no path through the saga that could decline to
  proceed without *succeeding*. This is the inverse of BLG-024: BLG-024 is
  "verification never settles", BLG-027 is "OTP generation settled anyway".
- **Why the split fixes it structurally, not just behaviourally.** After the split
  the two halves live in different classes with different step lists, so the failure
  mode is no longer a matter of getting one function's control flow right:
  - `CODInitiationSaga` contains **no** settlement step at all, so no branch inside
    it — early `return`, thrown error, skipped guard — can reach `SettleCODPayment`.
    Settlement is **structurally unreachable** at OTP-generation time.
  - `CODSettlementSaga` is started only by `verify-cod-delivery.use-case.ts`, and it
    **throws** when attribution is missing rather than returning. A guard that cannot
    be satisfied now *fails* the step instead of *completing* it.
  - `codSagaId` is persisted for tracing and is **deliberately not a resume handle**:
    the reason BLG-024 existed was that verify restarted the shared saga, and resuming
    that same shared saga would re-import this bug.
- **The fail-closed attribution guard** now exists in both halves — initiation refuses
  to mint an OTP without `buyerId`/`sellerId`/`orderId`, and the verify use case
  throws instead of the old `"completing without saga"` success path.
- **Verification**
  - `cod-initiation.saga.test.ts` and `cod-settlement.saga.test.ts` together:
    **44 passed / 44**.
  - `npx tsc --noEmit`: clean, rc=0.
  - Full `logistics-service`: **931 passed / 954**, **21 failed** vs a **23-failed**
    pre-change baseline; `comm -13` on the failure sets is **empty** → zero
    regressions, 2 baseline COD tests incidentally fixed.
- **Mutation-tested three ways — all three caught.** Each mutation was applied to the
  production source, the COD suites were re-run, and the mutation was then reverted:
  1. **Restore settlement inside the initiation path** (make the initiation step fall
     through to `SettleCODPayment`/`RecordCODSuccess`) → the settlement/initiation
     separation assertions fail; suite goes red.
  2. **Weaken the fail-closed attribution guard** (let a missing `buyerId` proceed) →
     the guard tests fail.
  3. **Restore the old verify behaviour** (restart from step 0, re-mint the OTP,
     compare against the stored code instead of the provided one) → the
     "verify must not re-issue an OTP" and settlement-actually-runs tests fail.
  All three mutations were fully reverted; no `MUTATION` marker remains in
  `services`, `shared` or `prisma`.
- **Regressions the split itself introduced (both closed):**
  - `Layer Isolation › should validate saga structure` greps each saga file for
    `/catch|try|error|failure/`. Fixed by adding a real `try/catch` around the OTP
    write + `NotifyBuyerOTP` (with a test) rather than by stuffing the regex into a
    comment — the lint is trying to say sagas must handle failure, and the initiation
    step genuinely did not.
  - `create-delivery.use-case.test.ts` needed an `updateStatus` mock.
  Post-fix, `layer-isolation` shows exactly the same 5 pre-existing failures as the
  baseline.
- **Follow-up** the `Layer Isolation` saga lint is only a keyword grep: the settlement
  saga satisfies it via the words `failure`/`error` appearing in comments rather than
  via real error handling. That is a **pre-existing weakness of the lint**, not
  something introduced here, but it means the lint would not have caught BLG-027 even
  in principle. Worth replacing with a structural check (e.g. "a saga file may not
  both publish settlement commands and accept OTP input"). Not done here — out of
  scope for this fix.
- **Live e2e** — 149/149, with the settlement ordering observed in the server log;
  see the re-verification note at the end of this file.

---

## Re-verification note — BLG-024 / BLG-027 against the live system

**Result: live e2e green — `Test Suites: 19 passed, 19 total · Tests: 149 passed,
149 total`**, measured with `RUN_LIVE_E2E=true npx jest --selectProjects e2e
--runInBand` against a server started with `npx tsx src/main.ts`. This satisfies the
"Live e2e" pointer in BLG-024 and re-measures the §1 row.

**What `[COU-03]` (the COD full lifecycle) now proves end to end**, in order:

1. A wrong code sent to `POST /cod/:id/verify` is rejected with
   **409 `COD_VERIFICATION_FAILED: Invalid or expired OTP`**, and a follow-up read
   shows the delivery is **not** `delivered`.
2. The issued OTP then returns **200 / `success: true`**, and the read shows
   **`delivered`**.

**Two test defects that had to be fixed for those assertions to mean anything:**

- **Ordering is load-bearing.** The wrong-OTP call originally ran *after* the
  successful verification. By then the delivery is marked `codOtpVerified`, and the
  use case answers an idempotent retry with 200 **without re-checking the OTP** — so
  the `>= 400` assertion observed the retry short-circuit, not the OTP comparison. It
  now runs *first*, and additionally pins the rejection reason (`/OTP/i`, excluding
  "Missing idempotency key") and that the delivery did not advance.
- **Proximity coordinates.** The test drove the courier to `DELIVERY_LOCATION`,
  which sits ~8 km from the fixture's delivery address — correctly rejected by the
  500 m gate, so the saga never completed. The fixture now exports
  `FIXTURE_DELIVERY_COORDS` / `FIXTURE_PICKUP_COORDS` and the courier is sent to the
  real delivery coordinates.

**Confirmed in the server log** (`logs/live/server.log`), for the same delivery id:

- wrong code → `CODSettlementSaga` started → `Error: Verification Failed: Invalid or
  expired OTP` at `cod-settlement.saga.ts:73` → **`fully compensated`**, with **no**
  `Settling COD transaction` line;
- correct code → new `CODSettlementSaga` → **`Settling COD transaction`** →
  **`completed`**.

So settlement happens exactly once, only after a valid OTP — the structural claim
BLG-027 makes about the split sagas, observed on the running system rather than
inferred from unit tests.

**Full-suite failures encountered along the way were environmental, not regressions.**
An intermediate full run reported 139/149; all 10 failures were in `delivery.e2e` and
`supplier-production.e2e` and were caused by the server itself — Prisma
`connection pool timeout` errors that killed the process mid-run (`fetch failed`),
plus runs starting while the app still answered `503 Application bootstrap in
progress`. Both suites pass 20/20 in isolation against a healthy server, and the
final clean run above is 149/149. Note this as an operational hazard: the e2e suite
assumes a long-lived server, and pool exhaustion manifests as test failures that look
like product defects.
