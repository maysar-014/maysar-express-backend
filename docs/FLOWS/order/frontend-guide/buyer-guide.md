# Buyer Guide — Order Service

> Mirrors: docs/FLOWS/order/user-flow/buyer-flows.md
> Verification status: Verified
> Last updated: September 2026

## Overview

This guide is for frontend developers implementing the order UI for buyers. It covers three flows: viewing order details, cancelling an order before it ships, and browsing order history. All flows require a valid buyer JWT. The cancellation window closes once an order reaches `SHIPPED` status — hide or disable the cancel button from that point forward.

---

## Flow 1: View Order Details

**User Goal:** See the current status, items, seller, and delivery information for a specific order.

**UI States to Handle:**

| State | What User Sees | UI Treatment |
|---|---|---|
| Loading | Order details loading | Skeleton card matching the detail layout |
| Success | Full order detail | Render status badge, items list, seller name, delivery status, payment method, COD info if applicable |
| Not Found | Order not found | "Order not found." — no retry; navigate back to order history |
| Unauthorized | Session expired | "Please log in again." — redirect to login |
| Error | Failed to load | "Something went wrong. Please try again." + retry button |

**Actions the User Can Take:**

**Load order details:**
- What the user sees: Order history list or notification tap navigates them here. Screen loads order data automatically.
- What they click/tap: Navigation to the order detail screen (no explicit user action)
- API call: `GET /api/order/orders/:orderId`
- Auth: Bearer JWT (buyer role)
- Request body: none
- Success response: `200 { orderId, status, items[], seller, deliveryStatus, paymentMethod, totalAmount, createdAt }`
- Success handling: Render all fields. Map `status` to the user-friendly label table below. Show the cancel button only if status is `PENDING`, `CONFIRMED`, or `PROCESSING`. Hide or disable cancel for `SHIPPED`, `DELIVERED`, `COMPLETED`, `CANCELLED`, and `REFUNDED`.
- Error handling: See error code table below.

**Order status display mapping:**

| API Status | User-Facing Label |
|---|---|
| `PENDING` | Awaiting seller confirmation |
| `CONFIRMED` | Order confirmed |
| `PROCESSING` | Being prepared |
| `SHIPPED` | On the way |
| `DELIVERED` | Delivered |
| `COMPLETED` | Completed |
| `CANCELLED` | Cancelled |
| `REFUNDED` | Refunded |

**COD order display:**
- If `paymentMethod` is `COD`, show a "Pay on delivery" badge alongside the order status.
- While the COD hold is active (status `PENDING` through `SHIPPED`), show: "A hold of TZS {amount} is reserved until delivery."
- After delivery confirmation: "Payment settled on delivery."
- After cancellation: "COD hold released — no charge."

**Delivery status display:**
- The `deliveryStatus` field reflects the last known logistics state. Map it using the delivery label table in `docs/FLOWS/logistics/frontend-guide/buyer-guide.md`.
- Delivery status updates asynchronously — refresh on screen focus or via polling.

**Error Code Table:**

| HTTP Status | Error Code | User-Facing Message | Retry? |
|---|---|---|---|
| 401 | UNAUTHORIZED | "Please log in again." | Yes — re-authenticate |
| 403 | FORBIDDEN | "You do not have permission to view this order." | No |
| 404 | ORDER_NOT_FOUND | "Order not found." | No |
| 5xx | — | "Something went wrong. Please try again." | Yes — retry after delay |

**What the User Should Understand at Every Stage:**
- When the screen loads, they are seeing the latest recorded state of their order. Delivery status may be slightly behind real-time logistics updates — a manual refresh brings it current.
- The seller's name is shown so they know who they bought from.
- For COD orders, the hold shown in their wallet is the commitment for this order — it is not a charge and will be settled only on confirmed delivery or released on cancellation.

---

## Flow 2: Cancel Order

**User Goal:** Cancel an order that has not yet shipped.

**UI States to Handle:**

| State | What User Sees | UI Treatment |
|---|---|---|
| Cancel button visible | Order is cancellable | Show enabled "Cancel Order" button (status is `PENDING`, `CONFIRMED`, or `PROCESSING`) |
| Cancel button hidden | Order cannot be cancelled | Hide or disable the button entirely for `SHIPPED`, `DELIVERED`, `COMPLETED`, `CANCELLED`, `REFUNDED` |
| Loading | "Cancelling order…" | Show loading indicator; disable the cancel button |
| Success | "Order cancelled. Your refund is being processed." | Replace cancel button with success message; update order status badge to `CANCELLED` |
| Already cancelled | Order was already cancelled | "This order has already been cancelled." — no further action needed |
| Already shipped | Order cannot be cancelled | "This order has already shipped and cannot be cancelled. Please contact support if you need assistance." |
| Error | Cancellation failed | "Something went wrong. Please try again." + retry |

