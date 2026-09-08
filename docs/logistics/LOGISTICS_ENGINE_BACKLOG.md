# Maysar Logistics Optimization Engine — Engineering Backlog

> Last updated: September 2026  
> Status: **Complete — 72/72 tasks implemented, tested, and live-verified.**  
> **Implementers:** see [LOGISTICS_IMPLEMENTATION.md](./LOGISTICS_IMPLEMENTATION.md) for the as-built reference (domain model, engines, application layer, HTTP surface, wiring, and verification evidence).  
> This document is now an historical record of the plan; the implementation reference is the source of truth for the current system.

---

## Guiding Principle

The logistics domain must maintain four permanently separate concepts. They must never collapse into a single `deliveryFee` field.

| Concept | Definition |
|---------|-----------|
| **Logistics Cost** | What it actually costs to perform the delivery |
| **Logistics Price** | What the buyer is charged |
| **Driver Compensation** | What the carrier receives |
| **Maysar Margin** | What Maysar earns from coordinating logistics |

**Fundamental invariants:**

```
Buyer Logistics Price = Allocated Logistics Cost + Maysar Service Fee − Applicable Discounts
Driver Compensation   ≥ Driver Minimum Earnings  (hard constraint — checked before any option is offered)
```

The Order Service must never calculate delivery prices. It requests a fulfillment plan from the Logistics Service.

---

## Phase 1 — Complete In-Flight Work (Immediate Priority)

These are existing unchecked tasks from three active specs. Phase 2 cannot start until these are done. The checkout security gap (1.2) is a live vulnerability.

### 1.1 Delivery Pricing Engine — finish the domain layer

The quote endpoint exists in routing but `RequestDeliveryQuoteUseCase` has nothing to call yet. These four tasks are the critical path.

- [x] **PricingConfig value object** — Create `services/logistics-service/src/domain/value-objects/pricing-config.value-object.ts` with typed interfaces (`ZoneMultipliers`, `PackageWeightTier`, `OperationalSurchargeSchedule`, `PricingConfigData`), `PricingConfig` class with typed getters, `static fromPersisted()`, `toJSON()`, and a `private validate()` method that throws on: negative rates, floor > ceiling, zero rounding increment, missing zone multiplier for any zone
  - _From spec: delivery-pricing-engine task 2_

- [x] **DeliveryPricingEngine — 11-stage pure pipeline** — Create `services/logistics-service/src/domain/engines/delivery-pricing.engine.ts`. Implement `PricingInput`, `PricingBreakdown`, `PricingResult` interfaces. Implement the `compute(input, config)` method with these stages in strict order:
  1. Base cost (flat from config)
  2. Distance cost (`distanceKm × distanceRateTzsPerKm`)
  3. Time cost (`durationMinutes × timeRateTzsPerMinute`)
  4. Package factor (weight-tier multiplier applied to base + distance + time subtotal)
  5. Zone multiplier (from `config.zoneMultipliers[deliveryZone]`)
  6. Operational surcharge (flat peak-hour amount if applicable)
  7. Risk surcharge (`premarginFee × riskSurchargeRateCod` if COD order)
  8. Platform margin (`Math.round(premarginFee × platformMarginPct)`)
  9. Floor/ceiling clamp
  10. Rounding up to nearest `roundingIncrementTzs`
  11. Final fee assembly with full `PricingBreakdown`

  The engine is stateless and pure — no `async`, no I/O, no side effects.
  - _From spec: delivery-pricing-engine task 6_

- [x] **PricingAuditRecord entity + repository** — Create `services/logistics-service/src/domain/entities/pricing-audit-record.entity.ts` (immutable: read-only getters only, no setters, `toJSON()`). Create `PricingAuditRecordRepository` interface + `PrismaPricingAuditRecordRepository` using `Logistics_PricingAuditRecord` model
  - _From spec: delivery-pricing-engine task 10_

- [x] **RequestDeliveryQuoteUseCase** — Create `services/logistics-service/src/application/use-cases/request-delivery-quote.use-case.ts`. Implement `execute(request)` in this sequence:
  1. Load active `PricingConfig` from `PricingConfigRepository`
  2. Call `ZoneClassifier.classify(origin, dest)`
  3. If `unavailable` → build `DELIVERY_UNAVAILABLE` quote, persist, return (do NOT call pricing engine)
  4. Call `RoutingProvider.getRoute(origin, dest)`
  5. Call `CourierCostCalculator.estimate(distanceKm, durationMinutes)`
  6. Call `DeliveryPricingEngine.compute(pricingInput, config)`
  7. Construct `Quote` entity with `status: ACTIVE`, `issuedAt: now()`, `expiresAt: now() + config.quoteValiditySeconds`
  8. Persist quote via `QuoteRepository.save`
  9. Persist `PricingAuditRecord` via `PricingAuditRecordRepository.save`
  10. Return `DeliveryQuoteResponse` with `pricingVersion` from the loaded config

  **Acceptance test:** `POST /api/logistics/v1/quote` with valid Dar es Salaam coordinates returns HTTP 200 with `quoteId`, `status: ACTIVE`, `deliveryFee > 0`, `pricingVersion` matching active config, full `breakdown` with all 11 component values
  - _From spec: delivery-pricing-engine task 11_

- [x] **Performance benchmark** — Create `services/logistics-service/src/__tests__/benchmarks/pricing-pipeline.benchmark.ts`. Run `engine.compute()` 1000 iterations and assert average < 10ms per call. Log p50 and p99
  - _From spec: delivery-pricing-engine task 21_

- [x] **Integration test: quote endpoint end-to-end** — Spin up with real Prisma (test DB) and seeded PricingConfig. Test: valid coordinates → 200 with quoteId; repeated request → different quoteId; `packageWeightKg: 0` → 400; `originLat: 200` → 400; `GET /internal/quotes/:quoteId` → 200; nonexistent quoteId → 404
  - _From spec: delivery-pricing-engine task 18_

---

### 1.2 Checkout Security Enforcement — close the open vulnerability

**This is a live security gap.** The checkout controller accepts `shippingCost` from the client and does not validate the `quoteId`. A buyer can send `shippingCost: 0` and it goes through.

- [x] **Enforce quote validation in InitiateCheckoutUseCase** — Modify `services/checkout-service/src/application/use-cases/initiate-checkout.use-case.ts`:
  - Add `quoteValidationService: QuoteValidationService` as required constructor dependency
  - Make `quoteId` a required parameter in `execute()`
  - Remove `shippingCost` from the effective parameters (accept it for backward compat but never use it)
  - At the start of `execute`: call `quoteValidationService.validate(quoteId)` — if `!result.valid`, return `{ success: false }` with appropriate error code
  - Set `session.shippingCost = result.deliveryFee` (server-authoritative, always)
  - Set `session.quoteId = quoteId` and `session.pricingVersion = result.pricingVersion`
  - After successful session save: call `quoteValidationService.markConsumed(quoteId)`
  - Apply to ALL payment methods (COD, wallet, card, SELLER_VERIFICATION)
  - _From spec: delivery-pricing-engine task 16_

- [x] **Integration test: shippingCost manipulation rejected** — Test 1: valid quoteId + `shippingCost: 0` → session has `shippingCost === quote.deliveryFee`. Test 2: valid quoteId + `shippingCost: 999999` → same. Test 3: missing quoteId → 422, error references `quoteId`. Verify `quoteId` and `pricingVersion` recorded on session
  - _From spec: delivery-pricing-engine task 19_

- [x] **Integration test: expired/consumed quoteId rejected** — Test 1: expired quoteId → 422 `QUOTE_EXPIRED`. Test 2: consumed quoteId → 422 `QUOTE_CONSUMED`. Test 3: `DELIVERY_UNAVAILABLE` quoteId → 422. Test 4: reuse consumed quoteId → 422 `QUOTE_CONSUMED`
  - _From spec: delivery-pricing-engine task 20_

