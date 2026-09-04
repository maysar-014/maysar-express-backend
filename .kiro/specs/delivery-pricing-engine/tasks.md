# Implementation Plan: Delivery Pricing Engine

## Overview

Implement a server-authoritative delivery fee system in `logistics-service`, expose a `POST /api/logistics/v1/quote` endpoint, and harden `checkout-service` to reject client-supplied shipping costs. The implementation follows the 11-stage pricing pipeline defined in the design, reuses existing routing and location infrastructure, and closes the checkout security gap identified in the requirements.

All code is TypeScript. Property-based tests use **fast-check** (already present in the monorepo). Unit and integration tests use **Vitest**.

---

## Tasks

- [x] 1. Prisma schema additions
  - Append the three new Prisma models to `prisma/schema.prisma`: `Logistics_Quote`, `Logistics_PricingConfig`, and `Logistics_PricingAuditRecord`, exactly as specified in the design's *Data Models* section.
  - Add `quoteId String? @db.VarChar(64)` and `pricingVersion Int?` to the existing `Order_Order` model.
  - Add `quoteId String? @db.VarChar(64)` and `pricingVersion Int?` to the existing `Checkout_CheckoutSession` model (or equivalent checkout session table).
  - Run `npx prisma generate` to regenerate the Prisma client after schema changes.
  - Create a migration file: `npx prisma migrate dev --name add_delivery_pricing_engine`.
  - _Requirements: 1.2, 4.5, 5.1, 6.9, 7.1_

- [ ] 2. PricingConfig value object
  - Create `services/logistics-service/src/domain/value-objects/pricing-config.value-object.ts`.
  - Implement all interfaces (`ZoneMultipliers`, `PackageWeightTier`, `OperationalSurchargeSchedule`, `PricingConfigData`) and the `PricingConfig` class with typed getters, `static fromPersisted`, `toJSON`, and a `private validate()` method that throws on invalid field values (negative rates, floor > ceiling, etc.).
  - _Requirements: 1.1, 1.5, 1.8_

  - [ ]* 2.1 Write property test for PricingConfig round-trip serialization
    - **Property 1: PricingConfig round-trip serialization**
    - Use `fc.record(...)` to generate arbitrary valid `PricingConfigData` objects.
    - Assert `JSON.stringify(PricingConfig.fromPersisted(JSON.parse(JSON.stringify(data))).toJSON()) === JSON.stringify(data)`.
    - **Validates: Requirements 1.8**

- [x] 3. CourierCostCalculator
  - Create `services/logistics-service/src/domain/engines/courier-cost-calculator.ts`.
  - Implement `CourierCostEstimate` interface and `CourierCostCalculator` class with the three `private static readonly` constants (`BASE_RATE = 2000`, `DISTANCE_RATE = 500`, `TIME_RATE = 200`) and the `estimate(distanceKm, durationMinutes)` method.
  - The class must NOT inherit from or mutate `EarningsCalculationEngine`.
  - _Requirements: 9.1, 9.2, 9.3_

  - [ ]* 3.1 Write unit tests for CourierCostCalculator
    - Test `estimate(0, 0)` → `totalCompensation === BASE_RATE`.
    - Test `estimate(10, 30)` → `distanceCost === 5000`, `timeCost === 6000`, `totalCompensation === 13000`.
    - Test that `totalCompensation === baseRate + distanceCost + timeCost` for arbitrary inputs.
    - _Requirements: 9.2, 9.3_

- [ ] 4. ZoneClassifier
  - Create `services/logistics-service/src/domain/services/zone-classifier.ts`.
  - Implement `DeliveryZone` type, `ZoneClassificationResult` interface, and `ZoneClassifier` class that accepts a `TanzaniaLocationIndex` dependency.
  - The `classify(origin, destination)` method must call `getLocalitySummary()` on both points and compare `wardName`, `districtName`, and `regionName` following the same locality-inference logic already in `MapsRoutingBridge.inferRouteProfile()`.
  - Return `{ zone: null, unavailable: true, reason: '...' }` only when both points resolve to null locality names.
  - _Requirements: 3.1, 3.2, 3.4, 3.6_

  - [ ]* 4.1 Write property test for zone classification completeness within Tanzania bounding box
    - **Property 10: Zone classification completeness for Tanzania coordinates**
    - Use `fc.tuple(fc.float({min: -11.7, max: -1.0}), fc.float({min: 29.3, max: 40.4}))` for both origin and destination.
    - Assert returned `zone` is one of `['same_ward', 'same_district', 'same_region', 'cross_region']` and `unavailable === false`.
    - **Validates: Requirements 3.1, 3.6**

  - [ ]* 4.2 Write unit tests for ZoneClassifier
    - Test same-ward pair → `zone === 'same_ward'`.
    - Test same-district pair → `zone === 'same_district'`.
    - Test cross-region pair → `zone === 'cross_region'`.
    - Test both-null resolution → `unavailable === true`.
    - _Requirements: 3.1, 3.2, 3.4_

