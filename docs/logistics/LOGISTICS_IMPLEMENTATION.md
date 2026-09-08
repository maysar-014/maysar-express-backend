# Maysar Logistics — Implementation Reference (As-Built)

> **Status:** Live and verified — all six phases of the engineering backlog implemented (72/72 tasks).  
> **Last updated:** September 2026  
> **Scope:** `services/logistics-service` + logistics surfaces of `services/checkout-service` + `prisma/schema.prisma`  
> **Where this fits:** this is the *as-built* companion to the [Engineering Backlog](./LOGISTICS_ENGINE_BACKLOG.md). The backlog records *what was planned and completed*; this document records *how the system is actually built* and how the pieces connect.

---

## 1. Guiding Principles Enforced by the Code

The logistics domain keeps **four permanently separate concepts**. The codebase enforces this structurally — the domain layer of the three-engine path never collapses them into a single `deliveryFee` field.

| Concept | Where it lives in code |
|---|---|
| **Logistics Cost** | `FulfillmentCostEngine` → `FulfillmentCostBreakdown` |
| **Logistics Price** | `BuyerPriceEngine` → `LogisticsPriceBreakdown` (buyer charge) |
| **Driver Compensation** | `DriverCompensationEngine` → `DriverCompensationBreakdown` |
| **Maysar Margin** | `BuyerPriceEngine` (the *only* place margin is calculated) |

**Invariants enforced in code:**

- `BuyerPriceEngine`: `finalBuyerPrice = cost + margin − discount` with discount capping (never negative) and rounding increments.
- `DriverCompensationEngine`: `assertOfferable()` — a job whose compensation falls below `vehicle.minimumJobCompensationTzs` is **not offerable** (hard constraint, checked before any option is offered).
- `RecordJobCompletionLedgerUseCase`: Maysar revenue = buyer price − actual cost, validated `≥ 0` — a loss-making job is **rejected**, never silently subsidized.
- The Order/Checkout service never computes a logistics price; it requests quotes/plans and stores server-authoritative fees only.

---

## 2. Domain Model (Prisma `Logistics_*` models)

All models live in `prisma/schema.prisma`, mapped to `logistics_` tables.

### 2.1 Pre-Phase models (legacy, still active)
| Model | Purpose |
|---|---|
| `Logistics_Courier` | Courier/driver records (embeds vehicle fields; status, on-time rate) |
| `Logistics_Delivery` | Legacy single delivery record (pre-Shipment era) |
| `Logistics_Earning` / `Logistics_LocationHistory` | Earnings + real-time location history |

### 2.2 Phase 1 — Pricing pipeline
| Model | Purpose |
|---|---|
| `Logistics_PricingConfig` | Versioned pricing config (base/distance/time rates, zone multipliers, weight tiers, surcharge schedules, quote validity, consolidation params: `consolidationRadiusKm`, `maxConsolidatedRouteOverheadPct`, `maxGroupWeightKg`, `allocationAlgorithm`) |
| `Logistics_Quote` | A priced, single-use delivery quote (`ACTIVE` → `CONSUMED`/`EXPIRED`/`DELIVERY_UNAVAILABLE`) |
| `Logistics_PricingAuditRecord` | Immutable record of every pricing run (fee, compensation, margin, zone, weight, distance, duration) |
| `Logistics_DeliveryGroup` | Consolidated delivery group (backward-compat; maps to DeliveryJob) |
| `Logistics_ConsolidationAudit` | Per-consolidation audit (group sizes, rules applied, savings) |

### 2.3 Phase 2 — Shipment, DeliveryJob, Vehicle
| Model | Purpose |
|---|---|
| `Logistics_Shipment` | The atomic unit of physical movement (`SHP-` ids) — origin/destination, weight, dimensions, handling requirements, requested delivery window, `requiredVehicleClass`, full state machine |
| `Logistics_DeliveryJob` | One physical courier operation (`DJB-` ids) — may contain many Shipments; driver/vehicle/route refs; full state machine |
| `Logistics_Vehicle` | Real capability model (`VHL-` ids): type, max weight/volume, cargo dimensions, served areas, operating hours, refrigeration/fragile flags |
| `Logistics_VehicleTariff` | **Versioned** tariff per vehicle (`@@unique([vehicleId, version])`) — `save()` always appends the next version; old versions stay queryable for historical reproduction |