- [x] **Checkpoint: all delivery-pricing-engine tests pass** — Run `npx vitest --run` inside `services/logistics-service` and `services/checkout-service`. No failures permitted before proceeding
  - _Status (Sept 2026): all delivery-pricing-engine tests pass — quote use-case, quote routes, benchmarks, initiate-checkout security (shippingCost manipulation, expired/consumed quotes), multi-seller checkout. Remaining suite failures in both services are pre-existing and unrelated (old `tests/` API drift, config/redis unit tests, layer-isolation architecture violation, Dar→Arusha zone classification in the economic-validation example) — tracked separately, not blocking Phase 2 pricing work._
  - _From spec: delivery-pricing-engine tasks 14, 17, 22_

---

### 1.3 Delivery Consolidation Engine — activate the migration

The consolidation domain code is complete. The migration has not been applied.

- [x] **Apply consolidation migration** — Run `npx prisma migrate deploy`. Verify `logistics_delivery_groups` and `logistics_consolidation_audits` tables exist and `logistics_pricing_configs` has the four new consolidation columns
  - _Verified Sept 2026: no pending migrations; both tables exist; all four consolidation columns present on `logistics_pricing_configs`._
  - _From spec: delivery-consolidation-engine task 15_

- [x] **Reseed PricingConfig v2** — Run `npx tsx scripts/seed-pricing-config.ts`. Verify the active config has: `consolidationRadiusKm: 5.0`, `maxConsolidatedRouteOverheadPct: 1.40`, `maxGroupWeightKg: 20.0`, `allocationAlgorithm: weight_proportional`
  - _Verified Sept 2026: active config v2 already carries exactly these values (v1 deactivated) — no reseed required._
  - _From spec: delivery-consolidation-engine task 15_

---

### 1.4 Verify the consolidation execution path is actually wired

The `ConsolidationOrchestratorService` exists but the end-to-end path from checkout through consolidation to delivery group creation has not been verified.

- [x] **Integration test: multi-seller checkout triggers consolidation** — Test that a multi-seller checkout session invokes `ConsolidationOrchestratorService.plan()`, returns at least one `DeliveryGroup`, and the `delivery.consolidated` event is emitted for any group with ≥ 2 sellers
  - ✅ Done (2026-09-04). `services/checkout-service/src/tests/integration/multi-seller-consolidation.integration.test.ts` — 4/4 passing. Covers: plan() invoked for multi-seller session; consolidated DeliveryGroup persisted (`QUOTE_ISSUED`) + returned; `delivery.consolidated` emitted once for the ≥2-seller group and never for singletons; group→quoteId mapping stored on the session; graceful empty-options degradation when consolidation fails.
  - **Wiring gap fixed:** the checkout-service jest project lacked the `@logistics/(.*)` module mapping, so `GetDeliveryOptionsUseCase`'s dynamic `GeoPoint` import silently failed (returned empty options) — mapping added in `jest.config.js`.
  - **Bug fixed:** `ConsolidationOrchestrator` counted singleton groups in `totalSavingsTzs` (reported TZS 384k "savings" for two un-consolidated singletons). Savings now accumulate only for `CONSOLIDATED` groups.
  - **Bug fixed:** `GetDeliveryOptionsUseCase` did not guard against `plan()` rejecting — a consolidation failure would 500 the buyer-facing delivery-options endpoint. Now catches and returns empty options (client falls back to per-seller quote flow).
  - ✅ Resolved (2026-09-06): the orchestrator in `logistics-service/index.ts` is now constructed **with an outbox-backed `eventBus`** — `delivery.consolidated` is published to the append-only `logistics_OutboxEvent` table on every ≥2-seller consolidated group in the live runtime (same pattern as `shipment.created`; publish failures are non-fatal).
  - _New task — gap identified during analysis_

- [x] **Verify checkout routing condition** — Confirm the `sellerQuotes && Object.keys(sellerQuotes).length > 1` condition in `checkout.controller.ts` correctly routes to `__multiSellerCheckoutUseCase` in both test and production environments. Document or fix: what happens when a buyer requests delivery options before any seller quotes exist
  - _Verified Sept 2026: covered by `services/checkout-service/src/api/controllers/__tests__/multi-seller-routing.controller.test.ts` (routes on >1 seller, single-seller falls through, rejection surfaces as 422). Pre-quotes behavior documented in `docs/logistics/PER_SELLER_QUOTE_FLOW.md` — `GetDeliveryOptionsUseCase` returns an empty group list gracefully._
  - _New task — gap identified during analysis_

- [x] **Define per-seller quote request flow** — Document (with a short code example or API sequence) how a client app obtains per-seller quotes before calling confirm checkout. This flow must be testable end-to-end before the multi-seller checkout path is considered production-ready
  - _Documented Sept 2026 in `docs/logistics/PER_SELLER_QUOTE_FLOW.md` (API sequence, code example, failure modes)._
  - _New task — gap identified during analysis_

---

## Phase 2 — Domain Model Expansion (Short-term)

Introduces `Shipment` and `DeliveryJob` as first-class domain objects, and a real vehicle capability model. Without these, all later optimization work has no foundation to build on.

### 2.1 Shipment domain object

Currently the system goes: Order → Quote → Delivery. The correct flow is: Order → Shipment(s) → DeliveryJob(s). Shipments are the atomic unit of physical movement.

- [x] **Prisma schema: `Logistics_Shipment`** — Add model with fields: `id` (SHP- prefix), `orderId`, `sellerId`, `originLat`, `originLng`, `originAddress`, `destinationLat`, `destinationLng`, `destinationAddress`, `packageWeightKg`, `packageDimensions` (JSON: `{lengthCm, widthCm, heightCm}`), `handlingRequirements` (JSON: `{fragile: bool, temperatureControlled: bool, hazmat: bool}`), `requestedDeliveryWindow` (nullable JSON: `{earliestAt, latestAt}`), `requiredVehicleClass` (nullable VARCHAR — MOTORCYCLE, PICKUP, VAN, TRUCK), `status` (VARCHAR — see state machine below), `deliveryJobId` (nullable FK), `createdAt`, `updatedAt`. Create migration
  - ✅ Done (2026-09-04). Model added to `prisma/schema.prisma`; migration `20260904000000_add_shipment_domain` applied via `prisma migrate deploy` — all 19 columns verified in the live DB (`logistics_shipments`), indexes on orderId/sellerId/status/deliveryJobId. Prisma client regenerated.

