# Seller Flows — Order Service

> **Verification status:** Verified
> **Verification basis:** `docs/FLOWS/_verification/analysis-report.md` (September 2026); `docs/order/ORDER_SERVICE_SYSTEM.md`
> **Canonical source:** `docs/FLOWS/order/user-flow/seller-flows.md`
> **Corresponding frontend guide:** `docs/FLOWS/order/frontend-guide/seller-guide.md`

## Overview

This document covers order-service flows from the seller's perspective: viewing the incoming order inbox, verifying stock to accept an order, declining stock when unable to fulfill, and background context on how COD eligibility is evaluated at checkout. All flows require a valid seller JWT. The seller stock verification window is enforced by `VerificationTimeoutJob`; orders not acted upon within the window are auto-declined.

---

## Flow Index

| # | Flow Name | Verification Status | Primary Endpoint |
|---|---|---|---|
| 1 | View Seller Order Inbox | Verified | `GET /api/order/seller/orders` |
| 2 | Verify Stock (Accept Order) | Verified | `POST /api/order/orders/:orderId/verify-stock` |
| 3 | Decline Stock | Verified | `POST /api/order/orders/:orderId/decline-stock` |
| 4 | COD Eligibility Check (Background Context) | Verified | — (internal engine, not seller-initiated) |

---

## Flow 1: View Seller Order Inbox

### Summary

| Field | Value |
|---|---|
| Actor | Seller |
| Trigger | Seller opens their order management dashboard |
| Preconditions | Authenticated (Bearer JWT, seller role) |
| Terminal states (success) | 200 — paginated list of orders scoped to the seller's `sellerId`, optionally filtered by status |
| Terminal states (failure) | 401 if unauthenticated; empty array if no orders exist |
| Verification status | Verified |

### Happy Path

| Step | Actor/System | Action | Endpoint | Auth | Expected Response |
|---|---|---|---|---|---|
| 1 | Seller | Requests their order inbox with optional status filter | `GET /api/order/seller/orders` | Bearer JWT (seller role) | Request accepted |
| 2 | order-service | Scopes query to requesting seller's `sellerId` | — | — | Query scoped; other sellers' orders excluded |
| 3 | order-service | Applies optional status filter and paginates | — | — | Results filtered and paged |
| 4 | Seller | Receives list of their incoming orders | — | — | 200 `{ orders: [...], total, page, limit }` |

### Query Parameters

| Parameter | Type | Description |
|---|---|---|
| `status` | string | Filter by order status (e.g., `PENDING`, `CONFIRMED`, `PROCESSING`) |
| `page` | integer | Page number (default: 1) |
| `limit` | integer | Results per page (default: 20) |

### Service Interaction Chain

`GET /api/order/seller/orders` is handled entirely within order-service. The `sellerId` is extracted from the seller JWT and used to scope the query — sellers cannot see orders belonging to other sellers.

### Unhappy Path Branches

| Trigger Condition | System Response | HTTP Status | Error Code |
|---|---|---|---|
| No orders match criteria | 200 with empty `orders: []` | 200 | — |
| Invalid status filter | 400 | 400 | `VALIDATION_ERROR` |
| JWT missing or expired | 401 | 401 | `UNAUTHORIZED` |
| User does not have seller role | 403 | 403 | `FORBIDDEN` |

---

## Flow 2: Verify Stock (Accept Order)

### Summary

| Field | Value |
|---|---|
| Actor | Seller |
| Trigger | Seller receives `order.pending_seller_verification` notification event and confirms stock is available |
| Preconditions | Authenticated (Bearer JWT, seller role); order is in `PENDING` status; seller owns the order; `VerificationTimeoutJob` window has not elapsed |
| Terminal states (success) | 200 — order transitions to `CONFIRMED`; `order.seller_verified` notification event published |
| Terminal states (failure) | 422 if order is not in `PENDING` status; 422 if verification window expired |
| Verification status | Verified |

### Happy Path

| Step | Actor/System | Action | Endpoint | Auth | Expected Response |
|---|---|---|---|---|---|
| 1 | notification-service | Delivers `order.pending_seller_verification` event to seller (in-app / push) | — | — | Seller is notified of new order requiring verification |
| 2 | Seller | Reviews order details and confirms stock availability | `POST /api/order/orders/:orderId/verify-stock` | Bearer JWT (seller role) | Request accepted |
| 3 | order-service | Validates seller owns the order and order is in `PENDING` status | — | — | Ownership and status confirmed |
| 4 | order-service | Checks `VerificationTimeoutJob` window has not elapsed | — | — | Timeout not exceeded |
| 5 | order-service | Transitions order to `CONFIRMED` status | — | — | Order status updated |
| 6 | order-service | Publishes `order.confirmed` event → notification-service → buyer notified | — | — | Event emitted: `{ orderId, sellerId }` |
| 7 | Seller | Receives confirmation | — | — | 200 `{ orderId, status: "CONFIRMED" }` |

### Verification Timeout

`VerificationTimeoutJob` runs on a configured schedule. If a seller does not act on a `PENDING` order within the window, the job automatically invokes the decline path: order is cancelled and the buyer's wallet is restored. The timeout window duration is platform-configured. Sellers who receive the notification but do not respond in time will see the order auto-transitioned to `CANCELLED` in their inbox.

### Service Interaction Chain

