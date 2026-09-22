# Buyer Guide — Logistics Service

> Mirrors: docs/FLOWS/logistics/user-flow/buyer-flows.md
> Verification status: Mixed (Verified for quote/fulfillment-options/COD; Partially Verified for delivery tracking)
> Last updated: September 2026

## Overview

This guide is for frontend developers implementing the logistics UI for buyers. It covers four flows: getting a shipping quote before checkout, browsing multi-seller fulfillment options, tracking a delivery, and the buyer-side experience of COD OTP confirmation. For the courier side of COD, see `docs/FLOWS/logistics/frontend-guide/courier-guide.md`.

---

## Flow 1: Get Shipping Quote

**User Goal:** Get a shipping price estimate before confirming checkout.

**UI States to Handle:**

| State | What User Sees | UI Treatment |
|---|---|---|
| Loading | "Calculating shipping cost…" | Spinner or skeleton price block |
| Success | Shipping cost in TZS | Render `shippingCostTzs` from quote response |
| Delivery Unavailable | Delivery not available notice | Error message with no retry option for this address |
| Expired (later, at checkout) | Quote expired notice | "Your shipping quote has expired. Please get a new quote." + button to re-quote |
| Consumed (later, at checkout) | Quote already used notice | "This shipping quote has already been used. Please get a new quote." + button to re-quote |
| Error | Generic error | Error message + retry |

**Actions the User Can Take:**

**Request a quote:**
- What the user sees before acting: Cart review screen with delivery address and item list. Shipping cost shows as "Calculating…"
- What they click/tap: Page loads automatically, or "Get shipping estimate" button
- API call: `POST /api/logistics/v1/quote`
  ```json
  {
    "fromAddress": { "lat": 0.0, "lng": 0.0 },
    "toAddress": { "lat": 0.0, "lng": 0.0 },
    "items": [{ "weight": 0, "dimensions": {} }]
  }
  ```
- Success response handling: Read `shippingCostTzs` from the response and display it. Store `quoteId` — it **must** be passed to the checkout confirm call. **Never** display a shipping cost from any source other than this response field.
- Error response handling: See error code table below.

> ⚠️ **CRITICAL — shippingCostTzs:** The displayed shipping cost must always come from `shippingCostTzs` in the quote response. Never derive, calculate, or allow the user to edit this value. Never pass a shipping cost value in the checkout confirm request body — the server reads it from the quote record.

> ⚠️ **CRITICAL — quoteId:** Store the `quoteId` returned in the quote response. This ID must be included in the checkout confirm request. Do not pass any monetary value from this response into the confirm request body.

**Error Code Table:**

| HTTP Status | Error Code | User-Facing Message | Retry? |
|---|---|---|---|
| 400 | VALIDATION_ERROR | "Please check your delivery address and try again." | Yes — correct input |
| 401 | UNAUTHORIZED | "Please log in again." | Yes — re-authenticate |
| 422 | DELIVERY_UNAVAILABLE | "Delivery is not available for this address." | No — address not serviceable |
| 422 | NO_ELIGIBLE_VEHICLE | "Delivery is not possible for your order size. Please contact support." | No |
| 5xx | — | "Something went wrong. Please try again." | Yes — retry after delay |

**What the User Should Understand at Every Stage:**
- While loading: the app is checking courier coverage and calculating cost for their specific route.
- On success: the price shown is locked for a limited time (TTL from `ttlSeconds`). They should confirm checkout before the quote expires.
- On DELIVERY_UNAVAILABLE: delivery cannot be arranged to this address. They may need to change the delivery address or contact support.
- If the quote expires before they confirm checkout: a new quote is needed. Surface the expiry gracefully at the checkout confirm step — do not silently fail.

---

## Flow 2: Fulfillment Options

**User Goal:** See delivery options for a multi-seller cart and select one before checkout.

**UI States to Handle:**

