# Seller Flows — Order Service

> **Verification status:** Verified — Live-verified 2026-11-06 against `run-lifecycle-checks.mjs` (LC-04, LC-18)
> **Verification basis:** `scripts/verification/run-lifecycle-checks.mjs` LC-04/LC-18 (2026-11-06); MUVA/MSLE Phase 3 implementation (2026-11-10)
> **Last updated:** 2026-11-10 (added seller offer fulfillment note — ENH-001/007)

## Overview

This document covers order-service flows from the seller's perspective: viewing the incoming order inbox, verifying stock to accept an order, declining stock when unable to fulfill, and background context on how COD eligibility is evaluated at checkout. All flows require a valid seller JWT. The seller stock verification window is enforced by `VerificationTimeoutJob`; orders not acted upon within the window are auto-declined.

---

## Flow Index

| # | Flow Name | Verification Status | Primary Endpoint |
|---|---|---|---|
| 1 | View Seller Order Inbox | Verified | `GET /api/order/seller/orders` |
| 2 | Verify Stock (Accept Order) | Verified | `POST /api/order/orders/:orderId/verify` |
| 3 | Request Order Cancellation (Buyer) | Verified | `POST /api/order/orders/:orderId/cancel` |
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
| Preconditions | Authenticated (Bearer JWT, seller role); order is in `PENDING_SELLER_VERIFICATION` status; seller owns the order; `VerificationTimeoutJob` window has not elapsed |
| Terminal states (success) | 200 — order transitions to `SELLER_VERIFIED`; `order.seller_verified` event published |
| Terminal states (failure) | 422 if order is not in `PENDING` status; 422 if verification window expired |
| Verification status | Verified |

### Happy Path

| Step | Actor/System | Action | Endpoint | Auth | Expected Response |
|---|---|---|---|---|---|
| 1 | notification-service | Delivers `order.pending_seller_verification` event to seller (in-app / push) | — | — | Seller is notified of new order requiring verification |
| 2 | Seller | Reviews order details and confirms stock availability | `POST /api/order/orders/:orderId/verify` with body `{ stockAvailable: true }` | Bearer JWT (seller role) | Request accepted |
| 3 | order-service | Validates seller owns the order and order is in `PENDING_SELLER_VERIFICATION` status | — | — | Ownership and status confirmed |
| 4 | order-service | Checks `VerificationTimeoutJob` window has not elapsed | — | — | Timeout not exceeded |
| 5 | order-service | Transitions order to `SELLER_VERIFIED` status | — | — | Order status updated |
| 6 | order-service | Publishes `order.seller_verified` event → logistics-service auto-creates delivery | — | — | Event emitted: `{ orderId, sellerId }` |
| 7 | Seller | Receives confirmation | — | — | 200 `{ orderId, status: "SELLER_VERIFIED" }` |

> ⚠️ **FLW-008 + FLW-009 corrected 2026-11-06:**
> - **Path corrected:** Endpoint is `POST /api/order/orders/:orderId/verify` with body `{ stockAvailable: true }`, NOT `/verify-stock`. Calling `/verify-stock` returns 404.
> - **Status corrected:** After verification the order moves to `SELLER_VERIFIED`, not `CONFIRMED`. The old `PENDING → CONFIRMED → PROCESSING` chain has been replaced by `PENDING_SELLER_VERIFICATION → SELLER_VERIFIED` in the actual implementation.

### Verification Timeout

`VerificationTimeoutJob` runs on a configured schedule. If a seller does not act on a `PENDING` order within the window, the job automatically invokes the decline path: order is cancelled and the buyer's wallet is restored. The timeout window duration is platform-configured. Sellers who receive the notification but do not respond in time will see the order auto-transitioned to `CANCELLED` in their inbox.

### Service Interaction Chain

`POST /api/order/orders/:orderId/verify-stock` is handled by `SellerVerifyStockUseCase` within order-service. On success, `order.confirmed` is published via outbox. notification-service consumes this event to send buyer notification. The order then proceeds through the `OrderFulfillmentSaga` (payment processing → shipment creation).

### Unhappy Path Branches

| Trigger Condition | System Response | HTTP Status | Error Code |
|---|---|---|---|
| Order not in `PENDING_SELLER_VERIFICATION` status | 422 | 422 | `INVALID_STATUS_TRANSITION` |
| Seller does not own the order | 403 | 403 | `FORBIDDEN` |
| `orderId` not found | 404 | 404 | `ORDER_NOT_FOUND` |
| JWT missing or expired | 401 | 401 | `UNAUTHORIZED` |

---

## Flow 3: Order Cancellation (Buyer-Initiated)

> ⚠️ **Corrected 2026-11-06:** `POST /api/order/orders/:orderId/decline-stock` does not exist (returns 404). The correct buyer-initiated cancellation endpoint is `POST /api/order/orders/:orderId/cancel`, which is a buyer action. Sellers cannot directly decline — when a seller cannot fulfill an order they contact the buyer who then cancels.

| Field | Value |
|---|---|
| **Actor** | Buyer |
| **Trigger** | Buyer requests order cancellation |
| **Preconditions** | Authenticated (Bearer JWT, buyer role); order exists |
| **Terminal states** | 200 — order cancelled; or 403 with `requiresSellerConsent` for paid orders |
| **Verification status** | Verified |

### Happy Path

| Step | Actor/System | Action | Endpoint | Auth | Expected Response |
|---|---|---|---|---|---|
| 1 | Buyer | Cancel order | `POST /api/order/orders/:orderId/cancel` | Buyer JWT | 200 `{ orderId, status: "CANCELLED" }` or 403 `{ requiresSellerConsent: true }` |

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

---

## Seller Offer Fulfillment Context

> **Added 2026-11-10 — MUVA/MSLE Phase 3 (ENH-001/007)**
> Orders now reference a specific seller offer at checkout time. The seller offer carries the fulfillment policy, lead time, and warranty terms that were committed when the order was placed. The order snapshot preserves these so the seller's obligations are clear even if they later change their offer terms.

### What the Seller Sees

When a seller receives an order for verification, the order item includes:
- The **seller offer ID** that was used to fulfill this order
- The **resolved price** (from the price precedence chain at checkout time)
- The **fulfillment policy** that was committed (seller-fulfilled, platform-fulfilled)
- The **configuration fingerprint** if the product is configurable

### Fulfillment Policy Impact

| Fulfillment Policy | Seller Action |
|---|---|
| `seller_fulfilled` | Seller ships directly to buyer; lead time from offer applies |
| `platform_fulfilled` | Platform handles logistics; seller only verifies stock |

### How Configuration Affects Fulfillment

For configurable products, the order's configuration fingerprint tells the seller exactly which variant/configuration was purchased. The seller should:
1. Read the `selectedConfiguration` from the order snapshot (human-readable display values)
2. Cross-reference with the `configurationFingerprint` for the canonical identifier
3. Pick the matching physical product from their inventory

> **Note:** The order snapshot is immutable. If the seller later changes their offer's price or fulfillment terms, past orders retain the terms that were active at purchase time.