- [x] 5. RoutingProvider port + MapsRoutingAdapter + RoutingCacheDecorator
  - Create `services/logistics-service/src/domain/engines/ports/routing-provider.port.ts` with the `RoutingResult` interface and `RoutingProviderPort` interface.
  - Create `services/logistics-service/src/infrastructure/providers/maps-routing-adapter.ts` implementing `RoutingProviderPort`, wrapping `MapsRoutingBridge` and delegating to `DistanceCalculationAlgorithm` as fallback when the bridge throws.
    - On success: return `{ distanceKm, durationMinutes, source: 'live' }`.
    - On timeout/error: call `DistanceCalculationAlgorithm` fallback and return `{ ..., source: 'fallback' }`.
  - Create `services/logistics-service/src/infrastructure/providers/routing-cache.decorator.ts` implementing `RoutingProviderPort`.
    - Cache key: `${lat1.toFixed(4)},${lng1.toFixed(4)}→${lat2.toFixed(4)},${lng2.toFixed(4)}`.
    - TTL defaults to 5 minutes (`5 * 60 * 1000` ms); configurable via constructor.
    - Cache hit: return cached result with `source: 'cache'`.
    - Cache miss: delegate to inner provider, store result, return with original source.
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6_

  - [ ]* 5.1 Write property test for road distance >= straight-line distance
    - **Property 21: Road distance >= straight-line distance**
    - Use `fc.tuple(fc.float({min:-11.7,max:-1.0}), fc.float({min:29.3,max:40.4}))` for two GeoPoints.
    - Assert `result.distanceKm >= origin.distanceTo(destination)` for `MapsRoutingAdapter`.
    - **Validates: Requirements 8.7**

  - [ ]* 5.2 Write property test for routing cache deduplication
    - **Property 22: Route caching — second identical request returns cache source**
    - Use arbitrary GeoPoint pairs.
    - Assert that a second call within TTL returns `source: 'cache'` and the inner delegate is called exactly once.
    - **Validates: Requirements 8.3, 8.4, 11.4**

  - [ ]* 5.3 Write unit tests for RoutingCacheDecorator
    - Test cache miss → delegates to inner provider and stores result.
    - Test cache hit (within TTL) → returns stored result with `source: 'cache'`, inner not called again.
    - Test cache expiry (past TTL) → re-delegates to inner provider.
    - Test distinct coordinates do not collide in cache.
    - _Requirements: 8.3, 8.4_

