# Seller Guide — Order Service

> Mirrors: docs/FLOWS/order/user-flow/seller-flows.md
> Verification status: Verified
> Last updated: September 2026

## Overview

This guide is for frontend developers implementing the order management UI for sellers. It covers three flows: viewing the incoming order inbox (with a pending-verification badge), confirming stock to accept an order within the verification window, and declining stock when unable to fulfill. All flows require a valid seller JWT. Orders that are not acted upon within the verification timeout window are automatically declined by the system — the UI must communicate this deadline clearly.

---

## Flow 1: View Order Inbox

**User Goal:** See all incoming orders, with quick visibility into how many are awaiting stock verification.

**UI States to Handle:**

| State | What User Sees | UI Treatment |
|---|---|---|
| Loading | Inbox loading | Skeleton list of order summary cards |
| Inbox with pending orders | List of orders, pending-verification badge | Show badge/count on the inbox tab: "X orders need confirmation". Highlight `PENDING` orders at the top of the list. |
| Empty | No orders | "No pending orders. New orders will appear here when buyers place them." |
| Error | Failed to load | "Something went wrong. Please try again." + retry button |

**Actions the User Can Take:**

**Load pending order inbox:**
- What the seller sees: Order management screen. A badge on the inbox tab shows how many orders require verification. The list defaults to showing `PENDING` orders first.
- What they click/tap: Screen loads automatically on navigation; seller can also filter by status
- API call: `GET /api/order/seller/orders?status=pending_verification`
- Auth: Bearer JWT (seller role)
- Query parameters:

  | Parameter | Type | Notes |
  |---|---|---|
  | `status` | string | Use `pending_verification` to load the verification queue; omit for all orders |
  | `page` | integer | Default: 1 |
  | `limit` | integer | Default: 20 |

- Success response: `200 { orders: [...], total, page, limit }`
- Success handling: Render the orders list. Derive the pending-verification badge count from the `total` field when `status=pending_verification`. Orders in `PENDING` status represent the verification queue.
- Error handling: See error code table below.

**Pending verification badge:**
- Fetch `GET /api/order/seller/orders?status=pending_verification&limit=1` on app load or screen focus to get the badge count from `total`.
- Show the count as a badge on the inbox tab/icon: e.g. "3" or "3 pending".
- Update the badge after the seller verifies or declines an order.

**Error Code Table:**

| HTTP Status | Error Code | User-Facing Message | Retry? |
|---|---|---|---|
| 400 | VALIDATION_ERROR | "Invalid filter. Please check your search options." | Yes — fix input |
| 401 | UNAUTHORIZED | "Please log in again." | Yes — re-authenticate |
| 403 | FORBIDDEN | "You do not have permission to view orders." | No |
| 5xx | — | "Something went wrong. Please try again." | Yes — retry after delay |

**What the Seller Should Understand at Every Stage:**
- The inbox is scoped to their account — they see only orders from buyers who purchased their products.
- Orders in `PENDING` status are waiting for the seller to confirm or decline stock. There is a time limit to respond — orders that pass the deadline are automatically declined and the buyer's payment is released.
- The badge count reflects live data. It resets as orders are acted upon.

---

## Flow 2: Verify Stock (Accept Order)

**User Goal:** Confirm that stock is available and send the order to logistics for fulfillment.

**UI States to Handle:**

| State | What User Sees | UI Treatment |
|---|---|---|
| Order detail — awaiting action | Order items, buyer info, verification deadline | Show "Confirm Order" and "Decline" buttons. Show countdown timer if deadline is available from the response. |
| Loading | "Confirming order…" | Spinner on confirm button; disable both action buttons |
| Success | "Order confirmed and sent to logistics" | Replace action buttons with a success message; update order status to `CONFIRMED` |
| Already verified | Order already confirmed | "This order has already been confirmed." — remove action buttons |
| Timeout expired | Verification window passed | "The confirmation window for this order has expired. The order was automatically declined." — remove action buttons |
| Error | Confirmation failed | "Something went wrong. Please try again." + retry |

**Actions the User Can Take:**

**Confirm stock (verify):**
- What the seller sees: Order detail screen showing the buyer's items, quantities, delivery address, and a countdown timer showing the remaining time to confirm
- What they click/tap: "Confirm Order" button
- API call: `POST /api/order/orders/:orderId/verify-stock`
- Auth: Bearer JWT (seller role)
- Request body: none
- Success response: `200 { orderId, status: "CONFIRMED" }`
- Success handling: Update the order status display to `CONFIRMED`. Show: "Order confirmed and sent to logistics." Remove the confirm and decline buttons. The buyer is notified automatically via the `order.seller_verified` notification event — no seller action needed.
- Error handling: See error code table below.

