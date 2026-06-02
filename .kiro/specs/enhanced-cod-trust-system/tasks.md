# Implementation Plan: Enhanced COD Trust System

## Overview

Replaces `ProgressiveCODEligibilityEngine` (3-tier, score-only) with a 5-tier, dual-axis engine. Migration follows four phases: database first, then domain layer, then infrastructure, then integration. Each task is independently deployable and rollback-safe.

## Tasks

- [ ] 1. Database migration — new columns and new tables
  - [x] 1.1 Add `lifetimeCODValue` and `activeExposure` columns to `order_cod_trust_scores`
    - Create `prisma/migrations/YYYYMMDD_enhance_cod_trust_system/migration.sql`
    - `ALTER TABLE "order_cod_trust_scores" ADD COLUMN "lifetimeCODValue" BIGINT NOT NULL DEFAULT 0, ADD COLUMN "activeExposure" BIGINT NOT NULL DEFAULT 0`
    - Add composite index `order_cod_trust_scores_buyerId_activeExposure_idx`
    - _Requirements: 4.1, 4.3_
  - [x] 1.2 Create `order_cod_identity_links` table
    - Columns: id, accountAId, accountBId, attributeType, attributeHash, disputedAt (nullable), createdAt
    - Indexes on accountAId, accountBId, attributeHash
    - _Requirements: 5.1, 5.6_
  - [x] 1.3 Create `order_cod_risk_assessments` table
    - Columns: id, buyerId, orderId (unique), riskLevel, activeFactors (JSONB), requiresCommitmentFee, requiresManualReview, createdAt
    - Indexes on (buyerId, createdAt) and unique on orderId
    - _Requirements: 7.7_
  - [x] 1.4 Create `order_seller_cod_risk` and `order_seller_cod_risk_events` tables
    - `order_seller_cod_risk`: id, sellerId (unique), disputeRate, codSuspended, suspendedAt, reinstatedAt, lastComputedAt, createdAt, updatedAt
    - `order_seller_cod_risk_events`: id, sellerId, eventType, signalType (nullable), disputeRateAtEvent, createdAt
    - _Requirements: 10.1, 10.7_
  - [x] 1.5 Update `prisma/schema.prisma` with new and modified models
    - Add `lifetimeCODValue BigInt` and `activeExposure BigInt` fields to `OrderCodTrustScore` model
    - Add new models: `OrderCodIdentityLink`, `OrderCodRiskAssessment`, `OrderSellerCodRisk`, `OrderSellerCodRiskEvent`
    - Run `prisma generate` to regenerate the Prisma client
    - _Requirements: 4.1, 5.6, 7.7, 10.7_

- [x] 2. Domain types — extend TrustTier, TrustSignalType, SIGNAL_WEIGHTS, TrustScoreRecord
  - [x] 2.1 Extend `TrustSignalType` enum in `trust-signal.types.ts`
    - Add new courier sub-types: `COURIER_UNREACHABLE_CUSTOMER` (−5), `COURIER_SUSPICIOUS_ADDRESS` (−10), `COURIER_REPEATED_REFUSAL` (−20), `COURIER_FAKE_PHONE` (−12)
    - Add seller signals: `SELLER_WRONG_ITEM_SHIPPED` (0), `SELLER_EMPTY_PACKAGE` (0)
    - Mark `COURIER_NEGATIVE_REPORT` as deprecated with JSDoc comment
    - Update `SIGNAL_WEIGHTS` record with all new entries
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 10.2, 10.3_
  - [x] 2.2 Extend `TrustTier` type and `TrustScoreRecord` interface in `trust-signal.types.ts`
    - Extend `TrustTier` union type to include `'GOLD_BUYER'` and `'PLATINUM_BUYER'`
    - Add `lifetimeCODValue: number` and `activeExposure: number` fields to `TrustScoreRecord`
    - _Requirements: 1.1, 2.1–2.4, 4.1_
  - [x] 2.3 Extend `EligibilityResult` interface in `cod-eligibility.engine.ts`
    - Add optional fields: `requiresCommitmentFee?: boolean`, `requiresManualReview?: boolean`, `commitmentFeeAmount?: number`
    - _Requirements: 7.3, 7.4, 11.4_