- [ ] 6. DeliveryPricingEngine — 11-stage pipeline
  - Create `services/logistics-service/src/domain/engines/delivery-pricing.engine.ts`.
  - Implement all interfaces: `PricingInput`, `PricingBreakdown`, `PricingResult`.
  - Implement `DeliveryPricingEngine` class with the public `compute(input, config)` method and all 11 private stage methods, strictly in order:
    - `stage1_base` → flat `config.baseFee`
    - `stage2_distance` → `distanceKm × config.distanceRateTzsPerKm`
    - `stage3_time` → `durationMinutes × config.timeRateTzsPerMinute`
    - `stage4_packageFactor` → look up `packageWeightKg` in `config.packageWeightTiers`, apply multiplier to (base + distance + time); output both adjusted subtotal and factor value
    - `stage5_zone` → multiply by `config.zoneMultipliers[deliveryZone]`
    - `stage6_operationalSurcharge` → add flat `peakHourSurchargeAmount` if `isOperationalPeakHour`
    - `stage7_riskSurcharge` → add `premarginFee × config.riskSurchargeRateCod` if `isCoD`
    - `stage8_margin` → `marginAmount = Math.round(premarginFee × config.platformMarginPct)`
    - `stage9_clamp` → clamp to `[config.floorPriceTzs, config.ceilingPriceTzs]`
    - `stage10_round` → round up to nearest `config.roundingIncrementTzs`
    - `stage11_final` → assemble `PricingBreakdown` with all component values and return `PricingResult`
  - The engine is stateless and pure — no I/O, no side effects.
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 1.6_

  - [ ]* 6.1 Write property test for platform margin computation correctness
    - **Property 4: Platform margin computation correctness**
    - Use `fc.float({min: 0, max: 1_000_000})` for premarginFee and `fc.float({min: 0, max: 1})` for marginPct.
    - Assert `breakdown.marginAmount === Math.round(premarginFee * marginPct)`.
    - Set `numRuns: 200`.
    - **Validates: Requirements 1.6**

  - [ ]* 6.2 Write property test for pipeline determinism
    - **Property 5: Pipeline determinism (idempotence)**
    - Use arbitrary `PricingInput` and `PricingConfig` generated with fast-check.
    - Assert `JSON.stringify(engine.compute(i, c)) === JSON.stringify(engine.compute(i, c))` for the same arguments.
    - Set `numRuns: 200`.
    - **Validates: Requirements 2.9, 2.11, 4.12**

  - [ ]* 6.3 Write property test for floor/ceiling invariant
    - **Property 6: Floor/ceiling invariant**
    - Generate configs where `floorPrice ≤ ceilingPrice` with `fc.tuple(fc.integer({min:500}), fc.integer({min:0,max:50000}))` mapped to `[min, min+delta]`.
    - Assert `breakdown.finalFee >= config.floorPriceTzs && breakdown.finalFee <= config.ceilingPriceTzs`.
    - Set `numRuns: 200`.
    - **Validates: Requirements 2.6, 2.7, 2.10**

  - [ ]* 6.4 Write property test for rounding increment divisibility
    - **Property 7: Final fee divisible by rounding increment**
    - Use `fc.constantFrom(50, 100, 200, 500)` for `roundingIncrementTzs`.
    - Assert `breakdown.finalFee % config.roundingIncrementTzs === 0`.
    - Set `numRuns: 200`.
    - **Validates: Requirements 2.8, 4.11**

  - [ ]* 6.5 Write property test for distance cost formula
    - **Property 8: Distance cost formula**
    - Use `fc.float({min: 0, max: 500})` for `distanceKm` and `fc.float({min: 0, max: 2000})` for `distanceRateTzsPerKm`.
    - Assert `breakdown.distanceCost === distanceKm * distanceRateTzsPerKm` (before downstream stages modify subtotal).
    - **Validates: Requirements 2.2**

  - [ ]* 6.6 Write property test for time cost formula
    - **Property 9: Time cost formula**
    - Use `fc.float({min: 0, max: 300})` for `durationMinutes` and `fc.float({min: 0, max: 500})` for `timeRateTzsPerMinute`.
    - Assert `breakdown.timeCost === durationMinutes * timeRateTzsPerMinute`.
    - **Validates: Requirements 2.3**

  - [ ]* 6.7 Write unit tests for pipeline stages
    - `stage2_distance(5, config{distanceRate:500})` → `2500`.
    - `stage3_time(30, config{timeRate:200})` → `6000`.
    - `stage9_clamp(1000, config{floor:2000, ceiling:30000})` → `2000` (floor enforcement).
    - `stage9_clamp(50000, config{floor:2000, ceiling:30000})` → `30000` (ceiling enforcement).
    - `stage10_round(4301, config{increment:50})` → `4350`.
    - Full pipeline: assert `breakdown` contains all 14 named component fields.
    - _Requirements: 2.1–2.8_

- [ ] 7. Checkpoint — core domain layer complete
  - Ensure all unit and property tests for tasks 2–6 pass. Ask the user if questions arise.