| State | What User Sees | UI Treatment |
|---|---|---|
| Loading | Options loading | Skeleton list of option cards |
| Success | Ranked list of fulfillment options | Render each option from `options[]` with `buyerPriceTzs` |
| Empty | No options available | "No delivery options available for your cart. Please try adjusting your cart." |
| Error | Failed to load options | Error message + retry |

**Actions the User Can Take:**

**Load fulfillment options:**
- What the user sees before acting: Multi-seller cart summary screen, options loading automatically
- What they click/tap: Auto-load on screen entry, or "Refresh options" on error
- API call: `POST /api/logistics/v1/fulfillment-options`
  ```json
  {
    "items": [{ "sellerId": "string", "weight": 0, "dimensions": {} }],
    "deliveryAddress": { "lat": 0.0, "lng": 0.0 }
  }
  ```
- Success response handling: Render options from `options[]` only. Show `buyerPriceTzs` for each option. If `options[]` is empty, show the empty state message — do not attempt to show items from `exclusions[]` or `fairnessExcluded[]`.
- Error response handling: See error code table below.

> ⚠️ **CRITICAL — what to show:** Only show items from the `options[]` array. Never expose `exclusions[]` or `fairnessExcluded[]` to users — these contain internal feasibility and fairness data.

> ⚠️ **CRITICAL — money fields:** Only display `buyerPriceTzs` to the user. Never show `driverCompensationTzs`, `maysarMarginTzs`, or `fulfillmentCostTzs`. These are internal fields and must not be rendered in any buyer-facing UI.

**Select an option:**
- What the user sees: List of ranked options, each showing delivery description and `buyerPriceTzs`
- What they click/tap: "Select" button on their preferred option
- No API call at selection time — selected option is stored in UI state and passed to checkout

**Error Code Table:**

| HTTP Status | Error Code | User-Facing Message | Retry? |
|---|---|---|---|
| 400 | VALIDATION_ERROR | "Please check your cart items and try again." | Yes — correct input |
| 401 | UNAUTHORIZED | "Please log in again." | Yes — re-authenticate |
| 422 | DELIVERY_UNAVAILABLE | "Delivery is not available for your address." | No — address not serviceable |
| 5xx | — | "Something went wrong. Please try again." | Yes — retry after delay |

**What the User Should Understand at Every Stage:**
- While loading: the system is checking which delivery arrangements are feasible for all sellers in their cart.
- On success with options: ranked best-to-worst for the buyer; `buyerPriceTzs` is what they will pay for shipping.
- On empty `options[]`: no feasible delivery plan could be constructed for this cart configuration. Adjusting quantities, removing items, or changing the delivery address may help.

---

## Flow 3: Delivery Status Tracking

**User Goal:** See where their order is and when it will arrive.

**UI States to Handle:**

| State | What User Sees | UI Treatment |
|---|---|---|
| Loading | Status loading | Skeleton status bar |
| Active delivery | Buyer-facing status label + courier info | Progress indicator with current step highlighted |
| Delivered | "Delivered ✓" | Completion state with delivery confirmation |
| Cancelled | "Order cancelled" | Neutral terminated state with refund info link |
| Failed | "Delivery failed — contact support" | Error state with link to support ticket creation |
| Error | Status unavailable | "Unable to load delivery status. Please try again." + retry |

**Actions the User Can Take:**

**Check delivery status:**
- What the user sees before acting: Order detail screen with delivery tracking section
- What they click/tap: Auto-load on screen entry; pull-to-refresh to update
- API call: `GET /api/logistics/api/v1/deliveries/:deliveryId`
- Auth: Bearer JWT
- Success response handling: Read the `status` field and map to the buyer-facing label table below. Never display the raw status string.
- Error response handling: See error code table below.

**Delivery Status → Buyer-Facing Label Mapping:**

| Raw Status | Buyer-Facing Label |
|---|---|
| `pending` | Order placed |
| `assigned` | Courier assigned |
| `picked_up` | Picked up |
| `in_transit` | On the way |
| `out_for_delivery` | Out for delivery |
| `delivered` | Delivered |
| `cancelled` | Order cancelled |
| `failed` | Delivery failed — contact support |