- [x] 3. Pure functions — update deriveTier (dual-axis), add getExposureLimit, getConcurrentOrderLimit, getRadiusKm, haversineDistanceKm
  - [x] 3.1 Update `deriveTier` in `trust-score.functions.ts` to dual-axis signature
    - Change signature to `deriveTier(score: number, lifetimeCODValue: number): TrustTier`
    - Implement 5-tier thresholds: PLATINUM (≥85, ≥10M), GOLD (≥65, ≥2M), TRUSTED_BUYER (≥41, ≥500K), TRUSTED_BEGINNER (≥21, ≥100K), NEW_BUYER (fallback)
    - Keep `getCODLimit` as a deprecated alias for `getExposureLimit`
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_
  - [x] 3.2 Add `getExposureLimit` to `trust-score.functions.ts`
    - Returns TZS limits per tier: NEW_BUYER 30K, TRUSTED_BEGINNER 150K, TRUSTED_BUYER 500K, GOLD_BUYER 2M, PLATINUM_BUYER 10M
    - _Requirements: 1.2, 1.3, 1.4, 1.5, 1.6_
  - [x] 3.3 Add `getConcurrentOrderLimit` to `trust-score.functions.ts`
    - Returns per-tier limits: 1, 2, 3, 5, Infinity
    - _Requirements: 1.7_
  - [x] 3.4 Add `getRadiusKm` to `trust-score.functions.ts`
    - Returns: NEW_BUYER 24, TRUSTED_BEGINNER 50, TRUSTED_BUYER null (same-region), GOLD_BUYER null, PLATINUM_BUYER null
    - _Requirements: 3.1, 3.2, 3.3, 3.4_
  - [x] 3.5 Add `haversineDistanceKm` pure function to `trust-score.functions.ts`
    - Implements Haversine formula using Earth radius 6371 km
    - Pure function, no I/O, returns distance in km
    - _Requirements: 3.6, 3.8_
  - [x] 3.6 Update `replayScore` in `trust-score.functions.ts` for backward-compat replay
    - Map legacy `COURIER_NEGATIVE_REPORT` events to `COURIER_UNREACHABLE_CUSTOMER` weight (−5) during replay
    - _Requirements: 8.6, 12.3_

- [x] 4. WardCentroidResolver — load tanzania_national.json, resolveWardCentroid
  - [x] 4.1 Create `ward-centroid.resolver.ts` in `services/order-service/src/domain/engines/cod-trust/`
    - Implement `WardCentroidResolver` class with `Map<number, { lat: number; lng: number }>` field
    - Implement `buildMap(data: TanzaniaLocationData)` that flattens regions → districts → wards, including only wards with lat/lng
    - Implement `resolveWardCentroid(wardCode: number): { lat: number; lng: number } | null`
    - Implement `loadWardCentroidResolver()` factory that `require`s `../../../../locations/tanzania_national.json`
    - _Requirements: 3.6, 3.7, 3.8_

