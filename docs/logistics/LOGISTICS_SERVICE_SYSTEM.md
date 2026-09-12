# Maysar Logistics Service — Implementation Reference (As-Built)

> **Status:** Live and verified — delivery quote generation, multi-seller consolidation, fulfillment commitment price lock, courier assignment, delivery lifecycle, COD OTP flow, route optimization, earnings.
> **Last updated:** September 2026
> **Scope:** `services/logistics-service`

---

## 1. Guiding Principles Enforced by the Code

| Principle | Where it lives in code |
|---|---|
| **Quote is the authoritative delivery price** | `RequestDeliveryQuoteUseCase` runs the pricing engine and persists an immutable `Logistics_Quote` — checkout service validates and consumes it; no other price source is trusted |
| **Client-supplied shipping cost is ignored** | Checkout-service's `InitiateCheckoutUseCase` reads `shippingCost` from the validated quote record, never from the request body |
| **Quote is single-use** | `PATCH /internal/quotes/:quoteId/consume` sets status `CONSUMED` — subsequent consume attempts return 409 |
| **Multi-seller consolidation is orchestrated** | `ConsolidationOrchestrator` groups seller shipments, runs pricing per group, and returns ranked fulfillment plans — checkout calls `__consolidationOrchestrator` |
| **Fulfillment price is locked at confirmation** | `__lockFulfillmentPrice` writes a `FulfillmentCommitment` at checkout confirm — post-confirmation courier pricing changes don't affect the buyer |
| **Fairness gate prevents anti-competitive plans** | `FairnessGate` checks each fulfillment option against margin/driver-earnings thresholds before surface to buyer; excluded plans are recorded as `Logistics_FairnessFlag` rows for ops review |
| **Pool optimization runs on a schedule** | `PoolOptimizationJob` scans the shipment opportunity pool every 5 minutes (configurable via `POOL_OPTIMIZATION_INTERVAL_MS`) |
| **Driver assignment uses 6-signal composite score** | `DriverAssignmentEngine` ranks eligible couriers by: distance to pickup (0.25), rating (0.20), completion rate (0.20), vehicle match (0.15), weather suitability (0.10), traffic experience (0.10) |

---

## 2. Pricing Model

### 2.1 Delivery Zone Strategies

| Zone | Strategy | Price determinants |
|---|---|---|
| `LOCAL_URBAN` | Distance-band | Distance bands + weight surcharge + peak surcharge |
| `METROPOLITAN` | Distance-band | Distance bands + weight surcharge + peak surcharge |
| `INTERCITY` | Corridor | Origin handling + line haul + destination handling + last mile |
| `REMOTE` | Corridor | Same as INTERCITY; may be `DELIVERY_UNAVAILABLE` |

### 2.2 Pricing Breakdown Fields

| Field | Description |
|---|---|
| `distanceBandCost` | Base cost from distance band (LOCAL_URBAN/METROPOLITAN) |
| `weightSurcharge` | Additive weight charge above base weight |
| `peakSurcharge` | Flat peak-hour surcharge |
| `originHandlingCost` | INTERCITY/REMOTE only |
| `lineHaulCost` | INTERCITY/REMOTE only — corridor trunk cost |
| `destinationHandlingCost` | INTERCITY/REMOTE only |
| `lastMileCost` | INTERCITY/REMOTE only |
| `fulfillmentCost` | Total operational cost (all above components summed) |
| `platformMarginAmount` | Platform margin on `fulfillmentCost` |
| `codCharge` | Flat COD surcharge (independent of distance); value-based surcharge added when `itemValueTzs` exceeds threshold |
| `finalFee` | Customer-facing delivery fee = `fulfillmentCost + platformMarginAmount + codCharge` |

### 2.3 Quote Status Machine

```
ACTIVE → EXPIRED (TTL elapsed — quoteValiditySeconds from pricing config)
ACTIVE → CONSUMED (single-use checkout validation)
ACTIVE → DELIVERY_UNAVAILABLE (zone cannot be served)
```

