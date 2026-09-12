# Logistics Service — Frontend Integration Guide

Base path: `/api/logistics`

---

## Delivery Quotes

### Requesting a Quote

`POST /api/logistics/v1/quote` — requires auth.

The quote is the authoritative source of the delivery fee. The checkout service requires a valid `quoteId` — the `_shippingCost` field in checkout is deprecated and ignored.

### Quote Status Values

| Status | Meaning |
|--------|---------|
| `ACTIVE` | Valid, can be used in checkout |
| `EXPIRED` | Past `expiresAt` — must request a new quote |
| `CONSUMED` | Already used in a checkout session |
| `DELIVERY_UNAVAILABLE` | Route cannot be served |

When status is `DELIVERY_UNAVAILABLE`, `deliveryFee` is `null`. Show the `unavailableReason` to the user.

### Quote Response Shape

```json
{
  "quoteId": "...",
  "status": "ACTIVE",
  "deliveryFee": 3500,
  "currency": "TZS",
  "expiresAt": "2024-01-01T12:00:00.000Z",
  "pricingVersion": 2,
  "deliveryZone": "LOCAL_URBAN",
  "breakdown": { ... },
  "unavailableReason": null
}
```

Always display `currency` alongside the fee — it is always `TZS`.

> **Note on `DELIVERY_UNAVAILABLE`:** When `status === 'DELIVERY_UNAVAILABLE'`, `deliveryFee` is `null`. This is not an HTTP error — it means the route cannot be served. Show `unavailableReason` and offer an alternative (e.g. different address or contact support).

### Delivery Strategies (Pricing Models)

| Strategy | Description |
|----------|-------------|
| `LOCAL_URBAN` | Distance-band model for urban areas |
| `METROPOLITAN` | Distance-band model for metro areas |
| `INTERCITY` | Corridor model (handling + line-haul + last-mile) |
| `REMOTE` | Corridor model; may be unavailable |

### Pricing Breakdown Fields

The `breakdown` object contains:
- `distanceBandCost` — base cost from distance band (LOCAL_URBAN/METROPOLITAN)
- `weightSurcharge` — additive weight charge
- `peakSurcharge` — flat peak-hour charge
- `originHandlingCost`, `lineHaulCost`, `destinationHandlingCost`, `lastMileCost` — INTERCITY/REMOTE only
- `fulfillmentCost` — total operational cost
- `platformMarginAmount` — platform margin on fulfillment cost
- `codCharge` — flat COD charge (independent of distance)
- `finalFee` — the customer-facing delivery fee

### COD Charge

COD is a standalone flat charge added on top of the delivery fee. It is not a percentage of the delivery distance cost. If `itemValueTzs` exceeds the configured threshold, a value-based surcharge is added.

### Fulfillment Options

`POST /api/logistics/v1/fulfillment-options` — for multi-seller orders, returns ranked fulfillment options per seller shipment.

### Internal Quote Validation (service-to-service)

```
GET   /api/logistics/internal/quotes/:quoteId
PATCH /api/logistics/internal/quotes/:quoteId/consume
```

These are not called from the frontend directly.

---

## Deliveries

All delivery routes require auth.

```
POST   /api/logistics/v1/deliveries
GET    /api/logistics/v1/deliveries
GET    /api/logistics/v1/deliveries/:deliveryId
POST   /api/logistics/v1/deliveries/:deliveryId/status
PATCH  /api/logistics/v1/deliveries/:deliveryId/status   (alias)
GET    /api/logistics/v1/deliveries/:deliveryId/history
```

### Delivery Status Machine

```
pending → assigned → picked_up → in_transit → out_for_delivery → delivered
                                                                ↘ failed
any (except delivered/cancelled) → cancelled
any (except delivered/cancelled) → failed
```

- `delivered` and `cancelled` are terminal — no further transitions.
- `failed` can be set from any non-terminal, non-cancelled state.

### Delivery Status Update Body

```json
{
  "status": "picked_up",
  "location": { "lat": -6.7924, "lng": 39.2083, "address": "..." },
  "notes": "optional"
}
```

Valid status values: `assigned`, `picked_up`, `in_transit`, `delivered`, `cancelled`, `failed`

### COD Delivery Flow

