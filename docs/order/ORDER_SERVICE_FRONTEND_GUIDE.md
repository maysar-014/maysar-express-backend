# Order Service — Frontend Integration Guide

> Mount path: `/api/order`

---

## Business Rules (from domain code)

### OrderStatus enum (order.entity.ts)

Standard flow statuses: `pending` | `confirmed` | `processing` | `assigned` | `shipped` | `in_transit` | `delivered` | `COMPLETED` | `cancelled`

Seller verification workflow statuses: `PENDING_SELLER_VERIFICATION` | `SELLER_REVIEWING` | `SELLER_CONFIRMED` | `SELLER_VERIFIED` | `SELLER_REJECTED` | `SELLER_DECLINED` | `PAYMENT_PENDING` | `ORDER_PLACED` | `VERIFICATION_OVERDUE` | `UNDER_ADMIN_REVIEW`

Note: status values are mixed case in the enum — use exact values when filtering.

### canBeCancelled() — buyer-cancellable statuses
`pending`, `confirmed`, `PENDING_SELLER_VERIFICATION`, `SELLER_VERIFIED`, `VERIFICATION_OVERDUE`, `UNDER_ADMIN_REVIEW`

### CancellationPolicy — who can cancel what

| Requester | Cancellable statuses | Notes |
|---|---|---|
| `buyer` | `pending`, `PENDING_SELLER_VERIFICATION`, `SELLER_VERIFIED`, `SELLER_DECLINED`, `VERIFICATION_OVERDUE` | No seller consent needed |
| `buyer` | `confirmed` | Requires seller consent (`requiresSellerConsent: true`) |
| `seller` | Any cancellable status | Seller can cancel their own orders |
| `system` | Any status | No restrictions |

### Seller verification timeout
`verificationTimeoutMinutes` defaults to **30 minutes**. After timeout, order moves to `VERIFICATION_OVERDUE` and is auto-cancelled.

### Heavy order threshold
`isHeavyOrder()` = `totalWeight > 20` kg. Heavy orders may have different logistics routing.

### COD eligibility (CODEligibilityEngine)

Requirements for buyer COD eligibility:
- Identity verified (auth-service)
- `permanentlyDisabled !== true`
- `suspendedUntil` not in the future
- COD reputation `score >= 50`
- `successfulOrders >= 3`

### COD Trust Tier Model (dual-axis — ProgressiveCODEligibilityEngine)

COD limits are controlled by a **dual-axis tier** derived from both behavioral score AND lifetime COD order value. **Both thresholds must be met simultaneously** for a tier to be granted.

| Tier | Min Score | Min Lifetime COD Value | Max Exposure | Max Concurrent Orders | Delivery Radius |
|---|---|---|---|---|---|
| `NEW_BUYER` | any | any | TZS 30,000 | 1 | same city as seller |
| `TRUSTED_BEGINNER` | ≥ 21 | ≥ TZS 100,000 | TZS 150,000 | 2 | 50 km radius |
| `TRUSTED_BUYER` | ≥ 41 | ≥ TZS 500,000 | TZS 500,000 | 3 | same region |
| `GOLD_BUYER` | ≥ 65 | ≥ TZS 2,000,000 | TZS 2,000,000 | 5 | nationwide |
| `PLATINUM_BUYER` | ≥ 85 | ≥ TZS 10,000,000 | TZS 10,000,000 | unlimited | nationwide |

**Critical for frontend:** The `/orders/cod/validate` endpoint enforces all of these checks server-side. Always call it before showing the COD option — do not calculate eligibility client-side. The response includes:
- `eligible` — whether COD is allowed
- `tier` — the buyer's current tier
- `requiresCommitmentFee` — whether a wallet hold is required
- `commitmentFeeAmount` — the hold amount (equals the delivery fee)
- `reason` — human-readable explanation if `eligible: false`

**Exposure limit:** This is enforced at the order level. A `NEW_BUYER` cannot have a COD order above TZS 30,000, even if their `check-eligibility` response was `eligible: true`.

COD order amount limits:
- Minimum: **TZS 1,000**
- Maximum: varies by tier (TZS 30,000 for NEW_BUYER up to TZS 10,000,000 for PLATINUM_BUYER)

### COD commitment fee
`calculateCommitmentFee(deliveryFee)` = `deliveryFee` (commitment fee equals the delivery fee).

### COD reputation scoring (CODReputationEngine)