### 2.4 Phase 3 — Cost model, ledger, price lock
| Model | Purpose |
|---|---|
| `Logistics_CostAdjustment` | Immutable, attributed cost deviation (create-only; party-scoped queries) |
| `Logistics_LedgerEntry` | **Append-only** accounting ledger (10 entry types incl. `BUYER_LOGISTICS_CHARGE`, `CARRIER_PAYABLE`, `MAYSAR_LOGISTICS_REVENUE`, `CONSOLIDATION_SAVING`, `ADJUSTMENT`); carries `pricingVersion`/`tariffVersion`/`routingVersion` + reproduction metadata |
| `Logistics_FulfillmentCommitment` | **Absolute price lock** (`LOCKED` → `CONSUMED`/`EXPIRED`); repo updates **status only** — the locked `buyerPriceTzs` can never be rewritten |

### 2.5 Phase 5 — Matching, insertion, pool
| Model | Purpose |
|---|---|
| `Logistics_DriverMatchAudit` | Append-only audit of every driver-match candidate (score, components, exclusion reason, compensation, ETA) |
| `Logistics_RouteInsertionCandidate` | Recorded insertion evaluations (feasible **and** rejected, with reason) |
| `Logistics_ShipmentPoolEntry` | Materialized snapshot of the pending-shipment opportunity pool (refreshed on every shipment state change) |
| `Logistics_PoolOptimizationRun` | Per-run pool optimization analytics (fairness-KPI feed) |

### 2.6 Phase 4 + 6 — Config, fairness, buyer behavior
| Model | Purpose |
|---|---|
| `Logistics_OptimizationConfig` | **Versioned** ranking weights (must sum to 1.0), `CostVariancePolicy` (Phase 3 §3.4), and the three fairness thresholds (Phase 6 §6.1) — no in-place overwrites |
| `Logistics_FairnessFlag` | Visible escalation of every failed fairness check |
| `Logistics_BuyerProfile` | Per-buyer logistics behavior (rolling success rate, window histogram, consolidation acceptance) |

---

## 3. Pure Domain Engines

All engines below are stateless and deterministic (no async, no I/O, no side effects).

| Engine | File | Purpose |
|---|---|---|
| `DeliveryPricingEngine` | `domain/engines/delivery-pricing.engine.ts` | The original **11-stage** single pipeline (interim measure; still the fallback) |
| `FulfillmentCostEngine` | `domain/engines/fulfillment-cost.engine.ts` | Raw economic cost of the operation (base + distance + time + loading + unloading + chargeable waiting + structured add-ons) |
| `DriverCompensationEngine` | `domain/engines/driver-compensation.engine.ts` | Driver compensation (independent of pricing); enforces the minimum-earnings hard constraint |
| `BuyerPriceEngine` | `domain/engines/buyer-price.engine.ts` | The **only** place Maysar margin is calculated |
| `ThreeEngineBreakdown` | `domain/engines/three-engine-breakdown.ts` | Types tying the three engines into one breakdown |
| `FulfillmentOptionEngine` | `domain/engines/fulfillment-option.engine.ts` | Generates all feasible options (`SUPPLIER_DELIVERY`, `MAYSAR_SHARED`, `MAYSAR_EXPRESS`, `CUSTOMER_PICKUP`); **feasibility-hierarchy gates run before ranking**; exclusions always surfaced (`excluded[]`) |
| `OptionRankingEngine` | `domain/engines/option-ranking.engine.ts` | Weighted objective (buyer cost / time / utilization / failure risk / driver economics / margin); honors the buyer's `deliverySuccessRate` (§6.3) via `BuyerRiskProfile` |
| `DriverMatchingEngine` | `domain/engines/driver-matching.engine.ts` | Ranks drivers: hard filters first (availability → class → capacity → area → minimum earnings), then composite best-feasible score (never cheapest alone) |
| `RouteInsertionEngine` | `domain/engines/route-insertion.engine.ts` | `marginalCost = cost(route + stop) − cost(route)`; CAPACITY/VEHICLE_CLASS/THRESHOLD hierarchy |
| `FairnessEngine` | `domain/engines/fairness.engine.ts` | Four checks: BUYER_PRICE_RATIO, DRIVER_EARNINGS, SUPPLIER_ATTRIBUTION, MAYSAR_SUSTAINABILITY |
| `CostAttribution` | `domain/engines/cost-attribution.ts` | Pure mapping of the five §3.2 attribution rules |
| `consolidate()` | `domain/engines/consolidation.engine.ts` | Pure cluster consolidation (proximity, weight, route overhead, vehicle-class compatibility) |
| `allocateByWeight()` | `domain/engines/cost-allocator.ts` | Weight-proportional allocation of a consolidated fee |
| `clusterPoolEntries()` | `domain/engines/pool-clustering.ts` | Pure clustering for the pool optimization job |
| `ZoneClassifier` | `domain/services/zone-classifier.ts` | Lane zone classification (local/metro/intercity) |
| `CourierCostCalculator` | `domain/engines/courier-cost-calculator.ts` | Couriers estimate; **decoupled constants with `// SYNC-WITH: VehicleTariff` markers** — reads active tariff rates when available |
---