```
POST /api/logistics/v1/cod/:deliveryId/otp          (generate OTP)
POST /api/logistics/v1/cod/:deliveryId/verify        (verify OTP + confirm delivery)
```

Aliases also available under `/deliveries/:deliveryId/cod/generate-otp` and `/deliveries/:deliveryId/cod/verify`.

---

## Routes

All route endpoints require auth.

```
GET    /api/logistics/v1/routes
GET    /api/logistics/v1/routes/:routeId
GET    /api/logistics/v1/routes/courier/:courierId
POST   /api/logistics/v1/routes/optimize
PUT    /api/logistics/v1/routes/:routeId/progress
POST   /api/logistics/v1/routes/:routeId/alternatives
```

### Route Optimization Body

```json
{
  "deliveries": [
    {
      "id": "del_...",
      "address": "Uhuru Street, Dar es Salaam",
      "coordinates": { "lat": -6.7924, "lng": 39.2083 }
    }
  ],
  "startLocation": { "lat": -6.7924, "lng": 39.2083 },
  "endLocation": { "lat": -6.8, "lng": 39.25 }
}
```

---

## Couriers

All courier endpoints require auth.

```
GET    /api/logistics/v1/couriers
GET    /api/logistics/v1/couriers/:courierId
POST   /api/logistics/v1/couriers                          (register/provision courier profile)
PUT    /api/logistics/v1/couriers/:courierId/status
PATCH  /api/logistics/v1/couriers/:courierId/status        (alias)
```

### Courier Status Values

| Status | Available for Assignment |
|--------|--------------------------|
| `online` | Yes |
| `offline` | No |
| `busy` | No |
| `delivering` | No |
| `returning` | No |

Only `online` couriers are eligible for delivery assignment.

### Courier Assignment Eligibility

A courier must meet **all** of:
- Status is `online`
- Rating ≥ **4.0**
- Completion rate ≥ **95%** (0.95)
- Within **50 km** of the pickup location
- Vehicle capacity sufficient for the package weight

### Courier Scoring Weights

| Signal | Weight |
|--------|--------|
| Distance to pickup | 0.25 |
| Rating | 0.20 |
| Completion rate | 0.20 |
| Vehicle match | 0.15 |
| Weather suitability | 0.10 |
| Traffic experience | 0.10 |

---

## Tracking

```
GET  /api/logistics/v1/tracking/:trackingNumber
POST /api/logistics/v1/tracking/location
GET  /api/logistics/v1/tracking/courier/:courierId/history
```

### Location Update Body

```json
{
  "courierId": "cou_...",
  "location": {
    "latitude": -6.7924,
    "longitude": 39.2083,
    "address": "optional"
  }
}
```

---

## Earnings

```
GET  /api/logistics/v1/earnings
GET  /api/logistics/v1/earnings/summary
GET  /api/logistics/v1/earnings/courier/:courierId
POST /api/logistics/v1/earnings
POST /api/logistics/v1/earnings/calculate
```

---

## Analytics

```
GET /api/logistics/v1/analytics
GET /api/logistics/v1/analytics/performance
GET /api/logistics/v1/analytics/courier/:courierId
```

---

## Delivery Query Filters

`GET /api/logistics/v1/deliveries` accepts:

| Param | Values |
|-------|--------|
| `status` | `assigned`, `picked_up`, `in_transit`, `delivered`, `cancelled` |
| `courierId` | ULID-format string |
| `page` | integer ≥ 1 |
| `limit` | integer 1–100 |

---

## Error Handling

| HTTP Status | Meaning |
|-------------|---------|
| 400 | Validation error, invalid coordinates |
| 401 | Not authenticated |
| 403 | Insufficient role |
| 404 | Delivery/route/courier not found |
| 409 | Invalid status transition, quote already consumed |
| 422 | Quote expired or unavailable |
| 429 | Rate limit exceeded (100 req / 15 min) |

---

## Display Notes

- All fees are in TZS. Always show the `currency` field from the quote response.
- Quote `expiresAt` is an ISO 8601 string — show a countdown timer in the checkout flow.
- When `status = DELIVERY_UNAVAILABLE`, show `unavailableReason` and offer the user an alternative (e.g. contact support).
- The `breakdown` object is for transparency/audit display — show it in an expandable "Pricing details" section.
- Courier status `online`/`offline` maps to "Available"/"Unavailable" in the UI.