`POST /api/order/orders/:orderId/verify-stock` is handled by `SellerVerifyStockUseCase` within order-service. On success, `order.confirmed` is published via outbox. notification-service consumes this event to send buyer notification. The order then proceeds through the `OrderFulfillmentSaga` (payment processing → shipment creation).

### Unhappy Path Branches

| Trigger Condition | System Response | HTTP Status | Error Code |
|---|---|---|---|
| Order not in `PENDING` status | 422 | 422 | `INVALID_STATUS_TRANSITION` |
| Verification timeout exceeded | 422 — order already auto-declined | 422 | `VERIFICATION_WINDOW_EXPIRED` |
| Seller does not own the order | 403 | 403 | `FORBIDDEN` |
| `orderId` not found | 404 | 404 | `ORDER_NOT_FOUND` |
| JWT missing or expired | 401 | 401 | `UNAUTHORIZED` |

---

## Flow 3: Decline Stock

### Summary

| Field | Value |
|---|---|
| Actor | Seller |
| Trigger | Seller determines they cannot fulfill the order (out of stock, item discontinued, etc.) |
| Preconditions | Authenticated (Bearer JWT, seller role); order is in `PENDING` status; seller owns the order |
| Terminal states (success) | 200 — order transitions to `CANCELLED`; buyer wallet fully restored; `order.seller_declined` notification event published |
| Terminal states (failure) | 422 if order is not in `PENDING` status; 403 if seller doesn't own the order |
| Verification status | Verified |

### Happy Path

| Step | Actor/System | Action | Endpoint | Auth | Expected Response |
|---|---|---|---|---|---|
| 1 | Seller | Submits stock decline | `POST /api/order/orders/:orderId/decline-stock` | Bearer JWT (seller role) | Request accepted |
| 2 | order-service | Validates seller owns the order and order is in `PENDING` status | — | — | Ownership and status confirmed |
| 3 | order-service | Transitions order to `CANCELLED` status | — | — | Order record updated |
| 4 | order-service | Triggers saga compensation: buyer wallet hold released or COD commitment released | — | — | Buyer funds fully restored |
| 5 | order-service | Publishes `order.cancelled` event (reason: `SELLER_DECLINED`) → notification-service → buyer notified | — | — | `order.seller_declined` notification event sent to buyer |
| 6 | Seller | Receives confirmation | — | — | 200 `{ orderId, status: "CANCELLED" }` |

### Service Interaction Chain

`POST /api/order/orders/:orderId/decline-stock` is handled by `SellerDeclineStockUseCase` within order-service. Saga compensation (wallet restoration) mirrors the buyer-initiated cancel path. The `order.cancelled` event published to the bus includes `reason: "SELLER_DECLINED"`, which notification-service uses to send a seller-decline–specific notification to the buyer. No inventory adjustment is needed since stock was never confirmed reserved.

### Unhappy Path Branches

| Trigger Condition | System Response | HTTP Status | Error Code |
|---|---|---|---|
| Order not in `PENDING` status | 422 | 422 | `INVALID_STATUS_TRANSITION` |
| Seller does not own the order | 403 | 403 | `FORBIDDEN` |
| `orderId` not found | 404 | 404 | `ORDER_NOT_FOUND` |
| JWT missing or expired | 401 | 401 | `UNAUTHORIZED` |

---

## Flow 4: COD Eligibility Check (Background Context)

### Summary

| Field | Value |
|---|---|
| Actor | order-service (internal engine) |
| Trigger | Buyer attempts to place a COD order during checkout confirmation |
| Preconditions | Buyer's COD trust tier is evaluated; this is not a seller-initiated flow |
| Terminal states | Order proceeds or is rejected based on eligibility gates |
| Verification status | Verified |

> **Note:** This is not a seller-initiated flow. It is documented here as background context because sellers are affected by it — orders that fail COD eligibility never reach the seller's inbox. Understanding why a buyer's COD order was blocked helps sellers understand low order volume for COD in certain geographies or from new buyers.

### How COD Eligibility Works

`CODEligibilityEngine` runs within order-service during checkout confirm (`BuyerConfirmCheckoutUseCase`). It evaluates:

| Gate | What it checks |
|---|---|
| **Buyer COD trust tier** | Derived from dual-axis score + lifetime COD value (see order system doc §2.1) |
| **Exposure limit** | `activeExposure + orderAmount ≤ getExposureLimit(tier)` |
| **Concurrent order limit** | `activeCODOrders < getConcurrentOrderLimit(tier)` |
| **Geographic radius** | Haversine distance from seller ward centroid ≤ tier radius |
| **Area support** | Delivery area supports COD fulfillment |

If any gate fails, the checkout confirm returns an error — the order is never created, and it never appears in the seller's inbox. The buyer must either switch to a non-COD payment method or build trust tier before COD orders of that value/distance are available.

| COD Trust Tier | Max Exposure | Max Concurrent Orders | Radius |
|---|---|---|---|
| `NEW_BUYER` | TZS 30,000 | 1 | 24 km |
| `TRUSTED_BEGINNER` | TZS 150,000 | 2 | 50 km |
| `TRUSTED_BUYER` | TZS 500,000 | 3 | Same region |
| `GOLD_BUYER` | TZS 2,000,000 | 5 | Nationwide |
| `PLATINUM_BUYER` | TZS 10,000,000 | Unlimited | Nationwide |