> ⚠️ **CRITICAL:** Never show raw status strings to users. Always map through this table before rendering.

**Error Code Table:**

| HTTP Status | Error Code | User-Facing Message | Retry? |
|---|---|---|---|
| 400 | VALIDATION_ERROR | "Please check your request and try again." | Yes — correct input |
| 401 | UNAUTHORIZED | "Please log in again." | Yes — re-authenticate |
| 404 | RESOURCE_NOT_FOUND | "Delivery information not found." | No — check order details |
| 5xx | — | "Unable to load delivery status. Please try again." | Yes — retry after delay |

**What the User Should Understand at Every Stage:**
- Pending / Assigned: the order has been placed and a courier will be assigned. Encourage them to keep their phone nearby.
- Picked up / In transit / Out for delivery: live progression. If the buyer has a COD order, remind them to have their OTP ready when the status reaches "Out for delivery".
- Delivered: final state. Show delivery confirmation with timestamp.
- Failed: something prevented delivery. Surface a direct link to open a support ticket.

---

## Flow 4: COD OTP — Buyer Side

**User Goal:** Confirm a COD delivery by sharing an OTP with the courier.

**UI States to Handle:**

| State | What User Sees | UI Treatment |
|---|---|---|
| Awaiting delivery | Delivery tracking, COD reminder | Banner: "Have your code ready to share with your courier when they arrive." |
| OTP received | OTP notification on phone | System notification: "Share this code with your courier: XXXXXX" |
| Courier verifying | Waiting for courier to enter OTP | In-app message: "Your courier is verifying the delivery. Please have your code ready." |
| Delivered | Status updates to "Delivered" | Delivery confirmed state |
| OTP not received | Buyer taps "Didn't receive a code?" | Show: "Didn't receive a code? Ask your courier to resend it." |

**Actions the User Can Take:**

The buyer does not call any API endpoints in this flow. The OTP is delivered via push notification or SMS by the system when the delivery reaches `out_for_delivery` state. The buyer's only action is sharing the displayed OTP verbally with the courier.

**What the buyer sees:**
- Push/SMS notification arrives with OTP: display format is "Share this code with your courier: XXXXXX"
- While courier is entering the OTP: in-app message "Your courier is verifying the delivery. Please have your code ready."
- After successful verification: delivery status updates to "Delivered" via the tracking flow

**If the buyer does not receive an OTP:**
- Show a prompt: "Didn't receive a code? Ask your courier to resend it."
- The courier can request a new OTP from their app via `POST /api/logistics/v1/cod/:deliveryId/otp`
- If the problem persists, direct the buyer to support

**What the User Should Understand at Every Stage:**
- At `out_for_delivery`: a code has been (or will shortly be) sent to their registered phone. They need to share it verbally — the courier cannot confirm the delivery without it.
- During verification: they do not need to do anything further; the courier is completing the verification on their device.
- On completion: once the courier verifies the OTP, the delivery is confirmed and funds are released to the seller. The buyer receives a delivery confirmation notification.

**Error Code Table (for reference — these errors are courier-facing, but buyers may see resulting status changes):**

| HTTP Status | Error Code | User-Facing Message | Retry? |
|---|---|---|---|
| 400 | VALIDATION_ERROR | "Please check your request." | Yes |
| 401 | UNAUTHORIZED | "Please log in again." | Yes — re-authenticate |
| 404 | RESOURCE_NOT_FOUND | "Delivery not found." | No |
| 422 | DELIVERY_UNAVAILABLE | "Delivery is not available." | No |
| 422 | QUOTE_EXPIRED | "Your shipping quote has expired. Please get a new quote." | Yes — re-quote |
| 422 | QUOTE_CONSUMED | "This shipping quote has already been used. Please get a new quote." | Yes — re-quote |
| 5xx | — | "Something went wrong. Please try again." | Yes — retry after delay |