## 4. Value Objects

| Value object | File | Enforces |
|---|---|---|
| `PricingConfig` | `domain/value-objects/pricing-config.value-object.ts` | Negative rates, floor>ceiling, zero rounding increment, missing zone multiplier all throw |
| `OptimizationConfig` | `domain/value-objects/optimization-config.value-object.ts` | Weights ∈ [0,1] and **sum to 1.0**; variance policy ≥ 0; fairness thresholds > 0 / ∈ [0,1] |
| `GeoPoint`, `Money`, `TimeWindow`, `Weight`, `RouteProgress` | `domain/value-objects/*` | Geo/currency/time/weight invariants |

---

## 5. Application Layer (use cases & services)

### 5.1 Use cases
| Use case | File | Notes |
|---|---|---|
| `RequestDeliveryQuoteUseCase` | `application/use-cases/request-delivery-quote.use-case.ts` | Runs the three-engine path when an active `VehicleTariff` exists; **falls back to the 11-stage pipeline** otherwise. Persists quote + pricing audit. |
| `GenerateFulfillmentOptionsUseCase` | `application/use-cases/generate-fulfillment-options.use-case.ts` | Generates → ranks → **fairness-gates**, escalating violations to `Logistics_FairnessFlag`; loads buyer risk profile |
| `CreateOrderShipmentsUseCase` | `application/use-cases/create-order-shipments.use-case.ts` | Creates one Shipment per seller group at checkout confirmation; refreshes the pool + emits `shipment.created` outbox events; runs route-insertion evaluation |
| `MatchDriversUseCase` | `application/use-cases/match-drivers.use-case.ts` | Ranks candidates, enforces the minimum-earnings gate, audits every candidate |
| `EvaluateRouteInsertionsUseCase` | `application/use-cases/evaluate-route-insertions.use-case.ts` | Evaluates a new shipment against active jobs; persists every evaluation |
| `ExecuteRouteInsertionUseCase` | `application/use-cases/execute-route-insertion.use-case.ts` | Handles `RouteExtensionAccepted`: extends the job, binds the shipment, issues a commitment at the **marginal cost** |
| `AssignShipmentsToJobsUseCase` | `application/use-cases/assign-shipments-to-jobs.use-case.ts` | Binds shipments to PENDING jobs; creates a job if none exists |
| `RecordCostAdjustmentUseCase` | `application/use-cases/record-cost-adjustment.use-case.ts` | Immutable adjustment + ledger `ADJUSTMENT` mirror (attribution via `resolveAttribution` or explicit ops override) |
| `RecordJobCompletionLedgerUseCase` | `application/use-cases/record-job-completion-ledger.use-case.ts` | Writes buyer charge / carrier payable / Maysar revenue / `CONSOLIDATION_SAVING` on completion |
| `SettleDeliveryJobUseCase` | `application/use-cases/settle-delivery-job.use-case.ts` | **Ledger-only** settlement; applies `CostVariancePolicy` to ADJUSTMENT entries |

### 5.2 Services & jobs
| Service / job | File | Notes |
|---|---|---|
| `ConsolidationOrchestrator` | `application/services/consolidation-orchestrator.service.ts` | Fetch distances → `consolidate()` → quote per group → persist DeliveryGroup **and** DeliveryJob → audit; savings count only `CONSOLIDATED` groups; publishes `delivery.consolidated` via an outbox-backed eventBus |
| `ShipmentPoolService` + `PoolOptimizationJob` | `application/services/shipment-pool.service.ts` | Pool refresh/remove; scheduled clustering job (default 5 min, `POOL_OPTIMIZATION_INTERVAL_MS`); persists per-run analytics |
| `BuyerProfileService` | `application/services/buyer-profile.service.ts` | Risk profile for ranking; records delivery outcomes (non-fatal) |
| `LogisticsKpiService` | `application/services/logistics-kpi.service.ts` | Five §6.2 KPIs over existing records; non-fatal, degrades to `null` |
| `SettlementLifecycleService` | `application/services/settlement-lifecycle.service.ts` | Single entry object exposing `recordAdjustment` / `writeJobCompletionLedger` / `settle` |

