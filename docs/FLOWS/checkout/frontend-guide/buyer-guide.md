# Buyer Guide — Checkout Service

> Mirrors: docs/FLOWS/checkout/user-flow/buyer-flows.md
> Verification status: Partially Verified (confirm flow and session status Verified at data-level; cart surface contract-verified at the canonical `/api/checkout/cart/*` paths — live re-verification pending)
> Last updated: September 2026

## Overview

This guide is for frontend developers implementing the checkout UI for buyers. It covers two operational flows: confirming a checkout session to place an order, and checking the current status of a checkout session. Cart manipulation is served under the canonical `/api/checkout/cart/*` prefix — see the conflict note below for the legacy paths that must not be called.

> ⚠️ **405 Conflict Note — legacy paths (DEF-005):** The following endpoints were never mounted and must not be called (September 2026 live sweep: **405 Method Not Allowed** for each):
> - `POST /api/checkout/items`
> - `PATCH /api/checkout/items`
> - `DELETE /api/checkout/items`
> - `POST /api/checkout/merge`
> - `DELETE /api/checkout/{cartId}`
>
> Use the canonical cart surface instead — it is mounted and contract-tested: `POST|PATCH|DELETE /api/checkout/cart/items`, `POST /api/checkout/cart/merge`, `GET /api/checkout/cart/current`, `GET|DELETE /api/checkout/cart/{cartId}`. Checkout confirmation (`POST /api/checkout/{id}/confirm`) and session status (`GET /api/checkout/{id}`) work as documented below.

---

## Flow 1: Checkout Confirmation

**User Goal:** Complete their order by confirming the checkout session.

**UI States to Handle:**

| State | What User Sees | UI Treatment |
|---|---|---|
| Ready to confirm | Order summary with "Confirm Order" button | Button enabled; order details shown |
| Loading | "Placing your order…" | Button disabled immediately on tap; spinner or progress indicator |
| Confirming (in-process chain) | "Placing your order…" | Keep button disabled; do not show partial success |
| Success | "Order confirmed ✓" | Navigate to order detail screen using returned `orderId` |
| Session not found | Session expired message | "Your checkout session has expired. Please start again." + restart button |
| Quote expired | Quote expired message | "Your shipping quote has expired. Please get a new quote." + re-quote button |
| Quote consumed | Quote already used message | "This quote has already been used. Please get a new quote." + re-quote button |
| COD not eligible | COD unavailable message | "COD is not available for your current trust level. Please choose a different payment method." |
| Payment failed | Payment failure message | "Payment failed. Please check your details and try again." |
| Insufficient stock | Stock unavailable message | "Some items in your cart are no longer available." + prompt to update cart |
| Network timeout | Uncertain state | Do NOT show failure. Check session status before deciding (see Flow 2). |

**Actions the User Can Take:**

**Confirm order:**
- What the user sees before acting: Order review screen showing items, delivery address, shipping cost (from quote), and payment method
- What they click/tap: "Confirm Order" button
- API call: `POST /api/checkout/{id}/confirm`
- Auth: Bearer JWT
- Request body: session ID is in the path — do not pass `shippingCost` in the body
- Success response: `201 { orderId, status: "confirmed" }`
- Success handling: navigate to order detail using `orderId`
- Error handling: See error code table below

> ⚠️ **CRITICAL — Idempotency:** Disable the confirm button **immediately after the first tap**. Do not re-enable it until a terminal response (success or error) is received. The server handles double-submit safely (same `orderId` returned), but the UI must prevent duplicate submissions.
>
> Do not treat a network timeout as a failure. The order may have already been created. Always check session status (`GET /api/checkout/{id}`) before showing a failure message or prompting the user to retry. If the session is `CONFIRMED`, the order was created successfully — navigate to the order detail using `orderId`.

> ⚠️ **CRITICAL — shippingCost:** Never pass a `shippingCost` value in the confirm request body. The server reads the shipping cost from the validated quote record. Any client-supplied shipping cost is ignored. The value to display to the user comes from `shippingCostTzs` in the quote response (obtained earlier in the flow via the logistics service).