| Action | Score change |
|---|---|
| `SUCCESSFUL_DELIVERY` | +8 |
| `HIGH_VALUE_COMPLETION` | +10 |
| `PHONE_VERIFIED` | +5 |
| `ACCOUNT_AGE_MILESTONE` | +7 |
| `COURIER_UNREACHABLE_CUSTOMER` | -5 |
| `POST_DISPATCH_CANCELLATION` | -10 |
| `COURIER_SUSPICIOUS_ADDRESS` | -10 |
| `DISPUTE_LOST` | -12 |
| `COURIER_FAKE_PHONE` | -12 |
| `DELIVERY_REFUSED` | -15 |
| `COURIER_REPEATED_REFUSAL` | -20 |

Score is clamped to [0, 100]. Tier thresholds are listed above in the Trust Tier Model table.

---

## Route Reference

### Buyer order list
```
GET /api/order/orders?limit=20&cursor=...&status=pending
```

### Get order by ID
```
GET /api/order/orders/:orderId
```

```jsonc
{
  "success": true,
  "data": {
    "orderId": "ORD-01J...",
    "masterOrderId": "MOR-01J...",
    "status": "confirmed",
    "paymentMethod": "wallet",
    "paymentStatus": "COMPLETED",
    "items": [...],
    "totalAmount": 33000,
    "shippingCost": 3000,
    "deliveryAddress": { "street": "...", "ward": "Kivukoni", "district": "Ilala Cbd", "region": "Dar es Salaam" },
    "verificationDeadlineAt": "2026-09-01T10:30:00Z",
    "verificationTimeoutMinutes": 30,
    "codReputationScore": 75,
    "codCommitmentFee": 3000,
    "deliveryCode": "4821",
    "createdAt": "2026-09-01T10:00:00Z"
  }
}
```

### Master order (multi-seller)
```
GET /api/order/master-orders/:masterOrderId
```

Returns `{ masterOrderId, status, orders[], totalAmount }`. Show per-seller status breakdown. Surface the most restrictive status prominently.

### Cancel order
```
POST /api/order/orders/:orderId/cancel
```
```jsonc
{ "reason": "Changed my mind", "requestedBy": "buyer" }
```

Errors:
- `ORDER_NOT_CANCELLABLE` (409) — order is in a non-cancellable status
- `REQUIRES_SELLER_CONSENT` (409) — order is `confirmed`, seller must agree

### COD eligibility check
```
POST /api/order/orders/cod/validate
```
```jsonc
{
  "buyerId": "usr_01J...",
  "sellerId": "sel_01J...",
  "totalAmount": 25000,
  "deliveryFee": 3000,
  "currency": "TZS",
  "deliveryAddress": {
    "street": "123 Uhuru Street",
    "ward": "Kivukoni",
    "district": "Ilala Cbd",
    "region": "Dar es Salaam",
    "postalCode": "11101",
    "country": "Tanzania"
  },
  "sellerAddress": {
    "street": "456 Samora Ave",
    "ward": "Kariakoo",
    "district": "Ilala Cbd",
    "region": "Dar es Salaam",
    "postalCode": "11102",
    "country": "Tanzania"
  },
  "items": [
    { "productId": "prd_01J...", "quantity": 1, "price": 25000 }
  ]
}
```

> ⚠️ The endpoint path is `/orders/cod/validate` (not `/cod/check-eligibility`). The full URL is `POST /api/order/orders/cod/validate`.

Response — **no `success`/`data` wrapper**, plain object:

```jsonc
{
  "eligible": true,
  "tier": "TRUSTED_BEGINNER",
  "requiresCommitmentFee": true,
  "commitmentFeeAmount": 3000,
  "reason": null
}
```

On error: `{ "eligible": false, "error": "ELIGIBILITY_CHECK_FAILED", "message": "..." }`.

If `eligible: false`, hide the COD option entirely and show `reason`.

### COD dispute
```
POST /api/order/cod/disputes
```
```jsonc
{ "orderId": "ORD-01J...", "reason": "Item not received", "evidence": ["https://..."] }
```

---

### Seller routes

#### Seller order inbox
```
GET /api/order/seller/orders?status=PENDING_SELLER_VERIFICATION&limit=20
```

#### Verify stock (seller confirms stock available)
```
POST /api/order/orders/:orderId/verify-stock
```
Order moves to `SELLER_VERIFIED`.

#### Decline stock (seller cannot fulfil)
```
POST /api/order/orders/:orderId/decline-stock
```
```jsonc
{ "reason": "Out of stock" }
```
Order cancelled, buyer wallet restored automatically.

---

## Order status display mapping