- [x] 8. Quote entity + QuoteRepository interface + PrismaQuoteRepository
  - Create `services/logistics-service/src/domain/entities/quote.entity.ts` with `QuoteStatus` type, `QuoteData` interface, and `Quote` class (getters: `quoteId`, `status`, `deliveryFee`, `isExpired`; methods: `markConsumed()`, `toResponse()`).
  - Create `services/logistics-service/src/domain/repositories/quote.repository.ts` with the `QuoteRepository` interface (`save`, `findById`, `markConsumed`, `markExpired`).
  - Create `services/logistics-service/src/infrastructure/repositories/prisma-quote.repository.ts` implementing `QuoteRepository` using the Prisma `Logistics_Quote` model.
    - `save`: upsert the full `QuoteData` including `breakdown` as JSON.
    - `findById`: reconstruct a `Quote` from the persisted row; return `null` if not found.
    - `markConsumed`: `UPDATE SET status='CONSUMED', consumedAt=now() WHERE id=quoteId`.
    - `markExpired`: `UPDATE SET status='EXPIRED' WHERE id=quoteId`.
  - _Requirements: 4.5, 5.1, 5.2, 5.5, 5.6_

  - [ ]* 8.1 Write property test for quote lifecycle initial state
    - **Property 15: Quote lifecycle state machine — initial state**
    - For any non-UNAVAILABLE quote created by `RequestDeliveryQuoteUseCase`, assert `quote.status === 'ACTIVE'` immediately after `save`.
    - **Validates: Requirements 5.2**

  - [ ]* 8.2 Write property test for quote expiry time ordering
    - **Property 14: Quote expiry time ordering**
    - Use arbitrary `quoteValiditySeconds` in `[1, 86400]`.
    - Assert `quote.issuedAt < quote.expiresAt` and `Math.abs((expiresAt - issuedAt) / 1000 - validitySeconds) < 2`.
    - **Validates: Requirements 4.6, 5.8**

  - [ ]* 8.3 Write property test for quote uniqueness
    - **Property 13: Quote uniqueness**
    - Generate N ≥ 10 sequential `execute` calls on `RequestDeliveryQuoteUseCase` with arbitrary inputs.
    - Assert all returned `quoteId` values are distinct.
    - **Validates: Requirements 4.5**

  - [ ]* 8.4 Write unit tests for Quote entity
    - Test `isExpired` returns `false` when `expiresAt` is in the future.
    - Test `isExpired` returns `true` when `expiresAt` is in the past.
    - Test `markConsumed()` sets `status === 'CONSUMED'`.
    - Test `toResponse()` includes all fields required by `DeliveryQuoteResponse`.
    - _Requirements: 5.3, 5.5_

- [x] 9. PricingConfigRepository interface + PrismaPricingConfigRepository
  - Create `services/logistics-service/src/domain/repositories/pricing-config.repository.ts` with the `PricingConfigRepository` interface (`getActive`, `getByVersion`, `save`, `getNextVersion`).
  - Create `services/logistics-service/src/infrastructure/repositories/prisma-pricing-config.repository.ts`:
    - `getActive()`: query `Logistics_PricingConfig WHERE isActive = true ORDER BY version DESC LIMIT 1`; throw if none found.
    - `getByVersion(version)`: query by primary key; return `null` if not found.
    - `save(config)`: upsert the row; when saving a new active config, deactivate all previous configs in the same transaction.
    - `getNextVersion()`: `SELECT MAX(version) + 1`.
  - _Requirements: 1.2, 1.3, 1.7_

  - [ ]* 9.1 Write property test for PricingVersion monotonic increase
    - **Property 2: PricingVersion monotonic increase**
    - Save N ≥ 3 successive configs using `save`. Assert each new version is strictly greater than the previous.
    - **Validates: Requirements 1.3**

  - [ ]* 9.2 Write unit tests for PrismaPricingConfigRepository
    - Test `getActive()` returns the highest-version active config.
    - Test `getByVersion(nonExistentVersion)` returns `null`.
    - Test saving a new config deactivates the previous active one.
    - Test `getNextVersion()` returns `currentMax + 1`.
    - _Requirements: 1.2, 1.3, 1.7_

- [ ] 10. PricingAuditRecord entity + PricingAuditRecordRepository
  - Create `services/logistics-service/src/domain/entities/pricing-audit-record.entity.ts` with `PricingAuditRecordData` interface and `PricingAuditRecord` class (immutable: read-only getters only, no setters, `toJSON()`).
  - Create `services/logistics-service/src/domain/repositories/pricing-audit-record.repository.ts` with interface: `save(record): Promise<void>` and `findByQuoteId(quoteId): Promise<PricingAuditRecord | null>`.
  - Create `services/logistics-service/src/infrastructure/repositories/prisma-pricing-audit-record.repository.ts` implementing the interface using the `Logistics_PricingAuditRecord` Prisma model.
  - _Requirements: 7.1, 7.2, 7.5_

  - [ ]* 10.1 Write property test for audit record fee decomposition invariant
    - **Property 20: Audit record fee decomposition invariant**
    - For arbitrary `courierCompensationEstimate ≥ 0` and `platformMarginAmount ≥ 0`, assert `record.buyerDeliveryFee === courierCompensationEstimate + platformMarginAmount` (pre-clamp values stored on audit record).
    - Use `fc.integer({min: 0, max: 100_000})` for each component.
    - **Validates: Requirements 7.4**

  - [ ]* 10.2 Write unit tests for PricingAuditRecord
    - Test that calling any setter or mutation method throws (verify immutability by checking the class exposes no setters).
    - Test `toJSON()` round-trips all fields correctly.
    - _Requirements: 7.2_

