# Logistics Service — Frontend API Reference

> **Scope:** how a frontend application calls the Logistics Service and exactly what to expect back.  
> **Out of scope:** UI/UX design, and authentication flows — authentication is owned by the Auth Service. This document assumes you already hold a valid platform JWT and attach it to every request.  
> **Last updated:** September 2026

---

## 1. Base URL & Conventions

| Environment | Base URL |
|---|---|
| Development | `http://localhost:3000/api/logistics` |
| Production | `https://api.maysar.com/api/logistics` |

**Conventions:**

- All request/response bodies are `application/json`.
- Attach the platform token: `Authorization: Bearer <token>`. Token issuance, refresh, and expiry are the Auth Service's responsibility.
- Every response uses one envelope:

```json
// Success
{ "success": true, "data": { }, "timestamp": "..." }

// Failure
{ "success": false, "error": { "code": "MACHINE_READABLE_CODE", "message": "Human-readable message" } }
```

- Amounts are always **TZS integers**. Coordinates are WGS-84 decimal degrees (`lat` −90..90, `lng` −180..180).

---

## 2. Buyer Endpoints

### 2.1 `POST /v1/quote` — single-delivery quote

Prices one delivery lane. Backward-compatible single-seller flow.

**Request body**

| Field | Type | Required | Notes |
|---|---|---|---|
| `originLat` / `originLng` | number | ✅ | Seller pickup coordinates |
| `originAddress` | string ≤ 500 | ✅ | |
| `destinationLat` / `destinationLng` | number | ✅ | Buyer delivery coordinates |
| `destinationAddress` | string ≤ 500 | ✅ | |
| `packageWeightKg` | number > 0 | ✅ | |
| `packageDimensions` | `{ lengthCm, widthCm, heightCm }` | — | All three positive when present |
| `isCoD` | boolean | — | Default `false`. COD adds a risk surcharge |

**Success `200`**

```json
{
  "success": true,
  "data": {
    "quoteId": "qt_01J9...",
    "status": "ACTIVE",
    "deliveryFee": 7400,
    "currency": "TZS",
    "expiresAt": "2026-09-06T10:30:00.000Z",
    "pricingVersion": 2,
    "deliveryZone": "LOCAL_URBAN",
    "breakdown": {
      "engineVersion": "three-engine-v1",
      "fulfillmentCost": { },
      "driverCompensation": { },
      "buyerPrice": { }
    }
  }
}
```

- `status` is one of `ACTIVE`, `DELIVERY_UNAVAILABLE`. On `DELIVERY_UNAVAILABLE`, `deliveryFee` and `breakdown` are `null` and `unavailableReason` is set — **do not treat this as an HTTP error**; it means the lane cannot be served.
- `expiresAt` bounds the quote: after it passes, checkout validation returns `422 QUOTE_EXPIRED`. Validity length comes from the active pricing config (`quoteValiditySeconds`).
- `pricingVersion` identifies the pricing config used — echo it back where an API accepts one.

**Errors**

| HTTP | `error.code` | When |
|---|---|---|
| 400 | `INVALID_QUOTE_REQUEST` | Validation failed — `error.details[]` lists `{ field, message }` per offending field |
| 500 | `PRICING_CONFIG_UNAVAILABLE` | No active pricing config / internal failure |

---

### 2.2 `POST /v1/fulfillment-options` — ranked fulfillment options

Generates every feasible fulfillment plan for a set of shipments, ranked. Primary buyer-facing endpoint for multi-option delivery.

**Request body**

| Field | Type | Required | Notes |
|---|---|---|---|
| `buyerDestination` | `{ lat, lng, address }` | ✅ (`lat`/`lng`) | Buyer delivery point |
| `shipments` | array, non-empty | ✅ | Each: `{ shipmentId, sellerId, pickupLat, pickupLng, pickupAddress, packageWeightKg, requiredVehicleClass?, pickupEligible? }` |
| `masterOrderId` / `sessionId` | string | — | One of the two; used for tracing |
| `deliveryWindowPreference` | `FLEXIBLE` \| `STANDARD` \| `EXPRESS` | — | Affects ETA windows and shared pricing |
| `buyerTrustTier` | `NEW_BUYER` \| `TRUSTED_BUYER` \| `GOLD_BUYER` | — | Defaults `TRUSTED_BUYER`. Tiers gate option eligibility (COD radius, shared availability, FLEXIBLE discount) |

