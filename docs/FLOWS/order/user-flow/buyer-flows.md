# Buyer Flows — Order Service

> **Verification status:** Verified
> **Verification basis:** `docs/FLOWS/_verification/analysis-report.md` (September 2026); `docs/order/ORDER_SERVICE_SYSTEM.md`
> **Canonical source:** `docs/FLOWS/order/user-flow/buyer-flows.md`
> **Corresponding frontend guide:** `docs/FLOWS/order/frontend-guide/buyer-guide.md`

## Overview

This document covers order-service flows from the buyer's perspective: viewing order details, cancelling an order before it ships, and browsing order history. The order lifecycle is `PENDING → CONFIRMED → PROCESSING → SHIPPED → DELIVERED → COMPLETED`, with `CANCELLED` and `REFUNDED` as terminal branches available before `SHIPPED`. All flows require a valid buyer JWT. COD-specific flows (eligibility check, dispute) are documented in the role lifecycle overview at `docs/FLOWS/role-overviews/buyer-lifecycle.md`.

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
PENDING → CONFIRMED → PROCESSING → SHIPPED → DELIVERED → COMPLETED
       ↘ CANCELLED (available before SHIPPED)
       ↘ REFUNDED (post-cancellation wallet restoration terminal)
```

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