- [x] 5. PerOrderRiskAssessor — 5 risk factors, LOW/MEDIUM/HIGH levels, persist to order_cod_risk_assessments
  - [x] 5.1 Create `per-order-risk.assessor.ts` in `services/order-service/src/domain/engines/cod-trust/`
    - Define `RiskFactor` union type: `'NEW_DEVICE' | 'NEW_ADDRESS' | 'HIGH_RELATIVE_VALUE' | 'HIGH_VELOCITY' | 'HIGH_RISK_CATEGORY'`
    - Define `RiskAssessmentResult` interface with `level`, `activeFactors`, `requiresCommitmentFee`, `requiresManualReview`
    - Implement `PerOrderRiskAssessor` class with `assess(order: Order): Promise<RiskAssessmentResult>`
    - Risk level mapping: 0 factors → LOW, 1–2 → MEDIUM (commitment fee), 3+ → HIGH (commitment fee + manual review)
    - Persist each assessment as an immutable record via `ICODRiskAssessmentRepository`
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8_
  - [x] 5.2 Define `ICODRiskAssessmentRepository` interface in the domain repositories folder
    - Methods: `save(assessment: RiskAssessmentRecord): Promise<void>`, `findByOrderId(orderId: string): Promise<RiskAssessmentRecord | null>`
    - _Requirements: 7.7_

- [ ] 6. IdentityGraphService — account linking, score propagation, negative signal propagation
  - [x] 6.1 Create `identity-graph.service.ts` in `services/order-service/src/domain/engines/cod-trust/`
    - Define `IdentityAttributeType` union: `'PHONE' | 'NATIONAL_ID' | 'DEVICE' | 'ADDRESS'`
    - Define `IdentityLink` interface
    - Implement `onAccountCreated(newAccountId, attributes)`: find matching accounts by attribute hash, create edges, propagate worst score and active restrictions
    - Implement `propagateNegativeSignal(accountId, signal, sourceEntityId)`: fan out signal to all linked accounts
    - Implement `getLinkedAccounts(accountId): Promise<string[]>`
    - Implement `disputeLink(linkId)`: set `disputedAt` without removing the link
    - Score propagation rule: new account inherits `min(existingScore, newAccountScore)`
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7_
  - [x] 6.2 Define `ICODIdentityLinksRepository` interface in the domain repositories folder
    - Methods: `save(link: IdentityLink): Promise<void>`, `findByAccountId(accountId: string): Promise<IdentityLink[]>`, `findByAttributeHash(hash: string): Promise<IdentityLink[]>`, `setDisputedAt(linkId: string, disputedAt: Date): Promise<void>`
    - _Requirements: 5.6_

- [x] 7. SellerCODRiskService — rolling 30-day dispute rate, suspension/reinstatement
  - [x] 7.1 Create `seller-cod-risk.service.ts` in `services/order-service/src/domain/engines/cod-trust/`
    - Implement `isSellerCODSuspended(sellerId: string): Promise<boolean>`
    - Implement `recordSellerFaultSignal(sellerId, signalType, orderId)`: recompute rolling 30-day dispute rate, suspend if >15% (min 5 orders), reinstate if <10% after suspension
    - Implement `getDisputeRate(sellerId: string): Promise<number>`
    - Emit `SUSPENDED` and `REINSTATED` events to `ISellerCODRiskEventRepository`
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.6, 10.7, 10.8_
  - [x] 7.2 Define `ISellerCODRiskRepository` and `ISellerCODRiskEventRepository` interfaces
    - `ISellerCODRiskRepository`: `findBySellerId`, `upsert`, methods for suspension/reinstatement state
    - `ISellerCODRiskEventRepository`: `save(event)`, `findBySellerIdSince(sellerId, since)`
    - _Requirements: 10.7_

