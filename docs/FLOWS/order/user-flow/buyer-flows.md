# Buyer Flows — Order Service

> **Verification status:** Verified — Live-verified 2026-11-06 against `run-lifecycle-checks.mjs` (LC-03, LC-04, LC-18)
> **Verification basis:** `scripts/verification/run-lifecycle-checks.mjs` LC-03/LC-04/LC-18 (2026-11-06); MUVA/MSLE Phase 3 implementation (2026-11-10)
> **Last updated:** 2026-11-10 (added Order Snapshot Structure — ENH-008)

## Overview

This document covers order-service flows from the buyer's perspective: viewing order details, cancelling an order before it ships, and browsing order history. The **actual order lifecycle** as verified in production is:

```
PENDING_SELLER_VERIFICATION → SELLER_VERIFIED → [delivery assigned] → DELIVERED → COMPLETED
                            ↘ SELLER_DECLINED (seller refuses, funds restored)
                            ↘ VERIFICATION_OVERDUE (timeout, funds restored)
                                                              ↘ CANCELLED (any pre-ship state)
                                                              ↘ REFUNDED (post-cancel terminal)
```

> ⚠️ **FLW-008 corrected 2026-11-06:** The previous lifecycle diagram `PENDING → CONFIRMED → PROCESSING → SHIPPED → DELIVERED → COMPLETED` does not match live behaviour. Orders created by buyers enter `PENDING_SELLER_VERIFICATION` immediately. After the seller calls `/verify`, they move to `SELLER_VERIFIED`. The states `CONFIRMED`, `PROCESSING`, and `SHIPPED` are not used in the current implementation.

---

## Flow Index

| # | Flow Name | Verification Status | Primary Endpoint |
|---|---|---|---|
| 1 | View Order Details | Verified | `GET /api/order/orders/:orderId` |
| 2 | Cancel Order | Verified | `POST /api/order/orders/:orderId/cancel` |
| 3 | View Order History | Verified | `GET /api/order/orders` |

---

## Flow 1: View Order Details

### Summary

| Field | Value |
|---|---|
| Actor | Buyer |
| Trigger | Buyer navigates to a specific order (e.g., from order history or notification) |
| Preconditions | Authenticated (Bearer JWT, buyer role); `orderId` refers to an order belonging to the requesting buyer |
| Terminal states (success) | 200 — order object with status, items, seller info, delivery status, payment method |
| Terminal states (failure) | 404 data-level `ORDER_NOT_FOUND` if `orderId` is invalid or belongs to another buyer |
| Verification status | Verified |

### Happy Path

| Step | Actor/System | Action | Endpoint | Auth | Expected Response |
|---|---|---|---|---|---|
| 1 | Buyer | Requests order details by ID | `GET /api/order/orders/:orderId` | Bearer JWT (buyer role) | Request received |
| 2 | order-service | Validates JWT and confirms order belongs to requesting buyer | — | — | Ownership confirmed |
| 3 | order-service | Fetches order with current status, items, seller info, delivery status | — | — | Order record assembled |
| 4 | Buyer | Receives order detail response | — | — | 200 `{ orderId, status, items[], seller, deliveryStatus, paymentMethod, totalAmount, createdAt }` |

### Order Status Lifecycle

```
PENDING_SELLER_VERIFICATION → SELLER_VERIFIED → DELIVERED → COMPLETED
                            ↘ SELLER_DECLINED (seller refuses; funds restored)
                            ↘ VERIFICATION_OVERDUE (timeout; funds restored)
                            ↘ CANCELLED (from any pre-delivery state)
                            ↘ REFUNDED (terminal after wallet restoration)
```

> **FLW-008 (2026-11-06):** The UI should map these states to buyer-friendly labels:
> | API status | Buyer-facing label |
> |---|---|
> | `PENDING_SELLER_VERIFICATION` | "Awaiting seller confirmation" |
> | `SELLER_VERIFIED` | "Confirmed — preparing for delivery" |
> | `SELLER_DECLINED` | "Declined by seller — funds refunded" |
> | `VERIFICATION_OVERDUE` | "Seller did not respond — funds refunded" |
> | `DELIVERED` | "Delivered" |
> | `COMPLETED` | "Completed" |
> | `CANCELLED` | "Cancelled" |
> | `REFUNDED` | "Refunded" |

### Service Interaction Chain

`GET /api/order/orders/:orderId` is handled entirely within order-service. No cross-service calls occur at read time. Delivery status within the order record is updated asynchronously by logistics-service events; the order record reflects the last known state.

### Unhappy Path Branches

| Trigger Condition | System Response | HTTP Status | Error Code |
|---|---|---|---|
| `orderId` not found or belongs to another buyer | 404 | 404 | `ORDER_NOT_FOUND` |
| JWT expired or missing | 401 | 401 | `UNAUTHORIZED` |
| User does not have buyer role | 403 | 403 | `FORBIDDEN` |

---

## Flow 2: Cancel Order

### Summary