### 5.3 globalThis hooks (module init, non-fatal)
Registered in `services/logistics-service/index.ts` — the integration points a driver/order/escalation consumer calls:

| Hook | Exposes | Consumer |
|---|---|---|
| `__consolidationOrchestrator` | orchestrator instance | `GetDeliveryOptionsUseCase` (checkout delivery-options endpoint) |
| `__createOrderShipments` | fn(request) | checkout controller + `MultiSellerCheckoutUseCase` |
| `__lockFulfillmentPrice` | fn(params) | checkout controller (both single + multi-seller confirm paths) |
| `__recordBuyerDeliveryOutcome` | fn(params) | awaiting a delivery-event consumer (§6.3 profile updates) |
| `__settlementService` | `SettlementLifecycleService` | awaiting a delivery-event consumer (settlement + completion ledger) |
| `__poolOptimizationJob` | `PoolOptimizationJob` | started on init, stopped on shutdown |

> **Honest note:** `__settlementService`, `__recordBuyerDeliveryOutcome`, and the delivery-job transition-event publisher are implemented and verified by tests and live scripts, but no in-repo dispatch consumer exists to invoke them yet — that consumer lives in the driver-app / settlement integration layer outside this repository.

---

## 6. HTTP Surface

### 6.1 Public (JWT, mounted under `/api/logistics`)
| Endpoint | Purpose |
|---|---|
| `POST /api/logistics/v1/quote` | Single-delivery quote (backward-compatible; returns `quoteId`, `status`, `deliveryFee`, `pricingVersion`, full breakdown) |
| `POST /api/logistics/v1/fulfillment-options` | Ranked fulfillment options (feasibility-gated, fairness-filtered) with `excluded` + `fairnessExcluded` |
| `/api/v1/*` (logistics routes), `/api/courier/*` | Legacy courier/delivery management |
| `/health/live` | Health check |

### 6.2 Internal (service-to-service)
| Endpoint | Purpose |
|---|---|
| `GET /api/logistics/internal/quotes/:quoteId` | Fetch a quote (validation/consumption flow) |
| `PATCH /api/logistics/internal/quotes/:quoteId/consume` | Single-use consume |
| `POST /api/logistics/internal/jobs/:jobId/match-drivers` *(admin/system)* | Ranked driver candidates + audited |
| `GET /api/logistics/internal/kpis` *(admin/system)* | §6.2 KPI snapshot |

---

## 7. Checkout Integration (security contract)

- `InitiateCheckoutUseCase` **requires `quoteId`**, validates it via `QuoteValidationService`, stores the **server-authoritative** `session.shippingCost`, `quoteId`, and `pricingVersion`, and marks the quote consumed only after a successful session save.
- Client-supplied `shippingCost` is accepted for backward compatibility but **ignored** — a buyer cannot set `shippingCost: 0` (backlog §1.2, closed). All payment methods (COD, wallet, card, SELLER_VERIFICATION) run the same validation.
- `deliveryWindowPreference` (`FLEXIBLE | STANDARD | EXPRESS`) is accepted, validated (invalid → 400 with field error), persisted on the session, and mapped onto `Logistics_Shipment.requestedDeliveryWindow` at shipment creation (FLEXIBLE → generous next-day, STANDARD → 4-hour, EXPRESS → 2-hour).
- Multi-seller confirm routes to `MultiSellerCheckoutUseCase` when `sellerQuotes` spans >1 seller (verified by `multi-seller-routing.controller.test.ts`); per-seller quotes are validated **all-or-nothing** (one invalid quote → 422 with `sellerId`).
- A `FulfillmentCommitment` price lock is written at confirmation for both paths via `__lockFulfillmentPrice`.
- Pre-quotes, `GetDeliveryOptionsUseCase` returns `{ groups: [], totalDeliveryFee: 0, consolidationSavingsTzs: 0 }` (graceful; documented in [`PER_SELLER_QUOTE_FLOW.md`](./PER_SELLER_QUOTE_FLOW.md) with the full API sequence and failure modes).