**Success `200`**

```json
{
  "success": true,
  "data": {
    "masterOrderId": "ord_...",
    "options": [
      {
        "optionType": "MAYSAR_EXPRESS",
        "fulfillmentPlanId": "plan_...",
        "shipmentIds": ["shp_..."],
        "sellerCount": 1,
        "estimatedPickupAt": "2026-09-06T10:00:00.000Z",
        "estimatedDeliveryAt": "2026-09-06T11:00:00.000Z",
        "deliveryWindow": "EXPRESS",
        "buyerPriceTzs": 7400,
        "driverCompensationTzs": 3500,
        "maysarMarginTzs": 1200,
        "fulfillmentCostTzs": 6200,
        "driverMeetsMinimumEarnings": true,
        "flexibleWindowDiscountApplied": false,
        "distanceKm": 8.2,
        "deliveryZone": "metro",
        "score": 0.8123,
        "scoreComponents": { }
      }
    ],
    "exclusions": [
      { "optionType": "CUSTOMER_PICKUP", "reason": "Seller is not pickup-eligible" }
    ],
    "fairnessExcluded": [],
    "weights": { "version": 1, "buyerCostWeight": 0.35, "deliveryTimeWeight": 0.25 }
  }
}
```

**How to read the response:**

- `options[]` — ranked best-first (`score` descending). Render in order; the first entry is the recommended plan.
- `exclusions[]` — option types eliminated by **feasibility** (capacity, vehicle class, COD radius, unsupported area). Always surfaced.
- `fairnessExcluded[]` — plans removed by the fairness gate; each carries `violations[]` (`checkType`, `computedValue`, `threshold`). These are also recorded server-side as `Logistics_FairnessFlag` rows for ops review.
- The four money fields (`buyerPriceTzs`, `driverCompensationTzs`, `maysarMarginTzs`, `fulfillmentCostTzs`) are **separate concepts** — never sum or derive one from another on the client.

**Errors**

| HTTP | `error.code` | When |
|---|---|---|
| 400 | `BUYER_DESTINATION_REQUIRED` | `buyerDestination.lat`/`lng` missing |
| 400 | `SHIPMENTS_REQUIRED` | `shipments` missing/empty |
| 500 | `INTERNAL_SERVER_ERROR` | Unexpected failure |

---

## 3. Courier Console Endpoints *(legacy `Logistics_Delivery` model)*

These serve the existing courier console. The operational unit is a **`Logistics_Delivery`** (`del_` ids) — *not* the newer `Logistics_DeliveryJob`. See §5 for the event stream that will carry the newer job flow.

### 3.1 `GET /couriers/:courierId`
Courier profile + stats. `404` if unknown id.

### 3.2 `PUT /couriers/:courierId/status`
Body: `{ "status": "online" | "offline" | "busy" | "delivering" | "returning" | ... }`. Invalid transitions → `409`.

### 3.3 `GET /deliveries`
Query params: `courierId`, `status` (`assigned` | `picked_up` | `in_transit` | `delivered` | `cancelled`), pagination (`page`, `limit`), optional date filters. Returns the standard envelope with a paginated `deliveries[]` list.

### 3.4 `POST /deliveries` *(internal tooling)*
Creates a `Logistics_Delivery`. Typically invoked by backend flows, not directly by a console.

### 3.5 `PUT /deliveries/:deliveryId/status`
Body: `{ "status", "location"?, "recipientName"?, "notes"?, "reason"? }` — status must follow the monotonic order above.

| HTTP | `error.code` | When |
|---|---|---|
| 409 | `INVALID_STATUS_TRANSITION` | Out-of-order status |
| 404 | `DELIVERY_NOT_FOUND` | Unknown id |
| 400 | *(field errors)* | Malformed body |

### 3.6 `POST /cod/:deliveryId/otp`
Generates a COD OTP and sends it to the buyer.

- `200` → `{ "success": true, "message": "OTP generated and sent to buyer" }`
- `404` / `400` → `{ "success": false, "error": "<message>" }` (note: `error` is a **string** on this legacy endpoint, not an object)

### 3.7 `POST /cod/:deliveryId/verify`
Body: `{ "otp": "...", "location": { "lat", "lng" } }` — `otp` required; `location` optional (defaults to `{0,0}` if omitted).