- [ ] 11. RequestDeliveryQuoteUseCase
  - Create `services/logistics-service/src/application/use-cases/request-delivery-quote.use-case.ts`.
  - Implement `DeliveryQuoteRequest` and `DeliveryQuoteResponse` interfaces.
  - Implement `RequestDeliveryQuoteUseCase.execute(request)`:
    1. Load active `PricingConfig` from `PricingConfigRepository`.
    2. Call `ZoneClassifier.classify(origin, dest)`.
    3. If `unavailable`, build a `DELIVERY_UNAVAILABLE` quote, persist via `QuoteRepository.save`, and return the response — do NOT call the pricing engine.
    4. Call `RoutingProvider.getRoute(origin, dest)`.
    5. Call `CourierCostCalculator.estimate(distanceKm, durationMinutes)`.
    6. Call `DeliveryPricingEngine.compute(pricingInput, config)`.
    7. Construct a `Quote` entity with `status: 'ACTIVE'`, `issuedAt: now()`, `expiresAt: now() + config.quoteValiditySeconds`.
    8. Persist the quote via `QuoteRepository.save`.
    9. Persist a `PricingAuditRecord` via `PricingAuditRecordRepository.save`.
    10. Return `DeliveryQuoteResponse`.
  - The `pricingVersion` on the response MUST equal the version of the loaded `PricingConfig`.
  - _Requirements: 1.4, 4.1, 4.2, 4.3, 4.5, 4.6, 5.1, 5.2, 7.1, 9.3_

  - [ ]* 11.1 Write property test for pricingVersion recorded on every quote
    - **Property 3: PricingVersion recorded on every quote**
    - For arbitrary valid `DeliveryQuoteRequest`, assert `response.pricingVersion === activeConfig.version`.
    - **Validates: Requirements 1.4, 4.2**

  - [ ]* 11.2 Write property test for DELIVERY_UNAVAILABLE never carries a fee
    - **Property 11: DELIVERY_UNAVAILABLE never carries a fee**
    - For inputs where `ZoneClassifier` returns `unavailable: true`, assert `response.deliveryFee` is absent or null and `response.status === 'DELIVERY_UNAVAILABLE'`.
    - **Validates: Requirements 3.3, 3.4**

  - [ ]* 11.3 Write property test for quote response completeness
    - **Property 12: Quote response completeness**
    - For arbitrary valid `DeliveryQuoteRequest`, assert the response contains all required fields: `quoteId`, `status`, `deliveryFee` (when not UNAVAILABLE), `currency`, `expiresAt`, `pricingVersion`, `deliveryZone`, and a `breakdown` with all 14 component fields.
    - **Validates: Requirements 4.2, 4.3, 5.1**

  - [ ]* 11.4 Write unit tests for RequestDeliveryQuoteUseCase
    - Test valid request → response contains all required fields, status `ACTIVE`, `pricingVersion` matches config.
    - Test unavailable zone → response status `DELIVERY_UNAVAILABLE`, no `deliveryFee`.
    - Test `QuoteRepository.save` is called once per valid request.
    - Test `PricingAuditRecord` is persisted with correct component values.
    - _Requirements: 1.4, 3.3, 4.2, 5.1, 7.1_