**Error Code Table:**

| HTTP Status | Error Code | User-Facing Message | Retry? |
|---|---|---|---|
| 400 | VALIDATION_ERROR | "Please check your order details and try again." | Yes — correct input |
| 401 | UNAUTHORIZED | "Please log in again." | Yes — re-authenticate |
| 404 | SESSION_NOT_FOUND | "Your checkout session has expired. Please start again." | No — restart checkout |
| 409 | QUOTE_ALREADY_CONSUMED | "This quote has already been used. Please get a new quote." | No — re-quote |
| 422 | QUOTE_EXPIRED | "Your shipping quote has expired. Please get a new quote." | No — re-quote |
| 422 | COD_NOT_ELIGIBLE | "COD is not available for your current trust level. Please choose a different payment method." | No — change payment method |
| 402 | PAYMENT_FAILED | "Payment failed. Please check your details and try again." | Yes — update payment details |
| 422 | PAYMENT_FAILED | "Payment failed. Please check your details and try again." | Yes — update payment details |
| 422 | INSUFFICIENT_STOCK | "Some items in your cart are no longer available." | No — update cart |
| 5xx | — | "Something went wrong. Please try again in a moment." | Yes — check session status first |

**What the User Should Understand at Every Stage:**
- Before confirming: the shipping cost shown is from a time-limited quote. Confirm before it expires.
- While loading: the order is being created — this involves several steps server-side. Keep the button disabled. Do not show intermediate states.
- On success: the order is placed. Navigate to the order detail screen immediately.
- On network timeout: do not show a failure message. Check session status first (Flow 2). If confirmed, navigate to the order. If still active, allow a retry.
- On INSUFFICIENT_STOCK: some items became unavailable between cart and confirm. The buyer must update their cart and re-initiate checkout.

---

## Flow 2: Session Status Check

**User Goal:** Verify the current state of their checkout session, especially after a network disruption or timeout.

**UI States to Handle:**

| Session Status | What User Sees | UI Treatment |
|---|---|---|
| `ACTIVE` | Continue checkout | Re-enable the confirm button; session is valid |
| `CONFIRMED` | Order already placed | Navigate to order detail using `orderId` from the response |
| `EXPIRED` | Session expired | "Your checkout session has expired. Please start again." + restart button |
| `ABANDONED` | Session abandoned | "Your checkout session has expired. Please start again." + restart button |
| 404 | Session not found | "Your checkout session is no longer available. Please start again." |
| Loading | Status checking | Spinner or skeleton state |

**Actions the User Can Take:**

**Check session status:**
- What the user sees: Usually triggered automatically after a timeout or navigation event; can be a "Check order status" action on an uncertain result screen
- What they click/tap: Auto-triggered, or "Check order status" button
- API call: `GET /api/checkout/{id}`
- Auth: Bearer JWT
- Success response: `200 { sessionId, status, buyerId, expiresAt, orderId? }`
- Handling:
  - `ACTIVE`: the session is still valid — allow the user to confirm or continue
  - `CONFIRMED`: the order was placed — read `orderId` from the response and navigate to the order detail screen
  - `EXPIRED` or `ABANDONED`: the session is no longer usable — prompt the user to restart checkout

**Error Code Table:**

| HTTP Status | Error Code | User-Facing Message | Retry? |
|---|---|---|---|
| 401 | UNAUTHORIZED | "Please log in again." | Yes — re-authenticate |
| 403 | FORBIDDEN | "You do not have access to this session." | No |
| 404 | RESOURCE_NOT_FOUND | "Your checkout session is no longer available. Please start again." | No — restart checkout |
| 5xx | — | "Something went wrong. Please try again." | Yes — retry after delay |

**What the User Should Understand at Every Stage:**
- This check is primarily useful after a network timeout during the confirm step.
- If status is `CONFIRMED`, the order was successfully placed even if the original confirm response was not received. No retry is needed.
- If status is `ACTIVE`, the order was not yet placed and the user can try again.
- If status is `EXPIRED` or `ABANDONED`, a fresh checkout session is needed.