| Field | Value |
|---|---|
| Actor | Buyer |
| Trigger | Buyer chooses to cancel an order they placed |
| Preconditions | Authenticated (Bearer JWT, buyer role); order status is `PENDING`, `CONFIRMED`, or `PROCESSING` (i.e., before `SHIPPED`) |
| Terminal states (success) | 200 — order moved to `CANCELLED`; wallet hold released or COD commitment released. For an already-PAID (`CONFIRMED`) order the buyer is **not** cancelled directly: the request is recorded and the seller must approve (see "Paid-order cancellation (seller consent)"). |
| Terminal states (failure) | 403 with `requiresSellerConsent: true` when the order is paid and consent is required; 409 when the order is in a non-cancellable state (`IN_TRANSIT`/`SHIPPED` and later); 404 if order not found |
| Verification status | Verified |

### Happy Path

| Step | Actor/System | Action | Endpoint | Auth | Expected Response |
|---|---|---|---|---|---|
| 1 | Buyer | Submits cancellation request | `POST /api/order/orders/:orderId/cancel` | Bearer JWT (buyer role) | Request accepted |
| 2 | order-service | Validates order ownership and checks status is pre-`SHIPPED` | — | — | Policy check passes |
| 3 | order-service | Transitions order to `CANCELLED` status | — | — | Order record updated |
| 4 | order-service | Triggers saga compensation: wallet hold released (wallet payment) or COD commitment released (`releaseCODCommitment`) | — | — | Funds fully restored to buyer |
| 5 | order-service | Publishes `order.cancelled` event → notification-service → buyer receives `OrderCancelled` notification | — | — | Event emitted: `{ orderId, reason, refundAmount }` |
| 6 | Buyer | Receives confirmation of cancellation | — | — | 200 `{ orderId, status: "CANCELLED", refundAmount }` |

### Service Interaction Chain

`POST /api/order/orders/:orderId/cancel` is handled by `CancelOrderUseCase` within order-service. The saga compensation chain runs in-process: wallet hold release is performed by calling wallet-service (via the `OrderFulfillmentSaga` compensation path). For COD orders, `wallet.releaseCODCommitment(orderAmount)` decrements `codCommitmentUsed` so exposure headroom is restored. The `order.cancelled` event is published via outbox to the platform event bus, which notification-service consumes to send a push/in-app notification to the buyer.

### Paid-order cancellation (seller consent)

Once an order is `CONFIRMED` the buyer has already paid, so
`CancellationPolicy` requires **seller consent** before it can be cancelled. A
seller who has accepted and been paid is not exposed to a unilateral refund
before dispatch. This section documents the consent conversation that implements
that rule; previously `requiresSellerConsent` was returned with no endpoint to
act on it, so a buyer could only abandon the order or escalate out of band.

| Step | Actor/System | Action | Endpoint | Auth | Expected Response |
|---|---|---|---|---|---|
| 1 | Buyer | Attempts direct cancellation of a paid order | `POST /api/order/orders/:orderId/cancel` | Bearer JWT (buyer) | 403 `ORDER_CANNOT_BE_CANCELLED` with `requiresSellerConsent: true`, `nextAction: "REQUEST_CANCELLATION"` and `cancellationRequestEndpoint` |
| 2 | Buyer | Opens a cancellation request | `POST /api/order/orders/:orderId/cancel-request` | Bearer JWT (buyer) | 202 `{ cancelRequestStatus: "PENDING_SELLER" }`. Idempotent — a retry returns 200 with `alreadyRequested: true` and does not reset an open request |
| 3 | order-service | Persists `cancelRequestStatus` / `cancelRequestedAt` / `cancelRequestedBy` on the order | — | — | State is auditable and survives a restart |
| 4 | Seller | **Declines** (optional) | `POST /api/order/orders/:orderId/cancel-request/decline` | Bearer JWT (seller) | 200 `{ cancelRequestStatus: "DECLINED", reason }`. The order is left completely untouched — no refund, no status change |
| 4' | Seller | **Approves** | `POST /api/order/orders/:orderId/cancel-request/approve` | Bearer JWT (seller) | 200 — order moved to `CANCELLED` via the same code path as any other cancellation, so the wallet refund and COD hold release behave identically |
| 5 | order-service | Triggers saga compensation: wallet refunded (WALLET) or COD commitment released (COD) | — | — | Funds fully restored to buyer |

**Authorization:** only the order's seller may approve or decline. A buyer
attempting to approve their own request is refused with 403 — self-approval would
make the consent requirement meaningless. Only the buyer or seller may open a
request. A decision attempted with no pending request returns 409
`NO_PENDING_REQUEST` rather than silently succeeding.


### Unhappy Path Branches

| Trigger Condition | System Response | HTTP Status | Error Code |
|---|---|---|---|
| Order is `SHIPPED`, `DELIVERED`, or `COMPLETED` | 422 — cancellation not allowed after shipment | 422 | `ORDER_ALREADY_SHIPPED` |
| Order already `CANCELLED` | 422 — idempotent re-cancel rejected | 422 | `INVALID_STATUS_TRANSITION` |
| `orderId` not found | 404 | 404 | `ORDER_NOT_FOUND` |
| JWT expired or missing | 401 | 401 | `UNAUTHORIZED` |