- [x] 8. EnhancedCODEligibilityEngine — drop-in replacement with 6-step fail-fast pipeline + getCODEligibilityForListing
  - [x] 8.1 Create `enhanced-cod-eligibility.engine.ts` in `services/order-service/src/domain/engines/`
    - Implement `EnhancedCODEligibilityEngine` class with same constructor dependencies as design
    - Implement `checkBuyerEligibility(buyerId)`: phone verification + active restriction checks (unchanged logic)
    - Implement `checkSellerEligibility(sellerId)`: phone verification + `SellerCODRiskService.isSellerCODSuspended` check, return `SELLER_HIGH_DISPUTE_RATE` if suspended
    - _Requirements: 11.1, 11.2, 10.4_
  - [x] 8.2 Implement `checkOrderEligibility` 6-step fail-fast pipeline
    - Step 1: Load `scoreRecord` (throw on failure — not fail-open), derive tier via `deriveTier(score, lifetimeCODValue)`
    - Step 2: Exposure check — `activeExposure + orderAmount > getExposureLimit(tier)` → `LIMIT_EXCEEDED`
    - Step 3: Concurrent order count — `activeCODOrders >= getConcurrentOrderLimit(tier)` → `CONCURRENT_LIMIT_EXCEEDED`
    - Step 4: Geographic check via `checkGeographic` (Haversine for NEW_BUYER/TRUSTED_BEGINNER, region for TRUSTED_BUYER, none for GOLD/PLATINUM) → `AREA_RESTRICTION`
    - Step 5: Logistics area support → `UNSUPPORTED_AREA`
    - Step 6: High-risk item check → `HIGH_RISK_ITEM`; then `PerOrderRiskAssessor.assess` → populate `requiresCommitmentFee`/`requiresManualReview`
    - Implement private `checkGeographic(order, sellerAddress, tier)` using `WardCentroidResolver` and `haversineDistanceKm`, with region-level fallback when ward codes are missing
    - _Requirements: 1.7, 1.8, 3.1–3.8, 7.1–7.6, 11.3_
  - [x] 8.3 Implement `getCODEligibilityForListing(buyerId, productId, price)`
    - Returns `ListingEligibilityResult` with `codAvailable`, optional `codUnavailableReason`, optional `encouragementMessage`
    - Does NOT expose score, tier, or lifetimeCODValue
    - Returns `codAvailable: false, codUnavailableReason: 'ACCOUNT_RESTRICTION'` for unauthenticated buyers
    - Must complete within 200ms
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.8, 9.9_

- [x] 9. Repository extensions — lifetimeCODValue/activeExposure on trust score repo; new repos for identity links, risk assessments, seller COD risk
  - [x] 9.1 Extend `prisma-cod-trust-score.repository.ts` with new read/write methods
    - Add `incrementLifetimeCODValue(buyerId: string, amount: number): Promise<void>`
    - Add `decrementActiveExposure(buyerId: string, amount: number): Promise<void>`
    - Add `incrementActiveExposure(buyerId: string, amount: number): Promise<void>`
    - Add `setDisputeWindowExpiry(orderId: string, expiresAt: Date): Promise<void>`
    - Add `getDisputeWindowExpiry(orderId: string): Promise<Date | null>`
    - Add `suspendLifetimeCODValueIncrement(orderId: string): Promise<void>`
    - Ensure `findByBuyerId` returns `lifetimeCODValue` and `activeExposure` fields
    - Update `ICODTrustScoreRepository` interface with all new method signatures
    - _Requirements: 4.1, 4.2, 4.3, 6.2, 6.4_
  - [x] 9.2 Create `prisma-cod-identity-links.repository.ts` in `services/order-service/src/infrastructure/repositories/`
    - Implement `ICODIdentityLinksRepository` interface using Prisma `OrderCodIdentityLink` model
    - _Requirements: 5.6_
  - [x] 9.3 Create `prisma-cod-risk-assessment.repository.ts` in `services/order-service/src/infrastructure/repositories/`
    - Implement `ICODRiskAssessmentRepository` interface using Prisma `OrderCodRiskAssessment` model
    - _Requirements: 7.7_
  - [x] 9.4 Create `prisma-seller-cod-risk.repository.ts` in `services/order-service/src/infrastructure/repositories/`
    - Implement `ISellerCODRiskRepository` and `ISellerCODRiskEventRepository` interfaces using Prisma `OrderSellerCodRisk` and `OrderSellerCodRiskEvent` models
    - _Requirements: 10.7_