**Actions the User Can Take:**

**Cancel order:**
- What the user sees: Order detail screen showing an active "Cancel Order" button (only when status is pre-`SHIPPED`)
- What they click/tap: "Cancel Order" button
- API call: `POST /api/order/orders/:orderId/cancel`
- Auth: Bearer JWT (buyer role)
- Request body: none
- Success response: `200 { orderId, status: "CANCELLED", refundAmount }`
- Success handling: Update the order status display to `CANCELLED`. Show the message "Order cancelled. Your refund is being processed." The wallet hold or COD commitment is released automatically by the system — no buyer action is needed for the refund. If `refundAmount > 0`, show the amount: "TZS {refundAmount} will be returned to your wallet."
- Error handling: See error code table below.

> ⚠️ **Cancel button visibility rule:** Never show an enabled cancel button for orders in `SHIPPED`, `DELIVERED`, `COMPLETED`, `CANCELLED`, or `REFUNDED` status. Check the current status on page load and after any status update.

**Error Code Table:**

| HTTP Status | Error Code | User-Facing Message | Retry? |
|---|---|---|---|
| 400 | VALIDATION_ERROR | "Something went wrong. Please try again." | Yes |
| 401 | UNAUTHORIZED | "Please log in again." | Yes — re-authenticate |
| 403 | FORBIDDEN | "You do not have permission to cancel this order." | No |
| 404 | ORDER_NOT_FOUND | "Order not found." | No |
| 409 | INVALID_STATUS_TRANSITION | "This order has already been cancelled." | No |
| 422 | ORDER_ALREADY_SHIPPED | "This order has already shipped and cannot be cancelled. Please contact support if you need assistance." | No |
| 5xx | — | "Something went wrong. Please try again." | Yes — retry after delay |

**What the User Should Understand at Every Stage:**
- The cancel button is only available while the seller has not yet dispatched the order. Once the order is marked as shipped, cancellation is no longer possible through the app.
- After a successful cancellation, refund processing is automatic. For wallet payments, the hold is released immediately. For COD orders, the commitment is released and the reserved amount is available again. No separate refund request is needed.
- The buyer will receive an order cancellation notification confirming the cancellation.

---

## Flow 3: View Order History

**User Goal:** Browse all past and current orders, filter by status or date, and navigate to individual order details.

**UI States to Handle:**

| State | What User Sees | UI Treatment |
|---|---|---|
| Loading | Order list loading | Skeleton list of order summary cards |
| List with orders | Paginated order list | Render each order card with status badge, seller name, total amount, and date |
| Empty | No orders yet | "No orders yet. Start shopping!" — show a button to browse the catalog |
| Error | Failed to load | "Something went wrong. Please try again." + retry button |

**Actions the User Can Take:**

**Load order history:**
- What the user sees: Order history screen with optional filter controls (status dropdown, date range picker)
- What they click/tap: Screen loads automatically; user may apply filters or tap "Load more" / scroll for pagination
- API call: `GET /api/order/orders?status=&page=&limit=`
- Auth: Bearer JWT (buyer role)
- Query parameters:

  | Parameter | Type | Notes |
  |---|---|---|
  | `status` | string | Optional — filter by order status (e.g. `PENDING`, `DELIVERED`, `CANCELLED`) |
  | `from` | ISO 8601 date | Optional — filter orders created on or after this date |
  | `to` | ISO 8601 date | Optional — filter orders created on or before this date |
  | `page` | integer | Default: 1 |
  | `limit` | integer | Default: 20 |

- Success response: `200 { orders: [...], total, page, limit }`
- Success handling: Render the `orders` array as a list of summary cards. Show the total count. Implement pagination using `total`, `page`, and `limit`. Preserve active filters when paginating.
- Error handling: See error code table below.

**Filter options to expose in the UI:**

| Filter | Options |
|---|---|
| Status | All, Awaiting confirmation, Confirmed, Processing, Shipped, Delivered, Completed, Cancelled, Refunded |
| Date range | From / To date pickers |

**Error Code Table:**

| HTTP Status | Error Code | User-Facing Message | Retry? |
|---|---|---|---|
| 400 | VALIDATION_ERROR | "Invalid filter value. Please check your search options and try again." | Yes — fix input |
| 401 | UNAUTHORIZED | "Please log in again." | Yes — re-authenticate |
| 5xx | — | "Something went wrong. Please try again." | Yes — retry after delay |

**What the User Should Understand at Every Stage:**
- The order list is scoped to their account only — they will never see other buyers' orders.
- The empty state "No orders yet" is normal for a new buyer. Filtering by a status that has no matching orders also returns an empty list — this is not an error.
- Date range filters apply to the order creation date (`createdAt`), not to the delivery or update date.
- Each order card links to the full order detail screen (Flow 1).