---

## 8. State Machines

**Shipment** (`domain/entities/shipment.entity.ts`):
```
CREATED → PLANNED → ASSIGNED → DISPATCHED → DELIVERED → CONFIRMED → SETTLED
                                    ↘ FAILED (FAILED_PICKUP | CUSTOMER_UNAVAILABLE |
                                              SUPPLIER_DELAY | DRIVER_FAILURE |
                                              DAMAGED | DISPUTED)
```
- FAILED is reachable from PLANNED/ASSIGNED/DISPATCHED/DELIVERED (pre-delivery failures like `FAILED_PICKUP`/`SUPPLIER_DELAY` occur before the DELIVERED state).
- Named transition methods only: `markPlanned`, `assignToJob`, `dispatch`, `markDelivered`, `confirm`, `settle`, `markFailed`. No direct `status` writes. Constructor invariants: positive weight, valid vehicle class, failureReason ↔ FAILED consistency.

**DeliveryJob** (`domain/entities/delivery-job.entity.ts`):
```
PENDING → ASSIGNED → DRIVER_ACCEPTED → AT_PICKUP → LOADING → IN_TRANSIT
                                                             ↘ AT_DESTINATION → DELIVERED → CONFIRMED → SETTLED
                                     ↘ CUSTOMER_UNAVAILABLE
                      ↘ FAILED_PICKUP
```
- Named transitions: `assignDriver()`, `driverAccepts()`, `confirmPickup()`, `confirmLoading()`, `depart()`, `arriveAtDestination()`, `confirmDelivery()`, `markConfirmed()`, `markFailed(reason)`, `extendWithShipment()`.
- Constructor guards: ASSIGNED requires a driverId; failure states require a failureReason.
- **Per-transition events** (`domain/engines/delivery-job-events.ts`, outbox-published): `DriverAssigned`, `GoodsLoaded`, `ShipmentDeparted`, `DeliveryAttempted`, `DeliveryCompleted`, `DeliveryFailed`. Subscribers: `DeliveryCompleted` → order-service updates order status, payment releases funds, trust records `SUCCESSFUL_DELIVERY`.

---

## 9. Events (outbox)

Both events are written to the append-only `logistics_OutboxEvent` table (`eventId` UUID, `eventType`, `eventData` JSON) for a future relay.

| Event | Emitted by | Payload highlights |
|---|---|---|
| `shipment.created` | `CreateOrderShipmentsUseCase` | shipmentId, orderId, masterOrderId, sellerId, origin/destination GeoPoints |
| `delivery.consolidated` | `ConsolidationOrchestrator` (outbox-backed eventBus) | masterOrderId, deliveryGroupId, sellerCount, totalDeliveryCost, estimatedSavings, pricingVersion |

At module init the orchestrator is constructed **with an outbox-backed `eventBus`**, so `delivery.consolidated` is actually published for every ≥2-seller consolidated group in the live runtime.

---

## 10. Verification Evidence

| Artifact | What it proves |
|---|---|
| `scripts/verify-settlement.ts` | Live DB: attribution → completion ledger → ledger-only settlement (**VERIFY: PASS**) |
| `scripts/verify-cost-model.ts` | Immutable adjustments, append-only ledger, price-lock resists tampering (**VERIFY: PASS**) |
| `scripts/verify-vehicle-tariff.ts` | Tariff versioning — v1 preserved after v2 activates (**VERIFY: PASS**) |
| `scripts/verify-fulfillment-options.ts` | Ranked options + weights live (**VERIFY: PASS**) |
| `scripts/verify-shipment-creation.ts` | Shipment creation + outbox events live (**VERIFY: PASS**) |
| Integration tests | `multi-seller-consolidation.integration.test.ts` (4/4), `digest-settlement.test.ts` (4/4), quote-routes e2e (7/7), fulfillment-options routes (2/2), fairness (9/9) |
| Unit tests | engines (pricing 13, options 13, matching 8, insertion 6, cost-model entities 12, shipment 22, delivery-job 22), value objects (config 4) |

**Known pre-existing suite failures (not caused by this work, tracked separately):** legacy `services/.../tests/` with stale repository API names (`saveSession` etc.), `config/redis.config.test.ts`, the layer-isolation architecture check, the stale `logistics-api.test.ts` bootstrap (module no longer exists), and the Dar→Arusha `INTERCITY`/`REMOTE` economic-validation example.