- [ ] 10. Event handlers — OrderDeliveryConfirmedHandler, DisputeRaisedHandler
  - [x] 10.1 Create `order-delivery-confirmed.handler.ts` in `services/order-service/src/infrastructure/messaging/`
    - Define `OrderDeliveryConfirmedPayload` interface (orderId, buyerId, sellerId, orderAmount, currency, confirmedAt)
    - Implement `OrderDeliveryConfirmedHandler.handle(payload)`:
      1. Verify order is COD — return early if not
      2. Record `SUCCESSFUL_DELIVERY` signal via `TrustSignalIngestionService`
      3. Call `trustScoreRepo.incrementLifetimeCODValue(buyerId, orderAmount)`
      4. Call `trustScoreRepo.decrementActiveExposure(buyerId, orderAmount)`
      5. Call `trustScoreRepo.setDisputeWindowExpiry(orderId, confirmedAt + 7 days)`
    - _Requirements: 6.1, 6.2, 6.3, 6.6_
  - [x] 10.2 Create `dispute-raised.handler.ts` in `services/order-service/src/infrastructure/messaging/`
    - Define `DisputeRaisedPayload` interface (disputeId, orderId, buyerId, raisedAt)
    - Implement `DisputeRaisedHandler.handle(payload)`:
      1. Fetch `disputeWindowExpiry` — return early if null
      2. Return early if `raisedAt > disputeWindowExpiry`
      3. Record compensating event via `TrustSignalIngestionService.recordCompensatingEvent`
      4. Call `trustScoreRepo.suspendLifetimeCODValueIncrement(orderId)`
    - _Requirements: 6.4, 6.5, 6.7_

- [ ] 11. Feature flag wiring — wire EnhancedCODEligibilityEngine into DI container behind COD_ENHANCED_ENGINE_ENABLED flag
  - [x] 11.1 Register all new domain services and repositories in the order-service DI container
    - Register `WardCentroidResolver` as a singleton (loaded once at startup via `loadWardCentroidResolver()`)
    - Register `PerOrderRiskAssessor`, `IdentityGraphService`, `SellerCODRiskService`
    - Register `PrismaCODIdentityLinksRepository`, `PrismaCODRiskAssessmentRepository`, `PrismaSellerCODRiskRepository`
    - _Requirements: 11.5_
  - [x] 11.2 Wire `EnhancedCODEligibilityEngine` behind `COD_ENHANCED_ENGINE_ENABLED` feature flag
    - Read `COD_ENHANCED_ENGINE_ENABLED` from environment/config
    - When `true`: inject `EnhancedCODEligibilityEngine` into `PlaceOrderUseCase`
    - When `false` (default): inject existing `ProgressiveCODEligibilityEngine` (unchanged)
    - Both engines share the same `ICODTrustScoreRepository` instance
    - _Requirements: 11.1, 11.2, 11.3, 11.5_
  - [x] 11.3 Register `OrderDeliveryConfirmedHandler` and `DisputeRaisedHandler` as event subscribers
    - Subscribe `OrderDeliveryConfirmedHandler` to `OrderDeliveryConfirmed.v1`
    - Subscribe `DisputeRaisedHandler` to `DisputeRaised.v1`
    - _Requirements: 6.1, 6.3_