---

## 3. Fulfillment Options (Multi-Seller)

`POST /v1/fulfillment-options` generates ranked fulfillment plans for a set of shipments:

- `options[]` — ranked best-first by composite `score`
- `exclusions[]` — plans eliminated by feasibility (vehicle capacity, COD radius, unsupported area)
- `fairnessExcluded[]` — plans removed by fairness gate; each carries `violations[]` with `checkType`, `computedValue`, `threshold`
- The four money fields (`buyerPriceTzs`, `driverCompensationTzs`, `maysarMarginTzs`, `fulfillmentCostTzs`) are separate concepts — never sum or derive one from another on the client

Option types: `MAYSAR_EXPRESS`, `MAYSAR_STANDARD`, `CUSTOMER_PICKUP` (when seller is pickup-eligible), `SHARED_DELIVERY` (when trust tier allows)

COD radius enforcement by tier:
- `NEW_BUYER`: 24 km Haversine from seller ward centroid
- `TRUSTED_BEGINNER`: 50 km
- `TRUSTED_BUYER` and above: region/nationwide

---

## 4. Delivery Lifecycle

### 4.1 Legacy Delivery Model (`Logistics_Delivery`, `del_` ids)

Used by the existing courier console.

```
pending → assigned → picked_up → in_transit → out_for_delivery → delivered
any (non-terminal) → cancelled
any (non-terminal) → failed
```

`delivered` and `cancelled` are terminal.

### 4.2 COD Delivery Flow

```
POST /v1/cod/:deliveryId/otp     → generates OTP, sends to buyer
POST /v1/cod/:deliveryId/verify  → validates OTP, confirms delivery, triggers settlement + reputation update
```

On verify success: COD wallet commitment is released, seller receives payment, buyer's COD reputation is updated.

**Legacy error format note:** the `/cod/:deliveryId/otp` and `/cod/:deliveryId/verify` endpoints return `{ "success": false, "error": "<string>" }` (error is a string, not an object) — this is a known exception to the standard envelope format.

---

## 5. Courier Assignment Eligibility

A courier must meet **all** of:
- Status is `online`
- Rating ≥ **4.0**
- Completion rate ≥ **95%** (0.95)
- Within **50 km** of the pickup location
- Vehicle capacity sufficient for the package weight

### Driver Assignment Scoring Weights

| Signal | Weight |
|---|---|
| Distance to pickup | 0.25 |
| Rating | 0.20 |
| Completion rate | 0.20 |
| Vehicle match | 0.15 |
| Weather suitability | 0.10 |
| Traffic experience | 0.10 |

---

## 6. HTTP Surface

Mounted at `/api/logistics` (module name `logistics-service` → strip `-service` → `/api/logistics`).

### Buyer endpoints (`/v1/`)

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/logistics/v1/quote` | JWT | Single-seller delivery quote |
| POST | `/api/logistics/v1/fulfillment-options` | JWT | Multi-seller ranked fulfillment options |

### Courier console endpoints (`/api/v1/`)

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/logistics/api/v1/couriers` | JWT | List couriers |
| GET | `/api/logistics/api/v1/couriers/:courierId` | JWT | Courier profile + stats |
| POST | `/api/logistics/api/v1/couriers` | JWT | Register courier profile |
| PUT/PATCH | `/api/logistics/api/v1/couriers/:courierId/status` | JWT | Update courier status |
| POST | `/api/logistics/api/v1/deliveries` | JWT | Create delivery |
| GET | `/api/logistics/api/v1/deliveries` | JWT | List deliveries |
| GET | `/api/logistics/api/v1/deliveries/:deliveryId` | JWT | Delivery detail |
| POST/PATCH | `/api/logistics/api/v1/deliveries/:deliveryId/status` | JWT | Update delivery status |
| GET | `/api/logistics/api/v1/deliveries/:deliveryId/history` | JWT | Location history |
| POST | `/api/logistics/v1/cod/:deliveryId/otp` | JWT | Generate COD OTP |
| POST | `/api/logistics/v1/cod/:deliveryId/verify` | JWT | Verify COD OTP |
| GET | `/api/logistics/api/v1/routes` | JWT | List routes |
| GET | `/api/logistics/api/v1/routes/:routeId` | JWT | Route detail |
| POST | `/api/logistics/api/v1/routes/optimize` | JWT | Optimize route |
| PUT | `/api/logistics/api/v1/routes/:routeId/progress` | JWT | Update route progress |
| GET | `/api/logistics/api/v1/tracking/:trackingNumber` | JWT | Track by number |
| POST | `/api/logistics/api/v1/tracking/location` | JWT | Push location update |
| GET | `/api/logistics/api/v1/earnings` | JWT | Earnings list |
| GET | `/api/logistics/api/v1/earnings/summary` | JWT | Earnings summary |
| POST | `/api/logistics/api/v1/earnings/calculate` | JWT | Calculate earnings |