- [x] 12. QuotePricingController + route registration in logistics.routes.ts
  - Create `services/logistics-service/src/api/controllers/quote-pricing.controller.ts`.
  - Implement `QuotePricingController` with:
    - `requestQuote(req, res)`: validate Joi schema (originLat/Lng, destLat/Lng bounds; packageWeightKg > 0), call `RequestDeliveryQuoteUseCase.execute`, return HTTP 200. Return HTTP 400 on validation failure.
    - `getQuote(req, res)`: `GET /internal/quotes/:quoteId` — look up quote via `QuoteRepository.findById`, return 200 or 404. This is the internal endpoint called by `QuoteValidationService` in checkout-service.
  - Define the Joi schema for `POST /api/logistics/v1/quote`:
    - `originLat`: `Joi.number().min(-90).max(90).required()`
    - `originLng`: `Joi.number().min(-180).max(180).required()`
    - `destLat`: `Joi.number().min(-90).max(90).required()`
    - `destLng`: `Joi.number().min(-180).max(180).required()`
    - `packageWeightKg`: `Joi.number().positive().required()`
    - `originAddress`, `destinationAddress`: `Joi.string().trim().required()`
    - `packageDimensions`: optional object with `lengthCm`, `widthCm`, `heightCm`
    - `isCoD`: `Joi.boolean().default(false)`
  - Register routes in `services/logistics-service/src/api/routes/logistics.routes.ts`:
    - `POST /logistics/v1/quote` → `requireAuth` middleware → Joi validation → `quotePricingController.requestQuote`
    - `GET /internal/quotes/:quoteId` → `quotePricingController.getQuote` (internal, no auth middleware — protected at network level)
  - Apply the existing rate-limit middleware on the new quote route (consistent with existing logistics rate-limit policy).
  - _Requirements: 4.1, 4.4, 4.7, 4.8, 4.9, 4.10_

  - [ ]* 12.1 Write unit tests for QuotePricingController
    - Test HTTP 400 on `packageWeightKg = 0`.
    - Test HTTP 400 on `packageWeightKg = -1`.
    - Test HTTP 400 on `originLat = 91` (out of bounds).
    - Test HTTP 200 on valid input, response contains `quoteId`.
    - Test HTTP 200 with `status: DELIVERY_UNAVAILABLE` when zone is unresolvable (not HTTP 4xx).
    - _Requirements: 4.4, 4.7, 4.8_

- [x] 13. Seed the default PricingConfig (version 1)
  - Create `scripts/seed-pricing-config.ts` (or add to the existing seed script if one exists in the logistics service).
  - Seed a `Logistics_PricingConfig` row with `version: 1`, `isActive: true`, and the following default values:
    - `baseFee`: 1500 TZS
    - `distanceRateTzsPerKm`: 300
    - `timeRateTzsPerMinute`: 50
    - `packageWeightTiers`: `[{maxWeightKg: 1, multiplier: 1.0}, {maxWeightKg: 5, multiplier: 1.2}, {maxWeightKg: 20, multiplier: 1.5}, {maxWeightKg: Infinity, multiplier: 2.0}]`
    - `zoneMultipliers`: `{same_ward: 1.0, same_district: 1.1, same_region: 1.2, cross_region: 1.4}`
    - `operationalSurcharge`: `{peakHourSurchargeAmount: 500, peakHours: [{startHour: 7, endHour: 9}, {startHour: 17, endHour: 19}]}`
    - `riskSurchargeRateCod`: 0.05
    - `platformMarginPct`: 0.30
    - `floorPriceTzs`: 1000
    - `ceilingPriceTzs`: 50000
    - `roundingIncrementTzs`: 50
    - `quoteValiditySeconds`: 900
    - `routingCacheTtlMs`: 300000
  - The seed script must be idempotent: skip if a record with `version = 1` already exists.
  - _Requirements: 1.2, 1.5_

- [ ] 14. Checkpoint — logistics-service implementation complete
  - Ensure all tests for tasks 2–13 pass. Run `npx vitest --run` inside `services/logistics-service`. Ask the user if questions arise.