- [ ] 12. Property-based tests — all 8 correctness properties using fast-check
  - Create `services/order-service/src/__tests__/cod-trust/enhanced-cod-trust.pbt.test.ts`
  - [ ]* 12.1 Write property test for Property 1: Score Bounds Invariant
    - For any score ∈ [0, 100] and any `TrustSignalType`, `applySignal(score, signal)` returns integer ∈ [0, 100]
    - Include all new courier sub-types in the `constantFrom` set
    - 500 iterations
    - **Validates: Requirements 12.1**
  - [ ]* 12.2 Write property test for Property 2: Tier Completeness
    - For any score ∈ [0, 100] and any non-negative lifetime value, `deriveTier` returns exactly one of the 5 valid `TrustTier` values
    - 500 iterations
    - **Validates: Requirements 1.1, 12.6**
  - [ ]* 12.3 Write property test for Property 3: Exposure Limit Invariant
    - For any sequence of PLACE/COMPLETE events, `activeExposure` never exceeds `getExposureLimit(tier)` at any point
    - 200 iterations
    - **Validates: Requirements 1.9, 4.6**
  - [ ]* 12.4 Write property test for Property 4: Dual-Axis Invariant
    - For any (score, lifetime) pair, `deriveTier` returns tier T only if both score and lifetime thresholds for T are satisfied, and no higher tier has both thresholds satisfied
    - 500 iterations
    - **Validates: Requirements 2.8**
  - [ ]* 12.5 Write property test for Property 5: Identity Graph Monotonicity
    - For any two accounts with scores A and B, after linking, no account has a higher effective score than before linking
    - 100 iterations
    - **Validates: Requirements 5.8**
  - [ ]* 12.6 Write property test for Property 6: Delivery Confirmation State Machine
    - For any (confirmedAt, optional disputeRaisedAt) pair, `SUCCESSFUL_DELIVERY` is present iff confirmed AND no dispute within 7 days
    - 100 iterations
    - **Validates: Requirements 6.7**
  - [ ]* 12.7 Write property test for Property 7: Radius Monotonicity
    - Exhaustive enumeration of all tier pairs: `getRadiusKm(higherTier) ?? Infinity >= getRadiusKm(lowerTier) ?? Infinity`
    - **Validates: Requirements 3.9**
  - [ ]* 12.8 Write property test for Property 8: Score Determinism
    - For any sequence of signals, `replayScore(events)` reproduces the live score exactly
    - 300 iterations
    - **Validates: Requirements 12.3, 12.7**