- `200` → `{ "success": true, "message": "COD Verification successful. Payment settlement and reputation update triggered." }`
- `400` → `{ "success": false, "error": { "code": "COD_VERIFICATION_FAILED", "message": "..." } }` (missing otp, invalid/expired)
- `404` → delivery not found
- `409` → already verified / invalid state

On success the platform releases the COD wallet commitment and updates courier reputation — the frontend only needs to surface the message.

### 3.8 Route / tracking / analytics / earnings *(legacy)*
| Endpoint | Notes |
|---|---|
| `POST /routes/optimize` | Body: `{ deliveries[], startLocation?, endLocation? }` — returns route alternatives with ETA |
| `GET /routes/:routeId/alternatives` | Alternatives for a stored route |
| `PUT /routes/:routeId/progress` | Update progress along a route |
| `GET /tracking/:deliveryId/history` | Location history for a delivery |
| `POST /tracking/:deliveryId/location` | Push a location ping |
| `GET /analytics/performance`, `GET /analytics/couriers/:courierId` | Performance stats |
| `POST /earnings`, `GET /earnings/couriers/:courierId`, `POST /earnings/calculate` | Legacy earnings records/commissions |

---

## 4. Internal Endpoints — **not for frontend use**

These are service-to-service only (network-protected, `admin`/`system` roles). Listed so a frontend team knows they exist and does not try to call them:

| Endpoint | Consumer |
|---|---|
| `GET /internal/quotes/:quoteId` | checkout-service (quote validation) |
| `PATCH /internal/quotes/:quoteId/consume` | checkout-service (single-use enforcement) |
| `POST /internal/jobs/:jobId/match-drivers` | dispatch/ops tooling (ranked driver candidates) |
| `GET /internal/kpis` | ops dashboards (operational KPIs) |

---

## 5. Event Topics (outbox)

The service writes events to the append-only `logistics_OutboxEvent` table for relay. A frontend consumes these via the platform's websocket/push relay — **never** by polling these tables.

| Topic | Emitted when | Key payload fields |
|---|---|---|
| `shipment.created` | One shipment per seller group created at checkout confirmation | `shipmentId`, `orderId`, `masterOrderId`, `sellerId`, origin/destination |
| `delivery.consolidated` | A ≥2-seller consolidated group is priced | `masterOrderId`, `deliveryGroupId`, `sellerCount`, `totalDeliveryCost`, `estimatedSavings`, `pricingVersion` |
| `DriverAssigned` | A `DeliveryJob` gets a driver | job, driver, vehicle |
| `GoodsLoaded` / `ShipmentDeparted` / `DeliveryAttempted` | Pickup/loading/transit milestones | job + shipment refs |
| `DeliveryCompleted` / `DeliveryFailed` | Job outcome | job + failure reason |

---

## 6. Error Reference

Every failure uses the standard envelope. Codes you will actually encounter:

| Code | HTTP | Endpoint | Meaning |
|---|---|---|---|
| `INVALID_QUOTE_REQUEST` | 400 | `/v1/quote` | Field validation failed (see `details[]`) |
| `PRICING_CONFIG_UNAVAILABLE` | 500 | `/v1/quote` | Pricing config missing/unavailable |
| `BUYER_DESTINATION_REQUIRED` | 400 | `/v1/fulfillment-options` | Missing destination coordinates |
| `SHIPMENTS_REQUIRED` | 400 | `/v1/fulfillment-options` | Empty/missing shipments array |
| `INVALID_STATUS_TRANSITION` | 409 | `PUT /deliveries/:id/status` | Out-of-order status |
| `DELIVERY_NOT_FOUND` | 404 | delivery/tracking endpoints | Unknown delivery id |
| `COD_VERIFICATION_FAILED` | 400/409 | `POST /cod/:id/verify` | OTP invalid/expired/already verified |
| `INTERNAL_SERVER_ERROR` | 500 | any | Unexpected failure — safe to retry with backoff |

**Handling rules of thumb:**

- Treat `success: false` as the single failure signal; branch on `error.code`, display `error.message` as fallback text.
- `4xx` = do not retry unchanged (fix the request). `5xx` = retry with exponential backoff.
- `DELIVERY_UNAVAILABLE` (a *status*, not an error) — offer the buyer alternatives instead of an error state.