**Verification timeout countdown:**
- If the order response includes a verification deadline or time remaining, display a countdown timer on the order detail screen.
- When fewer than 5 minutes remain, highlight the timer in amber or red.
- When the countdown reaches zero, fetch the order status again. If the order has been auto-declined, show the timeout message and remove the action buttons.
- Do not allow the seller to submit after the deadline — disable the action buttons when expired.

> ⚠️ **Verification window:** Sellers must confirm or decline within the platform's verification timeout window. Orders not acted upon are automatically declined by `VerificationTimeoutJob`. Make the deadline prominent to reduce missed verification windows.

**Error Code Table:**

| HTTP Status | Error Code | User-Facing Message | Retry? |
|---|---|---|---|
| 401 | UNAUTHORIZED | "Please log in again." | Yes — re-authenticate |
| 403 | FORBIDDEN | "You do not have permission to confirm this order." | No |
| 404 | ORDER_NOT_FOUND | "Order not found." | No |
| 409 | INVALID_STATUS_TRANSITION | "This order has already been confirmed." | No |
| 422 | VERIFICATION_WINDOW_EXPIRED | "The confirmation window for this order has expired. The order was automatically declined." | No |
| 5xx | — | "Something went wrong. Please try again." | Yes — retry after delay |

**What the Seller Should Understand at Every Stage:**
- After tapping "Confirm Order", the system transitions the order to `CONFIRMED` and initiates the fulfillment process with logistics. The buyer receives an automatic notification.
- The verification window is enforced by the platform. Acting promptly is important — expired orders harm buyer experience and may affect the seller's ratings.
- If the order shows as already confirmed or expired when they open it, another session or the timeout job may have already acted. The order detail will reflect the current state.

---

## Flow 3: Decline Stock

**User Goal:** Decline an order that cannot be fulfilled, triggering a buyer refund automatically.

**UI States to Handle:**

| State | What User Sees | UI Treatment |
|---|---|---|
| Pre-decline confirmation | Confirmation dialog | "Are you sure you want to decline this order? This cannot be undone. The buyer will be notified and their payment refunded." — "Decline Order" and "Cancel" buttons |
| Loading | "Declining order…" | Spinner on decline button; disable both buttons |
| Success | "Order declined. Buyer has been notified and refund initiated." | Replace action buttons with success message; update order status to `CANCELLED` |
| Already declined | Order already cancelled | "This order has already been declined or cancelled." — remove action buttons |
| Error | Decline failed | "Something went wrong. Please try again." + retry |

**Actions the User Can Take:**

**Decline stock:**
- What the seller sees: Order detail screen with a "Decline" button alongside "Confirm Order"
- What they click/tap: "Decline" button → confirmation dialog appears
- Confirmation dialog: "Are you sure you want to decline this order? This cannot be undone. The buyer will be notified and their payment refunded." with "Decline Order" (destructive) and "Cancel" (safe) buttons
- After confirming in the dialog:
  - API call: `POST /api/order/orders/:orderId/decline-stock`
  - Auth: Bearer JWT (seller role)
  - Request body: none
  - Success response: `200 { orderId, status: "CANCELLED" }`
- Success handling: Update the order status display to `CANCELLED`. Show: "Order declined. Buyer has been notified and refund initiated." The buyer receives an automatic `order.seller_declined` notification and their wallet is restored automatically — no seller action is needed for the refund.
- Error handling: See error code table below.

> ⚠️ **Confirmation dialog required:** Always show a confirmation dialog before submitting a decline. Declining is irreversible — the order is cancelled and the buyer refunded immediately. Do not submit the API call on first tap.

**Error Code Table:**

| HTTP Status | Error Code | User-Facing Message | Retry? |
|---|---|---|---|
| 401 | UNAUTHORIZED | "Please log in again." | Yes — re-authenticate |
| 403 | FORBIDDEN | "You do not have permission to decline this order." | No |
| 404 | ORDER_NOT_FOUND | "Order not found." | No |
| 409 | INVALID_STATUS_TRANSITION | "This order has already been declined or cancelled." | No |
| 422 | INVALID_STATUS_TRANSITION | "This order can no longer be declined. It may have already been confirmed." | No |
| 5xx | — | "Something went wrong. Please try again." | Yes — retry after delay |

**What the Seller Should Understand at Every Stage:**
- Declining an order is final — the order moves to `CANCELLED` and cannot be recovered.
- The buyer is automatically notified via the `order.seller_declined` notification. Their payment hold is released or COD commitment is freed immediately. No seller follow-up is needed.
- If the seller sees an error saying the order is already in an invalid state, refresh the order detail — the order may have been auto-confirmed or auto-declined by the system during the time between loading and acting.