- [ ] 13. Unit tests — all unit tests from the testing strategy section of the design
  - [ ]* 13.1 Write unit tests for `trust-score.functions.ts`
    - `deriveTier` boundary values: (20, 0) → NEW_BUYER; (21, 99_999) → NEW_BUYER; (21, 100_000) → TRUSTED_BEGINNER; (84, 9_999_999) → GOLD_BUYER; (85, 10_000_000) → PLATINUM_BUYER
    - `getExposureLimit` for each of the 5 tiers
    - `getConcurrentOrderLimit` for each tier
    - `getRadiusKm` for each tier (null for TRUSTED_BUYER, GOLD_BUYER, PLATINUM_BUYER)
    - `haversineDistanceKm`: Kivukoni (−6.810412, 39.291643) to Upanga Mashariki (−6.806953, 39.281699) ≈ 0.9 km
    - _Requirements: 1.2–1.6, 2.1–2.6, 3.1–3.4_
  - [ ]* 13.2 Write unit tests for `ward-centroid.resolver.ts`
    - Ward code 11101 resolves to `{ lat: -6.810412, lng: 39.291643 }`
    - Unknown ward code returns `null`
    - All 3,054 coordinate-bearing wards are loaded (count assertion)
    - _Requirements: 3.6, 3.7_
  - [ ]* 13.3 Write unit tests for `enhanced-cod-eligibility.engine.ts`
    - Fail-fast ordering: exposure fires before concurrent, concurrent before geo, geo before area support, area support before high-risk, high-risk before risk assessment
    - NEW_BUYER: order within 24 km → eligible; order at 25 km → AREA_RESTRICTION
    - TRUSTED_BEGINNER: order within 50 km → eligible; order at 51 km → AREA_RESTRICTION
    - TRUSTED_BUYER: same-region → eligible; cross-region → AREA_RESTRICTION
    - GOLD_BUYER: cross-region → eligible (nationwide)
    - Exposure limit: activeExposure 25,000 + order 10,000 > 30,000 → LIMIT_EXCEEDED for NEW_BUYER
    - Concurrent limit: 1 active COD order for NEW_BUYER → CONCURRENT_LIMIT_EXCEEDED
    - Risk assessment: 0 factors → no friction; 2 factors → requiresCommitmentFee; 3 factors → requiresCommitmentFee + requiresManualReview
    - Seller suspended → SELLER_HIGH_DISPUTE_RATE
    - _Requirements: 1.8, 3.1–3.5, 7.2–7.4, 10.4_
  - [ ]* 13.4 Write unit tests for `per-order-risk.assessor.ts`
    - New device fingerprint → NEW_DEVICE factor active
    - New delivery address → NEW_ADDRESS factor active
    - Order value 3.1× average → HIGH_RELATIVE_VALUE active
    - 4 orders in 24 hours → HIGH_VELOCITY active
    - 0 factors → LOW; 1 factor → MEDIUM; 3 factors → HIGH
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.8_
  - [ ]* 13.5 Write unit tests for `identity-graph.service.ts`
    - New account with matching phone → link created, lower score propagated
    - Negative signal on account A → propagated to all linked accounts
    - Disputed link → flagged, not removed
    - _Requirements: 5.2, 5.3, 5.7_
  - [ ]* 13.6 Write unit tests for `seller-cod-risk.service.ts`
    - 3 disputes / 20 orders (15%) → not suspended (at threshold, not above)
    - 4 disputes / 20 orders (20%) → suspended
    - After suspension, rate drops to 9% → reinstated
    - Fewer than 5 orders → no threshold check applied
    - _Requirements: 10.4, 10.6, 10.8_
  - [ ]* 13.7 Write unit tests for `order-delivery-confirmed.handler.ts`
    - Non-COD order → no signal recorded
    - COD order → SUCCESSFUL_DELIVERY recorded, lifetimeCODValue incremented, activeExposure decremented, dispute window set
    - _Requirements: 6.1, 6.2, 6.3_
  - [ ]* 13.8 Write unit tests for `dispute-raised.handler.ts`
    - Dispute within 7 days → SUCCESSFUL_DELIVERY reversed, lifetimeCODValue suspended
    - Dispute after 7 days → no reversal
    - No delivery confirmation recorded → no action
    - _Requirements: 6.4, 6.5, 6.7_

- [x] 14. Backfill job — one-time backfill of lifetimeCODValue and activeExposure from historical data
  - [x] 14.1 Create backfill job in `services/order-service/src/infrastructure/jobs/`
    - For each buyer in `order_cod_trust_scores`, sum order amounts from `order_cod_score_events` where `signalType = 'SUCCESSFUL_DELIVERY'` joined with the order table to get amounts; set `lifetimeCODValue`
    - Query active COD orders (non-terminal status) for each buyer; set `activeExposure` to their sum
    - Process in batches of 100 buyers with 10ms sleep between batches to avoid contention
    - Job must be idempotent — safe to re-run without double-counting
    - _Requirements: 4.1, 4.6_
  - [x] 14.2 Add a dry-run mode and completion logging to the backfill job
    - Dry-run mode logs what would be updated without writing to the database
    - Log total buyers processed, total lifetimeCODValue set, total activeExposure set on completion
    - _Requirements: 4.1_

- [x] 15. Final checkpoint — Ensure all tests pass
  - Run `vitest --run` in `services/order-service` and confirm all unit and property-based tests pass
  - Verify TypeScript compilation has no errors (`tsc --noEmit`)
  - Confirm `prisma generate` succeeds with the updated schema
  - Ask the user if any questions arise before proceeding to feature flag cutover.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Each task references specific requirements for traceability
- The migration is zero-downtime: database (task 1) → domain (tasks 2–8) → infrastructure (task 9) → integration (tasks 10–11) → backfill (task 14)
- Property tests (task 12) validate universal correctness properties; unit tests (task 13) validate specific examples and edge cases
- The feature flag (`COD_ENHANCED_ENGINE_ENABLED`) enables instant rollback at any point after task 11