### Internal (service-to-service only)

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/logistics/internal/quotes/:quoteId` | service role | Validate quote |
| PATCH | `/api/logistics/internal/quotes/:quoteId/consume` | service role | Consume quote (single-use) |
| POST | `/api/logistics/internal/jobs/:jobId/match-drivers` | admin/system | Ranked driver candidates |
| GET | `/api/logistics/internal/kpis` | admin/system | Operational KPIs |
| GET | `/api/logistics/health` | none | Health check |

---

## 7. Global Hooks (inter-service integration)

The logistics module registers functions on `globalThis` at startup for use by other modules:

| Hook | Consumer | Purpose |
|---|---|---|
| `__consolidationOrchestrator` | checkout-service `GetDeliveryOptionsUseCase` | Get ranked fulfillment options |
| `__createOrderShipments` | checkout-service confirm controller | Create `Logistics_Shipment` records after order creation |
| `__lockFulfillmentPrice` | checkout-service confirm controller | Write `FulfillmentCommitment` price lock |
| `__recordBuyerDeliveryOutcome` | delivery event consumers | Update buyer delivery profile for failure-risk ranking |
| `__settlementService` | delivery event consumers | Record adjustment, write job completion ledger, settle |

---

## 8. Events (Outbox)

Written to `logistics_OutboxEvent` for relay via the platform event bus:

| Topic | When |
|---|---|
| `shipment.created` | Shipment created per seller group at checkout confirmation |
| `delivery.consolidated` | ≥2-seller consolidated group priced |
| `DriverAssigned` | DeliveryJob gets a driver |
| `GoodsLoaded` | Pickup milestone |
| `ShipmentDeparted` | Departure milestone |
| `DeliveryAttempted` | Delivery attempt milestone |
| `DeliveryCompleted` | Job delivered successfully |
| `DeliveryFailed` | Job failed with reason |

---

## 9. Background Jobs

| Job | Default interval | Purpose |
|---|---|---|
| `PoolOptimizationJob` | 5 minutes (configurable) | Scans shipment opportunity pool, matches shipments to optimize consolidation |

---

## 10. Logistics Documentation Structure

The logistics service is documented across three frontend-facing files:

| File | Scope |
|---|---|
| `docs/logistics/LOGISTICS_SERVICE_FRONTEND_GUIDE.md` | Core buyer and courier API reference |
| `docs/frontend/LOGISTICS_FRONTEND_INTEGRATION_GUIDE.md` | Detailed request/response spec with fulfillment options deep-dive |
| `docs/frontend/LOGISTICS_FRONTEND_UI_SPECIFICATIONS.md` | Courier app UI wireframes (design reference, not API docs) |

The integration guide (`LOGISTICS_FRONTEND_INTEGRATION_GUIDE.md`) is the most detailed and should be the primary reference for implementing the quote and fulfillment options flows.