---

## Flow 3: View Order History

### Summary

| Field | Value |
|---|---|
| Actor | Buyer |
| Trigger | Buyer navigates to their order history screen |
| Preconditions | Authenticated (Bearer JWT, buyer role) |
| Terminal states (success) | 200 — paginated list of buyer's orders |
| Terminal states (failure) | 401 if unauthenticated; empty array if no orders exist |
| Verification status | Verified |

### Happy Path

| Step | Actor/System | Action | Endpoint | Auth | Expected Response |
|---|---|---|---|---|---|
| 1 | Buyer | Requests order list with optional filters | `GET /api/order/orders` | Bearer JWT (buyer role) | Request accepted |
| 2 | order-service | Scopes query to requesting buyer's `buyerId` | — | — | Query scoped |
| 3 | order-service | Applies optional filters (status, date range) and paginates results | — | — | Results filtered and paged |
| 4 | Buyer | Receives paginated order list | — | — | 200 `{ orders: [...], total, page, limit }` |

### Query Parameters

| Parameter | Type | Description |
|---|---|---|
| `status` | string | Filter by order status (e.g., `PENDING`, `DELIVERED`, `CANCELLED`) |
| `from` | ISO 8601 date | Start of date range filter (`createdAt ≥ from`) |
| `to` | ISO 8601 date | End of date range filter (`createdAt ≤ to`) |
| `page` | integer | Page number (default: 1) |
| `limit` | integer | Results per page (default: 20) |

### Service Interaction Chain

`GET /api/order/orders` is handled entirely within order-service. The query is automatically scoped to the `buyerId` extracted from the JWT — buyers cannot see other buyers' orders.

### Unhappy Path Branches

| Trigger Condition | System Response | HTTP Status | Error Code |
|---|---|---|---|
| No orders match filters | 200 with empty `orders: []` | 200 | — |
| Invalid status filter value | 400 | 400 | `VALIDATION_ERROR` |
| JWT expired or missing | 401 | 401 | `UNAUTHORIZED` |

---

## Order Snapshot Structure & Historical Immutability

> **Added 2026-11-10 — MUVA/MSLE Phase 3 (ENH-008)**
> When an order is placed, the backend captures an immutable snapshot of the product configuration, price, and fulfillment terms at that moment. This snapshot is frozen — even if the catalog product is later modified, the seller changes their price, or the configuration definition is versioned, the order record retains the exact state that was purchased.

### What is Captured

Each order item includes three immutable snapshots:

**Configuration Snapshot**
- `productId` — the product identity at purchase time
- `productName` — the product display name
- `productImage` — the primary image URL
- `variantId` — the specific variant (if discrete)
- `selectedConfiguration` — human-readable option values (e.g., `{ "Colour": "Black", "Storage": "128 GB" }`)
- `configurationDefinitionVersion` — which version of the configuration definition was used
- `configurationFingerprint` — the deterministic canonical identifier for the exact configuration

**Price Snapshot**
- `unitPrice` — the resolved price per unit at checkout
- `currency` — TZS or other
- `quantity` — number of units ordered
- `totalLinePrice` — `unitPrice * quantity`
- `sellerOfferId` — which seller offer was used (or `null` for catalog default)
- `sellerId` — the seller's user ID
- `priceSource` — which precedence level was used (`promotion`, `seller_offer`, `catalog_default`)
- `appliedDiscount` — promotion discount amount if applicable
- `originalPrice` — pre-promotion price if applicable

**Fulfillment Snapshot**
- `fulfillmentPolicy` — seller-fulfilled, platform-fulfilled, etc.
- `leadTimeDays` — expected lead time
- `deliveryMethod` — standard, express, pickup
- `shippingCost` — the committed shipping cost
- `estimatedDeliveryDate` — the delivery estimate at order time
- `fulfillmentLocation` — where the item ships from

### Why This Matters

- **Catalog changes are safe** — if a seller removes a product variant, updates a configuration definition, or changes their price, past orders still show what was actually purchased. The buyer's receipt remains accurate.
- **Price disputes are resolved** — the `priceSource` and `originalPrice` fields provide a full audit trail of how the final price was calculated.
- **Configuration is preserved** — the `configurationFingerprint` and `configurationDefinitionVersion` together guarantee that the exact product configuration the buyer selected is what gets fulfilled, even if the definition evolves later.

### How It Works at Checkout

1. `CheckoutTransactionBoundaryPolicy.validate()` runs the 6-step validation sequence
2. On success, it produces an `OrderItemSnapshot` containing all three snapshots
3. The checkout confirmation flow persists this snapshot alongside the order item
4. The snapshot is immutable — no subsequent operation modifies it

The buyer does not interact with the snapshot directly. It is a backend guarantee that historical orders remain interpretable.