| Status | Display | Buyer action |
|---|---|---|
| `pending` | Awaiting confirmation | Cancel available |
| `PENDING_SELLER_VERIFICATION` | Awaiting seller stock check | Cancel available |
| `SELLER_REVIEWING` | Seller reviewing | — |
| `SELLER_VERIFIED` | Seller confirmed stock | Cancel available |
| `SELLER_DECLINED` | Seller declined | Reorder |
| `VERIFICATION_OVERDUE` | Seller did not respond in time | Cancel available |
| `confirmed` | Confirmed | Cancel requires seller consent |
| `processing` | Being prepared | — |
| `assigned` | Courier assigned | — |
| `shipped` | Dispatched | — |
| `in_transit` | On the way | — |
| `delivered` | Delivered | Confirm receipt (COD) |
| `COMPLETED` | Complete | Rate / reorder |
| `cancelled` | Cancelled | Reorder |

---

## Seller verification countdown

Show a countdown timer from `verificationDeadlineAt`. If it expires before the seller acts, the order auto-cancels. Surface this prominently in the seller app — default window is **30 minutes**.

---

## COD delivery flow

1. Order placed with `paymentMethod: "cod"`
2. `codCommitmentFee` is held from buyer's wallet
3. Courier arrives — buyer shows `deliveryCode` to courier
4. Courier confirms delivery → `codDeliveryConfirmedAt` set
5. `codCommitmentFee` released, seller receives payment
6. Buyer's COD reputation score +5

---

## Admin order actions

```
POST /api/order/admin/orders/:orderId/actions
Authorization: Bearer <adminJWT>
```
```jsonc
{
  "action": "force_cancel",   // force_cancel | force_complete | override_status
  "reason": "Fraud investigation",
  "newStatus": "cancelled"    // required when action = override_status
}
```

Admin actions bypass normal business rule checks. Used only by ops for exceptional cases.

---

## Events

Order events drive downstream flows (payment, inventory, notification, settlement). Frontend can consume these via WebSocket push relay:

| Event | When | Key payload |
|---|---|---|
| `order.placed` | After successful checkout confirm | `orderId, masterOrderId, buyerId, sellerId, totalAmount, paymentMethod` |
| `order.confirmed` | Seller verifies stock | `orderId, sellerId` |
| `order.cancelled` | Any cancellation path | `orderId, reason, refundAmount` |
| `order.delivered` | Delivery confirmed | `orderId, deliveredAt` |
| `order.completed` | Settlement saga completes | `orderId, settlementAmount` |
| `cod.trust_signal` | After any COD delivery outcome | `buyerId, signalType, delta, newScore` |

**COD saga compensation note:** If order placement fails after wallet debit, the saga automatically reverses the wallet debit. Frontend should poll order status — never manage compensation manually.

---

## Error codes

| Code | HTTP | Meaning |
|---|---|---|
| `ORDER_NOT_FOUND` | 404 | Order ID invalid |
| `ORDER_NOT_CANCELLABLE` | 409 | Status does not allow cancellation |
| `REQUIRES_SELLER_CONSENT` | 409 | Confirmed order — seller must agree to cancel |
| `COD_LIMIT_EXCEEDED` | 400 | Order amount exceeds your tier's exposure limit |
| `COD_BELOW_MINIMUM` | 400 | Order amount < TZS 1,000 |
| `COD_AREA_NOT_SUPPORTED` | 400 | COD not available for delivery address |
| `COD_CROSS_REGION` | 400 | Cross-region COD not allowed for your tier |
| `COD_REPUTATION_TOO_LOW` | 400 | Score below minimum for COD eligibility |
| `COD_EXPOSURE_EXCEEDED` | 400 | Active COD exposure would exceed your tier limit |
| `COD_CONCURRENT_LIMIT` | 400 | Max concurrent COD orders reached for your tier |
| `COD_RADIUS_EXCEEDED` | 400 | Delivery address outside radius for your tier |
| `COD_SUSPENDED` | 400 | COD access suspended — show `suspendedUntil` |
| `COD_PERMANENTLY_DISABLED` | 400 | COD permanently disabled for this account |
| `INVENTORY_UNAVAILABLE` | 409 | Item no longer in stock |
| `SELLER_VERIFICATION_TIMEOUT` | 410 | Auto-cancelled — seller did not verify in time |


---

## System Maintenance (internal/ops)

These endpoints are for ops/admin use only. They are not called from the frontend.

```
POST /api/order/system/maintenance/cleanup/outbox/report
POST /api/order/system/maintenance/cleanup/outbox
```

**Auth:** `requireRoleOrService(['admin','system'])` **and** `x-service-key` header.

### Outbox cleanup report
`POST /api/order/system/maintenance/cleanup/outbox/report` → **200** — dry-run count of deletable outbox events.

### Outbox cleanup
`POST /api/order/system/maintenance/cleanup/outbox` → **200** — batched deletion. Body: `{ "dryRun": true }` to simulate. `maxRuntimeMs` defaults to 20 seconds.
