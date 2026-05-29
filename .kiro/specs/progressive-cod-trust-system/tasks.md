# Implementation Plan

- [x] 1. Database schema — add COD trust tables
  - Add three new Prisma models to `prisma/schema.prisma`:
    - `order_CODTrustScore` — stores current score (0–100) and denormalised tier per buyer
    - `order_CODScoreEvent` — immutable append-only event log (signalType, delta, scoreBefore, scoreAfter, sourceService, sourceEntityId, createdAt)
    - `order_CODRestriction` — time-bounded or permanent COD suspensions (buyerId, reason, startAt, endsAt, permanent)
  - Run `npx prisma migrate dev --name add-cod-trust-system` to generate and apply the migration
  - Run `npx prisma generate` to regenerate the Prisma client
  - _Requirements: 1.1, 1.4, 7.1, 9.1_

- [x] 2. Domain layer — pure scoring functions and types
  - Create `services/order-service/src/domain/engines/cod-trust/trust-signal.types.ts`:
    - Export `TrustSignalType` enum with all 8 signal types
    - Export `TrustTier` type: `'NEW_BUYER' | 'TRUSTED_BEGINNER' | 'TRUSTED_BUYER'`
    - Export `SIGNAL_WEIGHTS` map: `Record<TrustSignalType, number>`
  - Create `services/order-service/src/domain/engines/cod-trust/trust-score.functions.ts`:
    - Export pure function `applySignal(currentScore: number, signal: TrustSignalType): number` — clamps result to [0, 100]
    - Export pure function `deriveTier(score: number): TrustTier` — 0–20 → NEW_BUYER, 21–40 → TRUSTED_BEGINNER, 41–100 → TRUSTED_BUYER
    - Export pure function `getCODLimit(tier: TrustTier): number | null` — 30000 / 150000 / null
  - _Requirements: 1.2, 1.6, 2.1–2.5, 3.1–3.6_

- [x] 3. PBT — pure function correctness properties
  - Create `services/order-service/src/__tests__/cod-trust/trust-score-functions.pbt.test.ts`
  - Write property-based tests using `fast-check`:
    - **Property 1 — Score bounds**: for all `score ∈ [0, 100]` and all `TrustSignalType`, `applySignal(score, signal) ∈ [0, 100]`
    - **Property 2 — Tier completeness**: for all integers in [0, 100], `deriveTier(score)` returns exactly one of the three tiers (no gaps, no overlaps)
    - **Property 3 — Score round-trip**: for any sequence of signals applied from score 0, the final score equals replaying the deltas clamped at each step
    - **Property 4 — Monotone positive signals**: applying a positive signal to score < 100 never decreases the score
    - **Property 5 — Monotone negative signals**: applying a negative signal to score > 0 never increases the score
  - Run tests and confirm all pass before proceeding
  - _Requirements: 1.6, 2.5, 3.1–3.6_

- [x] 4. Repository interfaces and Prisma implementations
  - Create `services/order-service/src/domain/repositories/cod-trust-score.repository.ts`:
    - `ICODTrustScoreRepository` interface: `findByBuyerId`, `upsert`
  - Create `services/order-service/src/domain/repositories/cod-score-event.repository.ts`:
    - `ICODScoreEventRepository` interface: `append`, `findByBuyerId`
  - Create `services/order-service/src/domain/repositories/cod-restriction.repository.ts`:
    - `ICODRestrictionRepository` interface: `findActiveByBuyerId`, `save`, `extendRestriction`
  - Create Prisma implementations in `services/order-service/src/infrastructure/repositories/`:
    - `prisma-cod-trust-score.repository.ts`
    - `prisma-cod-score-event.repository.ts`
    - `prisma-cod-restriction.repository.ts`
  - _Requirements: 1.4, 1.5, 7.1–7.5, 9.1–9.2_

- [x] 5. TrustSignalIngestionService
  - Create `services/order-service/src/application/services/trust-signal-ingestion.service.ts`
  - Implement `recordSignal(dto: { buyerId, signalType, sourceService, sourceEntityId })`:
    1. Validate buyerId exists (reject with error if unknown)
    2. Look up delta from `SIGNAL_WEIGHTS`
    3. Load current score (default 0 if no record)
    4. Compute `newScore = applySignal(currentScore, signalType)`
    5. Derive `newTier = deriveTier(newScore)`
    6. In a single DB transaction: append `order_CODScoreEvent` + upsert `order_CODTrustScore`
    7. Publish `CODScoreUpdated` domain event only after successful persistence
    8. If persistence fails → do NOT publish event, throw error
  - _Requirements: 1.3, 1.4, 4.1–4.9, 9.3–9.4_