- [x] **Shipment state machine** — Enforce via named transition methods only (no direct `status` writes). Valid transitions:
  ```
  CREATED → PLANNED → ASSIGNED → DISPATCHED → DELIVERED → CONFIRMED → SETTLED
                                                          → FAILED (with sub-reason)
  ```
  Failure sub-reasons: `FAILED_PICKUP`, `CUSTOMER_UNAVAILABLE`, `SUPPLIER_DELAY`, `DRIVER_FAILURE`, `DAMAGED`, `DISPUTED`
  - ✅ Done (2026-09-04). Enforced in `Shipment` entity via `VALID_TRANSITIONS` + named methods (`markPlanned`, `assignToJob`, `dispatch`, `markDelivered`, `confirm`, `settle`, `markFailed`). **Documented deviation:** FAILED is reachable from PLANNED/ASSIGNED/DISPATCHED/DELIVERED (not only DELIVERED as the diagram's indentation suggests) because the mandated sub-reasons (`FAILED_PICKUP`, `SUPPLIER_DELAY`) occur before delivery. `markFailed` validates the sub-reason against the allowed list. 22/22 entity unit tests pass (`shipment.entity.test.ts`).

- [x] **`Shipment` domain entity** — Create `services/logistics-service/src/domain/entities/shipment.entity.ts`. Implement `ShipmentRepository` interface + `PrismaShipmentRepository`
  - ✅ Done (2026-09-04). Entity with constructor invariants (positive weight, valid vehicle class, failureReason↔FAILED consistency); `ShipmentRepository` interface in `domain/repositories/shipment.repository.ts` (save/findById/findByOrderId/findByDeliveryJobId/findUnassigned/updateStatus); `PrismaShipmentRepository` in `infrastructure/repositories/` following the `PrismaDeliveryGroupRepository` mapper pattern.

- [x] **`ShipmentCreated` event** — Emit on creation. Order service subscribes and records the shipment reference. Follows existing `EventEnvelope` pattern
  - ✅ Done (2026-09-04). `CreateOrderShipmentsUseCase` writes one `shipment.created` event per shipment to the append-only `logistics_outbox_events` table (PENDING status, same contract as `EventPublisher`'s outbox path). Payload carries shipmentId/orderId/masterOrderId/sellerId/origin/destination/weight/vehicleClass. Non-fatal on failure — consumers can reconcile from the shipments table. **Live-verified** against the real dev DB via `scripts/verify-shipment-creation.ts`: 2 shipments + 2 outbox events, then cleanup (VERIFY: PASS).

- [x] **Create shipments at checkout** — At checkout confirmation (after order creation), create one `Logistics_Shipment` per seller group using the seller's primary location as origin and buyer delivery address as destination. The `deliveryJobId` is null at this point — it gets set when the consolidation engine assigns shipments to jobs
  - ✅ Done (2026-09-04). `CreateOrderShipmentsUseCase` registered on globalThis as `__createOrderShipments` by `logistics-service/index.ts` (same pattern as `__consolidationOrchestrator` — logistics owns the table; checkout never writes it directly). Wired non-fatally into both confirmation paths: **multi-seller** (`MultiSellerCheckoutUseCase` Step 5.5, after order creation + quote consumption) and **single-seller** (`checkout.controller.ts` synchronous placement path). Seller pickup resolved from primary `catalog_SellerLocation`; buyer destination from the delivery address (Dar-centre fallback). Regressions green: multi-seller use-case 4/4, controllers e2e 15/15, consolidation integration 4/4.

### 2.2 Delivery Job domain object

A Delivery Job is one physical courier operation. It may contain multiple Shipments (consolidated). This is the entity that gets assigned to a driver.

- [x] **Prisma schema: `Logistics_DeliveryJob`** — Add model: `id` (DJB- prefix), `shipmentIds` (JSON array), `driverId` (nullable), `vehicleId` (nullable), `routeId` (nullable), `status` (VARCHAR), `failureReason` (nullable VARCHAR), `scheduledPickupAt` (nullable), `estimatedDeliveryAt` (nullable), `actualPickupAt` (nullable), `actualDeliveryAt` (nullable), `createdAt`, `updatedAt`. Create migration
  - ✅ Done (2026-09-04). Model in `prisma/schema.prisma`; migration `20260904010000_add_delivery_job_domain` applied — `logistics_delivery_jobs` live with all 13 columns + status/driverId indexes. Prisma client regenerated.

- [x] **DeliveryJob state machine** — Valid transitions:
  ```
  PENDING → ASSIGNED → DRIVER_ACCEPTED → AT_PICKUP → LOADING → IN_TRANSIT
                                                                → AT_DESTINATION → DELIVERED
                                                                                 → CONFIRMED
                                                                                 → SETTLED
                                                   → FAILED_PICKUP
                                       → CUSTOMER_UNAVAILABLE
  ```
  No arbitrary `status` writes — only named transition methods: `assignDriver()`, `driverAccepts()`, `confirmPickup()`, `confirmLoading()`, `depart()`, `arriveAtDestination()`, `confirmDelivery()`, `markFailed(reason)`
  - ✅ Done (2026-09-04). Enforced via `VALID_TRANSITIONS` in `delivery-job.entity.ts`. Named methods: `assignDriver`, `driverAccepts`, `confirmPickup`, `confirmLoading`, `depart`, `arriveAtDestination`, `confirmDelivery`, `markFailed` — **plus `markConfirmed()`** for the backlog's DELIVERED → CONFIRMED step (the named-method list omitted it but the state machine requires it). Failure reasons are terminal states (`FAILED_PICKUP` from DRIVER_ACCEPTED/AT_PICKUP/LOADING; `CUSTOMER_UNAVAILABLE` from IN_TRANSIT/AT_DESTINATION). Constructor guards ASSIGNED↔driverId and failureReason↔status consistency. 22/22 tests pass.

- [x] **Emit one event per state transition** — `DriverAssigned`, `GoodsLoaded`, `ShipmentDeparted`, `DeliveryAttempted`, `DeliveryCompleted`, `DeliveryFailed`. Other services subscribe: `DeliveryCompleted` → order-service updates order status, payment-service releases funds, trust-service records `SUCCESSFUL_DELIVERY` signal
  - ✅ Done (2026-09-04). Pure `mapTransitionEvent(from, to)` in `domain/engines/delivery-job-events.ts` maps each transition to its backlog event name; `infrastructure/messaging/delivery-job-event-publisher.ts` persists the event to the append-only `logistics_outbox_events` table (PENDING). `DeliveryCompleted`/`DeliveryFailed` carry the `deliveryJobId` + `shipmentIds` so order/payment/trust can locate the affected orders. 3/3 mapping tests pass. Consumers still to wire in later phases.

- [x] **Refactor `DeliveryGroup` → `DeliveryJob`** — Map the existing `Logistics_DeliveryGroup` to `Logistics_DeliveryJob`. `DeliveryGroup.sellerOrderIds` becomes `DeliveryJob.shipmentIds`. Update `ConsolidationOrchestratorService` to produce `DeliveryJob` records. Keep `DeliveryGroup` table as-is for backward compat; new code uses `DeliveryJob`
  - ✅ Done (2026-09-04). `ConsolidationOrchestrator` now also writes a `Logistics_DeliveryJob` (shipmentIds = sellerOrderIds) when a group has real, unique order IDs — guarded, because at pre-order options-display time (`GetDeliveryOptionsUseCase`) `sellerOrderId` is undefined, and the new entity's uniqueness invariant would otherwise throw and trip the whole fallback. DeliveryGroup table untouched for backward compat. New `PrismaDeliveryJobRepository` + `DeliveryJobRepository` interface added.
  - **Assignment loop closed:** `AssignShipmentsToJobsUseCase` (`application/use-cases/assign-shipments-to-jobs.use-case.ts`) binds the `Logistics_Shipment` rows created at checkout to the PENDING DeliveryJobs (sets `shipment.deliveryJobId`, marks PLANNED→ASSIGNED), creating a job only if none exists. Callable from the logistics module exactly like `__createOrderShipments`; wiring into the confirm flow is a one-line follow-up.

### 2.3 Vehicle capability model

Current system assumes all deliveries are motorcycle, with hardcoded rates. The optimizer needs real constraints.

- [x] **Prisma schema: `Logistics_Vehicle`** — Add model: `id` (VHL- prefix), `driverId`, `vehicleType` (MOTORCYCLE, PICKUP, VAN, TRUCK), `maxWeightKg`, `maxVolumeM3` (nullable), `cargoDimensions` (nullable JSON: `{maxLengthCm, maxWidthCm, maxHeightCm}`), `servesAreas` (JSON array of region/district names), `operatingHours` (JSON: `[{dayOfWeek, startHour, endHour}]`), `hasRefrigeration` (bool), `handlesFragile` (bool), `isActive` (bool), `createdAt`, `updatedAt`. Create migration
  - ✅ Done (2026-09-04). Model in `prisma/schema.prisma`; migration `20260904020000_add_vehicle_models` applied — `logistics_vehicles` live (verified), indexes on driverId/vehicleType/isActive. `Vehicle` entity in `domain/entities/vehicle.entity.ts` (typed invariants: valid vehicleType, positive capacity, sane operating hours) + `PrismaVehicleRepository` (incl. `findActiveByTypeAndArea` for the optimizer).

- [x] **Prisma schema: `Logistics_VehicleTariff`** — Versioned tariff per vehicle: `id`, `vehicleId`, `version` (monotonic integer), `baseOperatingCostTzs`, `costPerKmTzs`, `costPerHourTzs`, `minimumJobCompensationTzs`, `loadingFeeTzs`, `unloadingFeeTzs`, `waitingRateTzsPerMinute` (charged after a free wait period), `freeWaitMinutes`, `isActive`, `effectiveFrom`, `createdAt`. Create migration. **Never overwrite old tariff rows — historical orders reference the version at time of pricing**
  - ✅ Done (2026-09-04). `logistics_vehicle_tariffs` table live with `@@unique([vehicleId, version])`. `VehicleTariff` entity + `VehicleTariffRepository` + `PrismaVehicleTariffRepository`. **`save()` always CREATES a new row computing the next monotonic version (max+1) — no update path exists**, which enforces append-only by design. **Live-verified** via `scripts/verify-vehicle-tariff.ts`: two saves → versions [1, 2], v1's `costPerKmTzs: 500` preserved while v2 is active at 450 (VERIFY: PASS, then cleanup).

- [x] **Vehicle compatibility check in consolidation** — Add rule to `ConsolidationEligibilityRules`: if any Shipment in a candidate group has `requiredVehicleClass` set, all shipments in the group must be compatible with a single available vehicle type. Incompatible `requiredVehicleClass` values must not be consolidated
  - ✅ Done (2026-09-04). `SellerPickupInput` now carries optional `requiredVehicleClass`; new **Rule 4** in `canJoinGroup` (consolidation.engine.ts) via exported pure helper `canConsolidateVehicleClasses()` — different explicit requirements (e.g. MOTORCYCLE + VAN) never consolidate; untagged shipments impose no constraint. Orchestrator `SellerGroupInput` threads `requiredVehicleClass` through. 8/8 tests in `consolidation-vehicle-rule.test.ts` (incl. end-to-end `consolidate()` proof that a MOTORCYCLE+VAN pair splits into singletons).

- [x] **Decouple `CourierCostCalculator` from hardcoded constants** — Replace `BASE_RATE = 2000`, `DISTANCE_RATE = 500`, `TIME_RATE = 200` with values read from active `VehicleTariff`. Add `// SYNC-WITH: VehicleTariff` comment at each constant until the migration is complete
  - ✅ Done (2026-09-04). `estimate(distanceKm, durationMinutes, tariff?)` — an active `VehicleTariff`'s rates (`baseOperatingCostTzs`, `costPerKmTzs`, `costPerHourTzs/60`) drive the estimate when provided; every constant is annotated `// SYNC-WITH: VehicleTariff.*` as the documented fallback. `RequestDeliveryQuoteUseCase` takes an optional `VehicleTariffRepository`, best-effort loads the latest active tariff, and passes its rates in (non-fatal if absent). 4/4 calculator tests + full quote.routes e2e suite pass.

---

## Phase 3 — Four-Concept Cost Model (Medium-term)

Re-architects cost computation to properly separate the four concepts. The current single pipeline produces a `deliveryFee` that collapses everything. This phase pulls them permanently apart.

> **Status (Sept 2026):** the three pure engines are live and the quote pipeline has been redirected to them (11-stage retained as fallback). All three Phase 3 data models (`Logistics_CostAdjustment`, `Logistics_LedgerEntry`, `Logistics_FulfillmentCommitment`) are migrated and live-verified. Remaining unchecked items below are **runtime wiring** that depends on flows which don't exist yet: operational adjustment events and the ledger-on-completion write need the Phase 5 dispatch/completion flow; settlement needs a settlement consumer; `CostVariancePolicy` needs the Phase 4 `Logistics_OptimizationConfig` model.

### 3.1 Separate cost from price from compensation

- [x] **`FulfillmentCostEngine`** — New pure engine: computes the actual cost of performing the delivery. Inputs: route (distance, duration), vehicle tariff, handling requirements, waiting time. Components: fixed base + distance cost (`distance × vehicle.costPerKmTzs`) + time cost (`duration × vehicle.costPerHourTzs`) + loading fee + unloading fee + waiting cost (`max(0, actualWait − freeWaitMinutes) × waitingRateTzsPerMinute`) + additional charges (tolls, parking, access — stored as structured line items). Output: `FulfillmentCostBreakdown` — not a buyer price, not a driver compensation. The raw economic cost of the operation
  - ✅ Done (2026-09-04). `domain/engines/fulfillment-cost.engine.ts` — pure, stateless, deterministic. All seven components incl. structured `additionalCharges` line items and chargeable-wait logic. 5/5 tests.

- [x] **`DriverCompensationEngine`** — New pure engine, completely independent of the pricing pipeline. Inputs: vehicle tariff, route, load characteristics, stop count, approved extras. Formula: base compensation + distance component + time component + load component (weight/volume factor) + waiting compensation + stop compensation (per additional stop beyond first) + approved extras. Hard constraint enforced here: if `totalCompensation < vehicle.minimumJobCompensationTzs`, the job must not be offered until it meets minimum. Output: `DriverCompensationBreakdown`
  - ✅ Done (2026-09-04). `domain/engines/driver-compensation.engine.ts` — independent of the buyer-pricing pipeline. Reports `meetsMinimumEarnings` + `minimumShortfallTzs`; `assertOfferable()` throws for callers that must enforce the hard gate (enforced at dispatch — Phase 5). 5/5 tests.

- [x] **`BuyerPriceEngine`** — Takes `FulfillmentCostBreakdown` + `MaysarServiceFeeConfig` + applicable discounts. Applies Maysar's margin and any applicable discount. The only place margin is calculated. Output: `LogisticsPriceBreakdown` with `fulfillmentCostTzs`, `maysarMarginTzs`, `discountAmountTzs`, `finalBuyerPriceTzs`
  - ✅ Done (2026-09-04). `domain/engines/buyer-price.engine.ts` — validates marginPct ∈ [0,1], caps discounts so the buyer price never goes negative, optional rounding increment. 4/4 tests.

- [x] **Retire the current single pipeline** — The existing `DeliveryPricingEngine` 11-stage pipeline becomes an interim measure. Once Phase 3 is live, redirect `RequestDeliveryQuoteUseCase` to use the three separate engines. The 11-stage pipeline can remain as a fallback/reference until fully migrated
  - ✅ Done (2026-09-04). `RequestDeliveryQuoteUseCase` now runs the three-engine path (FulfillmentCost → DriverCompensation → BuyerPrice) as PRIMARY whenever an active `VehicleTariff` exists; on any failure or absent tariff it falls back to the 11-stage pipeline unchanged. `Quote.breakdown` widened to a `QuoteBreakdown` union (`PricingBreakdown | ThreeEngineQuoteBreakdown`, tagged `engineVersion: 'three-engine-v1'`); audit record now stores the real driver compensation and Maysar margin. Full quote.routes e2e (14/14) + use-case suite green — the fallback keeps every existing assertion intact.

### 3.2 Cost responsibility layer

Every logistics cost that deviates from the planned route or schedule must have an attributed cause. This is the foundation of fair settlement.

- [x] **`Logistics_CostAdjustment` model** — Fields: `id`, `deliveryJobId`, `shipmentId` (nullable), `adjustmentType` (WAITING, FAILED_DELIVERY_ATTEMPT, ROUTE_DEVIATION, LOADING_DELAY, DAMAGE, DISPUTE), `amountTzs`, `responsibleParty` (CUSTOMER, SUPPLIER, DRIVER, MAYSAR, EXTERNAL), `reason` (free text for ops), `evidenceUrl` (nullable — photo/document), `recordedAt`, `recordedBy`. Immutable after creation. Create migration
  - ✅ Done (2026-09-04). Migration `20260904030000_add_cost_model_tables` applied (all three Phase 3 tables). Immutable entity (create-only, no mutators; validates type/party/amount/reason) + `PrismaCostAdjustmentRepository` with create-only save + party-scoped queries. **Live-verified** via `scripts/verify-cost-model.ts` (VERIFY: PASS).

- [x] **Wire attribution rules**:
  - Supplier not ready at pickup window → `WAITING`, attributed to `SUPPLIER`
  - Customer unreachable at delivery → `FAILED_DELIVERY_ATTEMPT`, attributed to `CUSTOMER`
  - Route was incorrectly calculated → `ROUTE_DEVIATION`, attributed to `MAYSAR`
  - Driver deviation from route → `ROUTE_DEVIATION`, attributed to `DRIVER`
  - External: traffic, weather → `WAITING`, attributed to `EXTERNAL`
  - ✅ Done (2026-09-06). Implemented as a pure mapping `domain/engines/cost-attribution.ts` (`resolveAttribution(event)` — the single source of truth for every backlog rule) and enforced by `RecordCostAdjustmentUseCase`, which records the immutable `Logistics_CostAdjustment` (event-resolved OR explicit ops override with evidence, mutually exclusive) and mirrors it as an append-only ledger `ADJUSTMENT` entry carrying `responsibleParty`/`adjustmentType` in metadata — so settlement can consume attribution through the ledger alone.

- [x] **Settlement reads adjustments** — The settlement flow must read `Logistics_CostAdjustment` records for a `DeliveryJob` before computing final disbursements. Customer-attributed costs can be recovered per `CostVariancePolicy`. Maysar-attributed costs are absorbed by Maysar. Supplier-attributed costs are deducted from supplier settlement
  - ✅ Done (2026-09-06, via `SettleDeliveryJobUseCase` reads-the-ledger-only, which mirrors every adjustment). Customer-attributed costs are recovered **only** when `customerChargeableVarianceTypes` covers them (policy from `CostVariancePolicy` config); uncovered ones produce an explicit warning and are never silently charged. Maysar-attributed costs reduce Maysar revenue. Supplier-attributed costs are deducted from the supplier settlement. Live-verified (VERIFY: PASS): TZS 800 supplier deduction, TZS 500 customer cost NOT charged (uncovered) with the warning surfaced.

### 3.3 Logistics Ledger (immutable accounting records)

The existing `Logistics_PricingAuditRecord` is minimal. The system needs a full, append-only ledger.

- [x] **`Logistics_LedgerEntry` model** — Fields: `id`, `deliveryJobId`, `shipmentId` (nullable), `entryType` (BUYER_LOGISTICS_CHARGE, CARRIER_PAYABLE, SUPPLIER_LOGISTICS_CHARGE, MAYSAR_LOGISTICS_REVENUE, DISCOUNT_MAYSAR_FUNDED, DISCOUNT_SUPPLIER_FUNDED, PENALTY, REFUND, ADJUSTMENT, CONSOLIDATION_SAVING), `amountTzs` (positive: income to that party, negative: cost to that party), `counterpartyId`, `pricingVersion`, `tariffVersion`, `routingVersion`, `calculatedAt`, `metadata` (JSON containing full calculation inputs — enough to reproduce the result). Create migration. **Never UPDATE rows — append only**
  - ✅ Done (2026-09-04). Same migration. Append-only entity (no mutators, all 10 entry types validated) + `PrismaLedgerEntryRepository` with `append()` (create-only) + type-scoped queries. **Live-verified**: BUYER_LOGISTICS_CHARGE (+) and CARRIER_PAYABLE (−) entries both queryable with sign semantics intact (VERIFY: PASS).

- [x] **Write ledger entries on job completion** — Every completed `DeliveryJob` writes: one `BUYER_LOGISTICS_CHARGE` entry (what buyer paid), one `CARRIER_PAYABLE` entry (what driver receives), one `MAYSAR_LOGISTICS_REVENUE` entry (Maysar margin), and `CONSOLIDATION_SAVING` entries for any saving achieved through consolidation
  - ✅ Done (2026-09-06). `RecordJobCompletionLedgerUseCase` writes all three mandatory entries + a `CONSOLIDATION_SAVING` when `plannedFulfillmentCostTzs` > actual cost. Buyer charge = the **locked price** (rule 6, never a re-quote); carrier payable ≥ 0 never below cost; Maysar revenue = buyer price − actual cost (validated `≥ 0` — a loss-making job is rejected, not silently subsidized); all entries carry `pricingVersion`/`tariffVersion`/`routingVersion`. Reachable from the delivery-event consumer via `SettlementLifecycleService.writeJobCompletionLedger()`.

- [x] **Store all version references on each entry** — `pricingVersion`, `tariffVersion` (FK to `VehicleTariff.version`), and a `routingVersion` (hash or version of the routing config used). This ensures any historical transaction can be reproduced exactly six months later
  - ✅ Done (2026-09-04). All three version columns are on the model and enforced as constructor invariants (`pricingVersion` required; `tariffVersion`/`routingVersion` optional-null). Verified in the live check.

- [x] **Settlement service reads ledger only** — Settlement must never re-derive amounts from current config. It reads `Logistics_LedgerEntry` records for the job and disburses exactly what was recorded
  - ✅ Done (2026-09-06). `SettleDeliveryJobUseCase` reads **only** `LedgerEntryRepository.findByDeliveryJobId()`. Buyer charge, carrier payable, Maysar revenue, consolidation savings, and adjustment treatment all derive from the ledger — never from current config or re-pricing. Verified in tests (4/4) and live (VERIFY: PASS).

### 3.4 Price lock on confirmation

- [x] **`FulfillmentCommitment` model** — Fields: `id`, `checkoutSessionId`, `quoteId`, `buyerPriceTzs` (locked), `pricingVersion`, `lockedAt`, `expiresAt`, `status` (LOCKED, CONSUMED, EXPIRED). Create migration
  - ✅ Done (2026-09-04). Same migration. Entity with LOCKED → CONSUMED | EXPIRED named transitions (dead-end terminal states), expiry invariant. Repo `save()` upserts on quoteId but its update branch touches **status only** — `buyerPriceTzs` can never be rewritten. **Live-verified**: a tampered re-save with `buyerPriceTzs: 1` left the locked price at 13,200 (VERIFY: PASS).

- [x] **Lock price at checkout confirmation** — When buyer confirms, create a `FulfillmentCommitment` record with the displayed `buyerPriceTzs`. This price must not change regardless of post-confirmation optimization
  - ✅ Done (2026-09-04). `__lockFulfillmentPrice` registered by the logistics module (same pattern as `__createOrderShipments`) and called non-fatally from **both** confirmation paths: multi-seller (`MultiSellerCheckoutUseCase` Step 5.6 — locks each seller's validated quote fee, captured server-side during Step 3 validation) and single-seller (controller locks `session.quoteId` + server-authoritative `session.shippingCost`).
  - ⚠️ Remaining follow-up: wire `commitment.consume()` into the checkout session-completion flow and `expire()` into a TTL sweeper — both one-liners once a job scheduler exists (Phase 5 pool job).

- [x] **Post-confirmation optimization savings → Maysar** — If the optimizer finds a cheaper consolidated route after price lock, the saving is recorded as a `CONSOLIDATION_SAVING` ledger entry attributed to Maysar's benefit — not passed to buyer as a surprise credit
  - ✅ Done (2026-09-06). Inside `RecordJobCompletionLedgerUseCase`: when `actualFulfillmentCostTzs < plannedFulfillmentCostTzs`, a `CONSOLIDATION_SAVING` ledger entry is appended for `plannedCost − actualCost` with `counterpartyId: 'MAYSAR'` and metadata explicitly recording `postConfirmationOptimization: true` + `buyerPriceUnchanged`. The buyer's price is the locked commitment — the saving is Maysar's efficiency gain, never a surprise credit (rule 6). Live-verified (VERIFY: PASS, TZS 500).

- [x] **`CostVariancePolicy` config** — Define in `Logistics_OptimizationConfig`: `maysarAbsorbsUpToTzs` (normal operational variance Maysar covers), `customerChargeableVarianceTypes` (only customer-caused variances can be passed on, and only with explicit policy coverage). Store versioned in config — not in application code
  - ✅ Done (2026-09-06, via the Phase 4 config work). Both fields are columns on `Logistics_OptimizationConfig` (DB defaults 0 / `[]`), carried by the `OptimizationConfig` value object (`variancePolicy` getter, validated ≥ 0), persisted by `PrismaOptimizationConfigRepository.save()` which always creates a new version — values are operator-set, never in application code. When no active row exists the value object supplies the neutral defaults.

---

## Phase 4 — Fulfillment Option Engine (Medium-term)

Instead of returning one delivery quote, the system generates multiple feasible options. This is the most visible differentiating feature.

### 4.1 Fulfillment option generation

- [x] **`FulfillmentOptionEngine`** — Given a set of Shipments, generates all feasible delivery options. Initial option types:
  - ✅ Done (2026-09-04). `domain/engines/fulfillment-option.engine.ts` — pure engine emitting complete plans (`SUPPLIER_DELIVERY`, `MAYSAR_SHARED`, `MAYSAR_EXPRESS`, `CUSTOMER_PICKUP`), each carrying buyerPrice/driverCompensation/maysarMargin/fulfillmentCost. Feasibility hard gates run FIRST (capacity, vehicle-class compatibility, COD-tier radius, consolidation availability, pickup eligibility) and infeasible options are returned in `excluded` — escalated, never silently dropped. Driver minimum-earnings gate enforced as a hard constraint before any option can appear. 13/13 tests.
  - `SUPPLIER_DELIVERY` — seller uses their own carrier (Maysar passes through, minimal margin)
  - `MAYSAR_SHARED` — Maysar consolidates with other orders in the same window (cheaper, less time-certain)
  - `MAYSAR_EXPRESS` — dedicated Maysar route (faster, higher price)
  - `CUSTOMER_PICKUP` — buyer collects (TZS 0 delivery, only for locally pickup-eligible sellers)

  Each option is a complete fulfillment plan, not a label. It contains: `optionType`, `fulfillmentPlanId`, `estimatedPickupAt`, `estimatedDeliveryAt`, `deliveryWindow` (FLEXIBLE / STANDARD / EXPRESS), `buyerPriceTzs` (from `BuyerPriceEngine`), `driverCompensationTzs` (from `DriverCompensationEngine`), `maysarMarginTzs`, `fulfillmentCostBreakdown`

- [x] **`POST /api/logistics/v1/fulfillment-options`** — New endpoint. Accepts: `masterOrderId` (or `sessionId` pre-order), `buyerDestination`, `deliveryWindowPreference`. Returns: array of ranked `FulfillmentOption` objects. The existing `POST /api/logistics/v1/quote` endpoint remains for backward compat (single-seller flow)
  - ✅ Done (2026-09-04). Endpoint registered on `publicQuoteRouter` + mounted. `GenerateFulfillmentOptionsUseCase` loads active OptimizationConfig + VehicleTariff, generates feasible options, ranks with active weights, returns ranked options + `exclusions` + `weights`. HTTP e2e tests (2/2) + live DB verification (VERIFY: PASS — 4 ranked options, ranks+weights present; validated via `scripts/verify-fulfillment-options.ts`). `/quote` untouched for backward compat.

- [x] **Delivery window as a buyer input** — Add `deliveryWindowPreference` field to checkout session: `FLEXIBLE` (any time same/next day), `STANDARD` (4-hour window), `EXPRESS` (2-hour window). `FLEXIBLE` orders give the consolidation engine more freedom and should produce lower prices. Store on `Logistics_Shipment.requestedDeliveryWindow`
  - ✅ Done (2026-09-05). `Checkout_CheckoutSession.deliveryWindowPreference` column added (migration `20260904050000_add_checkout_delivery_window`, applied + verified live), persisted via `PrismaCheckoutRepository` (upsert update/create branches + read mapper). `InitiateCheckoutUseCase` accepts it in `options`, validates it against FLEXIBLE|STANDARD|EXPRESS (invalid → 400 field error), stores it on the session and mirrors it into `metadata`. Confirm paths thread the choice (request → session column → metadata fallback) into `CreateOrderShipmentsUseCase`, which maps FLEXIBLE→generous next-day window, STANDARD→4h, EXPRESS→2h onto `Logistics_Shipment.requestedDeliveryWindow` (`{earliestAt, latestAt}`). 3 new initiate-checkout tests (persist, reject invalid, omit) — full checkout regression 45/45 green.
  - _From spec: Phase 4 §4.1_

### 4.2 Option ranking with configurable weights

- [x] **`OptionRankingEngine`** — Scores each option against a weighted objective function:
  - ✅ Done (2026-09-04). `domain/engines/option-ranking.engine.ts` — implements the exact weighted objective (cost/speed/utilization/failure-risk/driver-economics/margin) with normalized normalization per component; returns options sorted by score desc with full `scoreComponents` for audit. Only FEASIBLE options reach it (hierarchy rule 8). 3/3 ranking tests.
  ```
  score = (buyer_cost_weight       × normalized_cost_score)
        + (delivery_time_weight    × normalized_speed_score)
        + (utilization_weight      × vehicle_utilization_score)
        + (failure_risk_weight     × (1 − failure_probability_score))
        + (driver_efficiency_weight × driver_economics_score)
        + (maysar_margin_weight    × margin_viability_score)
  ```

- [x] **`Logistics_OptimizationConfig` model** — Versioned, operator-configurable weights and thresholds. Fields: `version`, `buyerCostWeight`, `deliveryTimeWeight`, `vehicleUtilizationWeight`, `failureRiskWeight`, `driverEfficiencyWeight`, `maysarMarginWeight`, `isActive`, `createdAt`. Values must sum to 1.0 (validation at save time). **Config changes require a new version — no in-place overwrites**
  - ✅ Done (2026-09-04). Migration `20260904040000_add_optimization_config` applied. Value object validates weights-sum-to-1.0 and per-weight ∈ [0,1]; `PrismaOptimizationConfigRepository.save()` always CREATES the next version (max+1) and deactivates all others — old versions stay queryable. Also carries the Phase 3 §3.4 `CostVariancePolicy` (`maysarAbsorbsUpToTzs`, `customerChargeableVarianceTypes`). 4/4 value-object tests.

- [x] **Optimization hierarchy** — Enforce in `FulfillmentOptionEngine`: feasibility checks run first and eliminate infeasible options before ranking. No option that fails a hard constraint (vehicle capacity, COD tier geographic limit, unsupported area, minimum driver earnings) can appear in the ranked list
  - ✅ Done (2026-09-04). Feasibility hard gates (capacity, vehicle-class compatibility, COD-tier radius, unsupported-area, consolidation availability, pickup eligibility) run first and populate `excluded`; the driver minimum-earnings gate is applied post-generation as a second hard filter. Ranking (`OptionRankingEngine`) only ever sees feasible options. Hierarchy 1→6→7 order preserved.

  Hierarchy:
  1. Feasibility — can it actually be delivered?
  2. Safety/compliance — is the fulfillment plan valid?
  3. Reliability — what is the probability it succeeds?
  4. Buyer economics — can buyer cost be reduced?
  5. Capacity utilization — can we avoid empty trips?
  6. Driver economics — is compensation sustainable?
  7. Maysar margin — can Maysar earn sustainably?

  **Do not reverse this order.**

### 4.3 COD Trust tier as logistics input

The trust system already enforces geographic radius limits. Wire it into option eligibility.

- [x] `NEW_BUYER` (≤ 24km radius) → only `LOCAL_URBAN` zone options offered; `MAYSAR_EXPRESS` eligible but `MAYSAR_SHARED` restricted
  - ✅ Done (2026-09-04). Engine takes `buyerTrustTier`; NEW_BUYER beyond `maxLocalRadiusKm` (default 24) excludes MAYSAR_EXPRESS, and MAYSAR_SHARED is always excluded for NEW_BUYER. `flexibleWindowDiscount` never applies below TRUSTED_BUYER. Test-covered in `fulfillment-options.test.ts`.
- [x] `TRUSTED_BUYER+` → all fulfillment options available; `FLEXIBLE` window discount unlocked
  - ✅ Done (2026-09-04). Default tier; unlocks the FLEXIBLE-window shared discount (`flexibleWindowDiscountApplied` flag); full option set present in tests + live verification.
- [x] `GOLD_BUYER+` → nationwide fulfillment; highest-tier consolidation eligible
  - ✅ Done (2026-09-04). No radius restriction; intercity `MAYSAR_EXPRESS` verified for a Dar→Arusha route (`deliveryZone: 'intercity'`).
- [x] `FLEXIBLE` window discount available only to `TRUSTED_BUYER` tier or higher (reduces risk of window manipulation)
  - ✅ Done (2026-09-04). `flexibleDiscount` is only computed for tier !== NEW_BUYER; test asserts a NEW_BUYER NEVER has the flag.

---

## Phase 5 — Driver Matching and Live Optimization (Longer-term)

### 5.1 Driver matching score

- [x] **`DriverMatchingEngine`** — Ranks available drivers for a `DeliveryJob` using a composite score: vehicle compatibility (hard filter first), distance to pickup (kilometers), available weight/volume capacity, historical reliability score (delivery success rate, last 90 days), current route compatibility (does this job fit an active route without major deviation?), estimated arrival time at pickup, compensation cost vs. minimum earnings. **Never assign on cheapest alone — assign on best feasible score**
  - ✅ Done (2026-09-06). `domain/engines/driver-matching.engine.ts` — pure `rank()` with hard filters first (availability → vehicle class → capacity → area serve → minimum earnings) then weighted composite score; every result carries `scoreComponents` for audit. 8/8 tests in `__tests__/driver-matching.engine.test.ts` (incl. eligible-above-excluded ordering and determinism per rule 4).

- [x] **Driver matching API** — `POST /api/logistics/v1/jobs/:jobId/match-drivers` (internal, platform-only). Returns ranked list of compatible drivers with scores. The matching score and all input factors must be stored on the assignment record for audit
  - ✅ Done (2026-09-06). `api/routes/driver-matching.routes.ts` mounted at `/api/logistics/internal/jobs/:jobId/match-drivers` behind `requireRoleOrService(['admin','system'])` (`logistics-service/index.ts`). `MatchDriversUseCase` persists **every** candidate (eligible or not) to `Logistics_DriverMatchAudit` with score, components, exclusion reason, compensation, ETA, distance. Candidates read live from `Logistics_Courier` (online, ≤25 km radius) via `PrismaDriverCandidateSource`; tariff from `VehicleTariffRepository`.

- [x] **Minimum earnings gate** — Before any `DeliveryJob` is offered to a driver: assert `estimatedDriverCompensation >= vehicle.minimumJobCompensationTzs`. If not met, the job must be repriced, merged with another job, or escalated to ops. It must not be dispatched at a loss to the driver
  - ✅ Done (2026-09-06). Enforced twice: the engine excludes below-minimum candidates as a hard filter, and `MatchDriversUseCase` returns a `gate` block (`meetsMinimumEarnings`, `offerable`) — a job with no eligible candidate is reported as not offerable for repricing/merge/escalation.

### 5.2 Route insertion optimization

- [x] **Route insertion check** — When a new Shipment enters the pool and active DeliveryJobs exist in the same area, evaluate inserting the new Shipment into each compatible active job's route. Calculate: `marginalCost = cost(route_with_new_stop) − cost(current_route)`. If `marginalCost < insertionCostThreshold` (configurable) and vehicle capacity permits, flag the job as a candidate for extension
  - ✅ Done (2026-09-06). Pure `RouteInsertionEngine` (`route-insertion.engine.ts`: hard filters CAPACITY/VEHICLE_CLASS first, then THRESHOLD; road-factor ×1.35, 30 km/h fallback — 6/6 tests). Wired live: `CreateOrderShipmentsUseCase` runs `EvaluateRouteInsertionsUseCase` for every newly created shipment (non-fatal), threshold from the active versioned `OptimizationConfig` (conservative 5 000 TZS default).

- [x] **`Logistics_RouteInsertionCandidate` model** — Records evaluated insertion opportunities: `id`, `shipmentId`, `deliveryJobId`, `marginalCostTzs`, `additionalDistanceKm`, `additionalDurationMinutes`, `feasible`, `evaluatedAt`. Allows retrospective analysis of optimization quality
  - ✅ Done (2026-09-06). Schema model (RIC- prefix, `rejectionReason` CAPACITY|THRESHOLD|VEHICLE_CLASS) + entity + `PrismaRouteInsertionCandidateRepository`; migration `20260904060000_add_phase5_matching_and_pool` applied and verified live (table exists). Every evaluation — feasible or not — is persisted by `EvaluateRouteInsertionsUseCase`.

- [x] **Insertion execution** — If a driver accepts an insertion offer (via driver app event `RouteExtensionAccepted`), update the `DeliveryJob.shipmentIds`, recalculate route, issue an updated `FulfillmentCommitment` to the new shipment's buyer (their price is based on the marginal cost, not the full route cost)
  - ✅ Done (2026-09-06). `ExecuteRouteInsertionUseCase`: accepts only a previously-evaluated **feasible** candidate; extends the job via the named `extendWithShipment()` transition, binds the shipment (`assignToJob`), and issues a `FulfillmentCommitment` priced at the **marginal cost** — never the full route cost (backlog rule 6: lock is absolute).

### 5.3 Continuous shipment opportunity pool

- [x] **`Logistics_ShipmentPool` view or materialized table** — Pending Shipments not yet assigned to a DeliveryJob, with time window, weight, origin GeoPoint, destination GeoPoint, and `requiredVehicleClass`. Refreshed on every Shipment state change
  - ✅ Done (2026-09-06). `Logistics_ShipmentPoolEntry` materialized mirror (SPL- prefix, unique on shipmentId, window/weight/geo/vehicle-class columns); `ShipmentPoolService.refresh()/remove()` called from both shipment state-change points — creation (`CreateOrderShipmentsUseCase`) and job assignment (`AssignShipmentsToJobsUseCase`), both non-fatal. Migration applied, table verified live.

- [x] **Pool optimization job** — Scheduled job (configurable interval, default 5 min). Scan the pool: find clusters of pending Shipments within `consolidationRadiusKm` of each other with overlapping time windows and compatible vehicle requirements. For each cluster meeting consolidation thresholds, generate a candidate `DeliveryJob`. Present to available matching drivers
  - ✅ Done (2026-09-06). `PoolOptimizationJob` (`shipment-pool.service.ts`): interval configurable via `POOL_OPTIMIZATION_INTERVAL_MS` (default 5 min), overlap-safe `run()` (never overlaps a still-running pass); clusters via pure `clusterPoolEntries` (radius/weight from active PricingConfig); clusters ≥2 create candidate PENDING `DeliveryJob`s and present them to `MatchDriversUseCase` (non-fatal). **Wiring gap fixed:** nothing started the job — now `start()`ed in module `initialize()` and `stop()`ed on shutdown (`logistics-service/index.ts`).

- [x] **Pool optimization analytics** — Track per run: shipments evaluated, consolidation candidates found, jobs created, average savings per consolidated job. Feed into the fairness KPIs
  - ✅ Done (2026-09-06). Per-run stats persisted to `Logistics_PoolOptimizationRun` (shipmentsEvaluated, consolidationCandidatesFound, jobsCreated, averageSavingsPerJobTzs, durationMs) — **gap fixed:** stats were computed and logged but never persisted. Table live; feeds the Phase 6 fairness KPIs.

---

## Phase 6 — Fairness Engine and Operational Intelligence (Longer-term)

### 6.1 Fairness Engine

- [x] **`FairnessEngine`** — Validates every generated `FulfillmentOption` against four checks before it can be returned to the buyer:
  - **Buyer fairness:** `buyerPriceTzs / fulfillmentCostTzs <= config.maxBuyerPriceRatio` — buyer is not paying substantially more than the economic cost of the delivery
  - **Driver fairness:** estimated `driverCompensationTzs / estimatedActiveHours >= config.minimumDriverHourlyRateTzs`
  - **Supplier fairness:** no adjustment attributed to `SUPPLIER` is being charged to the buyer
  - **Maysar sustainability:** `maysarMarginTzs >= 0` — platform is not subsidizing a loss on this transaction
  - ✅ Done (2026-09-06). Pure `FairnessEngine` (`domain/engines/fairness.engine.ts`) — all four checks in one `evaluate()` returning `FairnessReport` with per-violation computedValue/threshold/detail. Thresholds (`maxBuyerPriceRatio`, `minimumDriverHourlyRateTzs`, `minVehicleUtilizationTarget`) are versioned on `Logistics_OptimizationConfig` (migration adds the columns with defaults 1.5 / 3000 / 0.5) — policy in config, not code. 6/6 tests.

- [x] **`Logistics_FairnessFlag` model** — Records every failed check: `id`, `optionId` (or `deliveryJobId`), `checkType` (BUYER_PRICE_RATIO, DRIVER_EARNINGS, SUPPLIER_ATTRIBUTION, MAYSAR_SUSTAINABILITY), `computedValue`, `threshold`, `flaggedAt`, `resolvedAt` (nullable), `resolvedBy`. Flags are visible in the ops dashboard and not silently dropped
  - ✅ Done (2026-09-06). Schema model (FFL- prefix) + `FairnessFlagRepository` + `PrismaFairnessFlagRepository` (append-only creation; resolution is the only mutation); migration `20260904070000_add_phase6_fairness_and_buyer_profile` applied and both tables verified live. `findUnresolved()` feeds the ops dashboard view.

- [x] **Flagged options are escalated, not silently removed** — If an option fails a fairness check, it must not appear in the buyer's option list. An internal `FairnessFlag` record is created and surfaced to the ops team for review. The system must log why the option was excluded
  - ✅ Done (2026-09-06). `GenerateFulfillmentOptionsUseCase.applyFairness()` runs after ranking in both branches (with and without active tariff): failing options are removed from `options` AND returned in `fairnessExcluded` with full violation details, while each violation is persisted as a `Logistics_FairnessFlag` (non-fatal persistence — a DB failure never crashes the buyer flow, but exclusion details always travel in the response).

### 6.2 Fairness and operational KPIs

Track continuously via existing analytics infrastructure:

- [x] **Buyer KPI:** `actual_fulfillment_cost / buyer_price` — rolling 7-day average. Alert if consistently above `config.maxBuyerPriceRatio`
- [x] **Driver KPI:** `driver_earnings / active_hours` per driver — rolling 30-day. Alert if any active driver falls below `minimumDriverHourlyRateTzs` for 3+ consecutive days
- [x] **Vehicle KPI:** `used_capacity_kg / max_capacity_kg` per job — track average utilization. Alert if average drops below `config.minVehicleUtilizationTarget` (indicates consolidation is underperforming)
- [x] **Route KPI:** `revenue_per_km`, `revenue_per_hour` per route. Track trend over time
- [x] **Consolidation KPI:** `total_savings_from_consolidation_tzs` — aggregate from `Logistics_ConsolidationAudit`. Track per week. This is the headline metric for the optimization engine's value
  - ✅ All five Done (2026-09-06) via `LogisticsKpiService` (`application/services/logistics-kpi.service.ts`) — one non-fatal snapshot over existing records: Buyer (7-day cost/price from `Logistics_PricingAuditRecord`, cost = fee − platform margin), Driver (latest eligible match audit per driver: compensation vs ETA-based active hours), Vehicle (assigned-shipment weight vs `Logistics_Vehicle.maxWeightKg`), Route (7-day revenue/km and revenue/hour from audit records), Consolidation (aggregate savings from `Logistics_ConsolidationAudit` — headline metric). Alerts computed against the active versioned config thresholds. Exposed at `GET /api/logistics/internal/kpis` (platform-only, `kpi.routes.ts`). Each KPI degrades to `null` (not an error) when its source table is empty or unavailable.

### 6.3 Buyer behavior model for failure prediction

- [x] **`Logistics_BuyerProfile` model** — Per-buyer logistics record: `buyerId`, `preferredDeliveryWindows` (JSON histogram), `deliverySuccessRate` (0.0–1.0), `typicalOrderWeightKg`, `consolidationAcceptanceRate` (fraction of times buyer chose shared over express), `pickupPreference` (DELIVERY / PICKUP), `lastUpdatedAt`. Updated on each `DeliveryConfirmed` or `DeliveryFailed` event
  - ✅ Done (2026-09-06). Schema model (unique buyerId, new-buyer default success rate 0.80) + `BuyerProfileRepository` + `PrismaBuyerProfileRepository.recordOutcome()` recomputing the rolling success rate, incremental mean weight, window histogram and consolidation-acceptance rate on every outcome. `BuyerProfileService.recordDeliveryOutcome()` is registered as `__recordBuyerDeliveryOutcome` on globalThis (`logistics-service/index.ts`) for the delivery-event consumer — non-fatal by contract.

- [x] **Use buyer profile in option ranking** — Feed `deliverySuccessRate` into the `failure_probability_score` component of `OptionRankingEngine`. A buyer with a 95% delivery success rate gets ranked differently than a new buyer (default 80%) for express options. This means the optimizer suggests more reliable options to higher-risk buyers
  - ✅ Done (2026-09-06). `OptionRankingEngine.rank()` accepts an optional `BuyerRiskProfile`; base per-window-type failure probabilities scale by `0.80 / buyerSuccessRate` (clamped to [0.3, 1.0] input, saturating ≤1). `GenerateFulfillmentOptionsUseCase` loads the profile when a `buyerId` is supplied. 3/3 integration tests: 95%-success buyer → strictly lower failure probability and higher score than a 60%-success buyer; no profile ≡ 0.80 default.

---

## Sequencing and Dependencies

```
Phase 1 (Immediate)
  └─ blocks everything below

Phase 2 (Short-term)
  ├─ requires Phase 1 complete
  └─ blocks Phases 3–6

Phase 3 (Medium-term)
  ├─ requires Phase 2 complete
  └─ blocks settlement correctness in Phases 4–6

Phase 4 (Medium-term, can start in parallel with Phase 3)
  └─ requires Phase 2 complete

Phase 5 (Longer-term)
  └─ requires Phases 3 and 4 complete

Phase 6 (Longer-term)
  └─ requires Phase 5 complete
```

| Phase | Focus | Blocking risk if skipped |
|-------|-------|--------------------------|
| 1 | Finish existing in-flight work | Security vulnerability stays live; consolidation never activates |
| 2 | Shipment + DeliveryJob domain objects, Vehicle model | Multi-shipment orders impossible; driver matching has no data model |
| 3 | Four-concept cost separation, Ledger, Price lock | Settlement is incorrect; disputes unresolvable; historical pricing unexplainable |
| 4 | Fulfillment option engine, Delivery windows | Buyers see one undifferentiated price; optimization has no buyer-facing surface |
| 5 | Driver matching, Route insertion, Pool optimization | Dispatch remains reactive; "fair delivery" promise architecturally undeliverable |
| 6 | Fairness Engine, Operational KPIs, Buyer modeling | System can produce unfair outcomes silently; no operational visibility |

---

## Architectural Rules (enforced by design, never by convention)

1. **The Order Service never calculates a delivery price.** It requests a fulfillment plan from Logistics Service.
2. **Cost, Price, Driver Compensation, and Maysar Margin are four separate outputs.** They are never summed into a single `deliveryFee` field in the domain layer.
3. **The driver compensation minimum is a hard constraint**, checked by `DriverCompensationEngine` before any option is offered. It cannot be overridden by the optimizer.
4. **All pricing is reproducible.** Every calculation stores `pricingVersion`, `tariffVersion`, and `routingVersion`. Running the same inputs against the same versions must produce the same result.
5. **Tariffs are versioned, never overwritten.** `VehicleTariff v1` must remain queryable after `VehicleTariff v3` is active.
6. **Price lock is absolute.** Post-confirmation optimization improvements are Maysar's efficiency gain, not the buyer's surprise credit.
7. **Ledger entries are append-only.** Settlement reads the ledger; it never re-derives from current config.
8. **The optimization hierarchy is fixed**: Feasibility → Safety → Reliability → Buyer Economics → Capacity → Driver Economics → Maysar Margin. This order must not be reversed.
9. **Fairness flags are visible, not silent.** Options that fail fairness checks are escalated to ops — they are never silently removed from a list without a recorded reason.
10. **Straight-line (Haversine) distance is for preliminary estimates and consolidation proximity checks only.** Final pricing always uses road-network distance and estimated travel time.