- [x] 15. QuoteValidationService in checkout-service
  - Create `services/checkout-service/src/infrastructure/services/quote-validation.service.ts`.
  - Implement `QuoteValidationResult` interface and `QuoteValidationService` class with:
    - `validate(quoteId)`: HTTP GET to `{logisticsBaseUrl}/internal/quotes/{quoteId}`; parse the response to return `QuoteValidationResult`. Handle `404 → NOT_FOUND`, expired status `→ EXPIRED`, consumed status `→ CONSUMED`, unavailable status `→ DELIVERY_UNAVAILABLE`.
    - `markConsumed(quoteId)`: HTTP PATCH to `{logisticsBaseUrl}/internal/quotes/{quoteId}/consume`.
  - Wire the `logisticsBaseUrl` from environment variable `LOGISTICS_SERVICE_URL`.
  - _Requirements: 6.3, 6.4, 6.5, 6.6, 6.7, 6.8_

  - [ ]* 15.1 Write property test for expired quotes always rejected at checkout
    - **Property 16: Expired quotes always rejected at checkout**
    - For any `quoteId` whose persisted `expiresAt < Date.now()`, assert `QuoteValidationService.validate` returns `{ valid: false, rejectionReason: 'EXPIRED' }`.
    - **Validates: Requirements 5.3, 5.4, 6.6**

  - [ ]* 15.2 Write property test for consumed quotes always rejected at checkout
    - **Property 17: Consumed quotes always rejected at checkout**
    - For any `quoteId` with `status === 'CONSUMED'`, assert `QuoteValidationService.validate` returns `{ valid: false, rejectionReason: 'CONSUMED' }`.
    - **Validates: Requirements 5.6, 6.8**

  - [ ]* 15.3 Write unit tests for QuoteValidationService
    - Test active quote → `{ valid: true, deliveryFee: <fee>, pricingVersion: <ver> }`.
    - Test 404 response → `{ valid: false, rejectionReason: 'NOT_FOUND' }`.
    - Test expired status → `{ valid: false, rejectionReason: 'EXPIRED' }`.
    - Test consumed status → `{ valid: false, rejectionReason: 'CONSUMED' }`.
    - Test DELIVERY_UNAVAILABLE status → `{ valid: false, rejectionReason: 'DELIVERY_UNAVAILABLE' }`.
    - _Requirements: 6.3, 6.5, 6.6, 6.7, 6.8_

- [x] 16. InitiateCheckoutUseCase security modification
  - Modify `services/checkout-service/src/application/use-cases/initiate-checkout.use-case.ts`:
    - Add `quoteValidationService: QuoteValidationService` as a constructor parameter.
    - Add `quoteId: string` as a required parameter to `execute(...)`.
    - Remove the `shippingCost` parameter from the public method signature, or keep it but ignore it entirely — the authoritative shipping cost MUST come exclusively from the validated quote.
    - At the start of `execute`, call `quoteValidationService.validate(quoteId)`:
      - If `!result.valid`, return `{ success: false, errors: [{ field: 'quoteId', message: <rejectionReason-specific message> }] }` with appropriate HTTP 422 semantics.
    - Set `session.shippingCost = result.deliveryFee` (authoritative).
    - Set `session.quoteId = quoteId` and `session.pricingVersion = result.pricingVersion` on the persisted session.
    - After successfully saving the session, call `quoteValidationService.markConsumed(quoteId)`.
    - This validation must apply for ALL payment methods (COD, wallet, direct payment).
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8, 6.9, 6.10_

  - [ ]* 16.1 Write property test for server-authoritative delivery fee at checkout
    - **Property 18: Server-authoritative delivery fee at checkout**
    - For any valid `quoteId` and any arbitrary `shippingCost` value supplied by the client, assert `session.shippingCost === quote.deliveryFee` (not the client-supplied value).
    - Use `fc.integer({min: 0, max: 10_000_000})` for the client-supplied cost.
    - **Validates: Requirements 6.1, 6.4**

  - [ ]* 16.2 Write property test for missing quoteId always rejected
    - **Property 19: Missing quoteId always rejected at checkout**
    - For any order placement request with a missing or empty `quoteId`, assert `result.success === false` and the error references `quoteId`.
    - **Validates: Requirements 6.2, 6.10**

  - [ ]* 16.3 Write unit tests for InitiateCheckoutUseCase security behavior
    - Test: valid quoteId + arbitrary clientShippingCost → `session.shippingCost === quote.deliveryFee`.
    - Test: missing quoteId → returns error, does not persist session.
    - Test: expired quoteId → returns 422-equivalent error `QUOTE_EXPIRED`.
    - Test: consumed quoteId → returns 422-equivalent error `QUOTE_CONSUMED`.
    - Test: DELIVERY_UNAVAILABLE quoteId → returns 422-equivalent error.
    - Test: `markConsumed` is called exactly once after successful checkout.
    - _Requirements: 6.1–6.10_

- [ ] 17. Checkpoint — checkout-service security modification complete
  - Ensure all tests for tasks 15–16 pass. Run `npx vitest --run` inside `services/checkout-service`. Ask the user if questions arise.