- [x] 6. ProgressiveCODEligibilityEngine
  - Create `services/order-service/src/domain/engines/progressive-cod-eligibility.engine.ts`
  - Implement the same interface as `CODEligibilityEngine`:
    - `checkBuyerEligibility(buyerId: string): Promise<EligibilityResult>`
      1. Check active restrictions (temporary or permanent) → ineligible if found
      2. Load score (default 0) → derive tier
      3. Return eligible with tier/score metadata
    - `checkSellerEligibility(sellerId: string): Promise<EligibilityResult>`
      1. Call `authService.isUserVerified(sellerId)` → ineligible if false
      2. Return eligible
    - `checkOrderEligibility(order: Order, sellerAddress: any): Promise<EligibilityResult>`
      1. Load buyer's tier and COD limit
      2. Value check: `order.totalAmount > codLimit` → ineligible
      3. Geographic check (NEW_BUYER only): delivery city ≠ seller city → ineligible
      4. Concurrency check (NEW_BUYER only): active COD orders ≥ 1 → ineligible
      5. Area support: `logisticsService.isCODSupportedInArea` → ineligible if false
      6. High-risk item: check `codAccepted` on product → ineligible if any item false
      7. All pass → eligible
  - _Requirements: 5.1–5.6, 6.1–6.7, 8.1–8.5, 10.1–10.4_

- [x] 7. Unit and integration tests for ProgressiveCODEligibilityEngine
  - Create `services/order-service/src/__tests__/cod-trust/progressive-cod-eligibility.test.ts`
  - Test `checkBuyerEligibility`:
    - New buyer (score 0, no restrictions) → eligible
    - Buyer with active temporary restriction → ineligible
    - Buyer with permanent restriction → ineligible with `COD_PERMANENTLY_DISABLED`
  - Test `checkOrderEligibility`:
    - NEW_BUYER with order TZS 25,000 → eligible
    - NEW_BUYER with order TZS 35,000 → ineligible (exceeds TZS 30k limit)
    - NEW_BUYER with cross-city delivery → ineligible
    - NEW_BUYER with 1 existing active COD order → ineligible (concurrency limit)
    - TRUSTED_BEGINNER with order TZS 140,000 → eligible
    - TRUSTED_BEGINNER with order TZS 160,000 → ineligible (exceeds TZS 150k)
    - TRUSTED_BUYER with order TZS 2,000,000 → eligible (no limit)
    - Order with `codAccepted = false` product → ineligible with `HIGH_RISK_ITEM`
  - Test `checkSellerEligibility`:
    - Verified seller → eligible
    - Unverified seller → ineligible with `SELLER_NOT_VERIFIED`
  - _Requirements: 5.1–5.6, 6.1–6.7, 10.1–10.4_

- [x] 8. Wire ProgressiveCODEligibilityEngine into DI
  - Update `services/order-service/src/main.ts`:
    - Import and instantiate `ProgressiveCODEligibilityEngine` with its repositories
    - Replace `CODEligibilityEngine` injection in `PlaceOrderUseCase` constructor
  - Update `services/order-service/index.ts` (monolith mode):
    - Same replacement in `OrderModule.initialize`
  - Verify `PlaceOrderUseCase` constructor signature is unchanged (no modifications needed)
  - _Requirements: 8.1–8.5_

- [x] 9. Database migration — seed initial scores
  - Create migration script `scripts/migrations/seed-cod-trust-scores.ts`:
    - For all existing buyers: insert `order_CODTrustScore` with score = 0, tier = NEW_BUYER
    - For buyers with ≥ 1 historical successful COD delivery: apply `SUCCESSFUL_DELIVERY` signal retroactively via `TrustSignalIngestionService`
  - Run script against dev database and verify scores are seeded correctly
  - _Requirements: 1.1, 1.5_

- [x] 10. Event listeners — wire trust signal ingestion to domain events
  - In `services/order-service/src/main.ts` and `index.ts`, subscribe to:
    - `OrderDelivered` → call `trustSignalIngestionService.recordSignal({ signalType: 'SUCCESSFUL_DELIVERY', ... })`
    - `OrderDelivered` where `amount > 100000` → also record `HIGH_VALUE_COMPLETION`
    - `OrderCancelled` where status was `dispatched` → record `POST_DISPATCH_CANCELLATION`
    - `DisputeResolved` where buyer at fault → record `DISPUTE_LOST`
  - In auth-service event bridge: subscribe to `PhoneVerified` → record `PHONE_VERIFIED`
  - In logistics-service event bridge: subscribe to `CourierReportSubmitted` → record `DELIVERY_REFUSED` or `COURIER_NEGATIVE_REPORT` based on outcome
  - _Requirements: 4.1–4.8_

- [x] 11. Checkpoint — run full test suite and integration test
  - Run `cd services/order-service && npx jest --testPathPattern="cod-trust" --forceExit`
  - Confirm all PBT properties pass (score bounds, tier completeness, round-trip)
  - Confirm all unit/integration tests pass
  - Run `node scripts/testing/test-full-payment-flows.js` and confirm COD test section passes for a buyer with score 0 (New_Buyer tier, order ≤ TZS 30k)
  - Ensure all tests pass; ask the user if questions arise