- [ ] 18. Integration test — POST /api/logistics/v1/quote end-to-end
  - Create `services/logistics-service/src/__tests__/integration/quote-endpoint.integration.test.ts`.
  - Spin up a test instance with real Prisma (test database) and a seeded `PricingConfig` (version 1).
  - Test 1: `POST /api/logistics/v1/quote` with valid Dar es Salaam coordinates and `packageWeightKg: 0.5` → HTTP 200, response contains `quoteId`, `status: 'ACTIVE'`, `deliveryFee > 0`, `pricingVersion: 1`.
  - Test 2: Same request repeated → second `quoteId` is different from the first (uniqueness).
  - Test 3: `POST /api/logistics/v1/quote` with `packageWeightKg: 0` → HTTP 400.
  - Test 4: `POST /api/logistics/v1/quote` with `originLat: 200` → HTTP 400.
  - Test 5: `GET /internal/quotes/:quoteId` after a successful quote → HTTP 200 with quote data.
  - Test 6: `GET /internal/quotes/nonexistent-id` → HTTP 404.
  - _Requirements: 4.1, 4.2, 4.5, 4.7, 4.8_

- [ ] 19. Checkout security test — shippingCost manipulation rejected
  - Create `services/checkout-service/src/__tests__/integration/checkout-quote-security.test.ts`.
  - Test 1: Initiate checkout with a valid active quoteId and `shippingCost: 0` in the request → success, persisted session has `shippingCost === quote.deliveryFee` (not 0).
  - Test 2: Initiate checkout with a valid active quoteId and `shippingCost: 999999` in the request → success, persisted session has `shippingCost === quote.deliveryFee` (not 999999).
  - Test 3: Initiate checkout without a quoteId → `result.success === false`, descriptive error on `quoteId` field.
  - Verify the `quoteId` and `pricingVersion` are recorded on the session.
  - _Requirements: 6.1, 6.2, 6.4, 6.9_

- [ ] 20. Checkout security test — expired/consumed quoteId rejected
  - Extend or add to the checkout security integration tests:
  - Test 1: Initiate checkout with an expired quoteId (manually set `expiresAt` to the past in the test DB) → `result.success === false`, error code `QUOTE_EXPIRED`.
  - Test 2: Initiate checkout with a quoteId whose status is `CONSUMED` → `result.success === false`, error code `QUOTE_CONSUMED`.
  - Test 3: Initiate checkout with a quoteId whose status is `DELIVERY_UNAVAILABLE` → `result.success === false`, error code `DELIVERY_UNAVAILABLE`.
  - Test 4: Initiate checkout successfully (quote consumed), then attempt to reuse the same quoteId → `result.success === false`, error code `QUOTE_CONSUMED`.
  - _Requirements: 5.3, 5.4, 5.6, 6.6, 6.7, 6.8_

- [ ] 21. Performance benchmark — pipeline-only < 10ms
  - Create `services/logistics-service/src/__tests__/benchmarks/pricing-pipeline.benchmark.ts`.
  - Instantiate `DeliveryPricingEngine` with a fixed `PricingConfig` (default seed values).
  - Build a representative `PricingInput` (5 km, 20 min, 1 kg, `same_district` zone, no CoD, not peak).
  - Run `engine.compute(input, config)` in a loop for 1000 iterations, measuring total elapsed time with `performance.now()`.
  - Assert `totalElapsedMs / 1000 < 10` (average per call < 10ms).
  - Log the p50 and p99 latency per iteration.
  - _Requirements: 11.3_

- [ ] 22. Final checkpoint — all tests pass
  - Run the full test suite: `npx vitest --run` from the workspace root (or per-service as appropriate).
  - Ensure all unit tests, property tests, integration tests, and the performance benchmark pass.
  - Ensure `npx prisma generate` and `npx prisma validate` complete without errors.
  - Ask the user if questions arise.

---

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP, but all 23 correctness properties should be covered before production release.
- Property-based tests use **fast-check** (`fc`). Set `numRuns: 200` for Properties 5, 6, and 7 (critical invariants).
- Each property test file should tag its `fc.assert` with a description matching the property name from the design document for traceability.
- The `DeliveryPricingEngine` is intentionally stateless and pure — keep it free of any `async`, I/O, or side effects.
- `CourierCostCalculator` constants must stay in sync with `EarningsCalculationEngine` rates; leave a `// SYNC-WITH: EarningsCalculationEngine` comment at each constant declaration.
- The `GET /internal/quotes/:quoteId` endpoint is internal only — protect it at the network/service-mesh level rather than with the user-facing JWT middleware.
- The `Checkout_CheckoutSession` schema extension (task 1) may require updating the checkout session repository and any mapper/DTO that serializes the session — check for compile errors after the schema change.
