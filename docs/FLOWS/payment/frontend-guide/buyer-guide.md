# Buyer Guide — Payment Service

> Mirrors: docs/FLOWS/payment/user-flow/buyer-flows.md
> Verification status: Mixed — POST initiate endpoints Partially Verified; GET payment status endpoints Verified (DEF-001 resolved)
> Last updated: September 2026

## Overview

This guide is for frontend developers implementing the payment UI for buyers. It covers three flows: initiating a mobile money or card payment, initiating a wallet payment, and the COD payment indicator shown at checkout. All write flows call `POST /api/payment/payments`. Payment confirmation is asynchronous for mobile money and card — a successful API response means the payment was initiated, not completed. Use order status from `GET /api/order/orders/:orderId` as the definitive payment confirmation indicator.

See the Known Gap section at the bottom of this guide before building any payment status or history screens.

---

## Flow 1: Initiate Mobile Money / Card Payment

**User Goal:** Pay for an order using a mobile money method (MPESA, AIRTEL_MONEY, MIXX_BY_YAS, HALOPESA) or card.

**UI States to Handle:**

| State | What User Sees | UI Treatment |
|---|---|---|
| Loading | "Processing payment…" | Loading spinner; disable the pay button and all payment method controls |
| Initiated (success) | "Processing your payment" | Show a pending/processing indicator. Do not show "payment complete" — payment is async. Direct the buyer to check their order status for confirmation. |
| Fraud declined | Payment declined | "Payment declined. Please try a different payment method." — show method selection again |
| Method disabled | Method unavailable | "This payment method is currently unavailable." — hide or grey-out the method in the selector |
| Provider unavailable | Provider down | "Payment provider temporarily unavailable. Please try again." + retry button |
| Error | Generic failure | "Something went wrong. Please try again." + retry |

**Actions the User Can Take:**

**Submit mobile money / card payment:**
- What the user sees: Checkout payment screen with available methods listed. Mobile money methods show a phone number input. Card shows card number / expiry / CVV fields.
- What they click/tap: "Pay" or "Confirm payment" button
- API call: `POST /api/payment/payments`
- Auth: Bearer JWT (buyer role)
- Request body (mobile money example):
  ```json
  {
    "orderId": "string",
    "method": "MPESA",
    "amount": 150000,
    "currency": "TZS",
    "accountDetails": {
      "phoneNumber": "+255712345678"
    }
  }
  ```
- Request body (card example):
  ```json
  {
    "orderId": "string",
    "method": "CARD",
    "amount": 150000,
    "currency": "TZS",
    "accountDetails": {
      "cardToken": "string"
    }
  }
  ```
- Success response: `201/202 { paymentId, status: "PENDING", method, amount }`
- Success handling: The payment has been initiated, not completed. Show a processing indicator with the message "Processing your payment." Do not show a success confirmation. Redirect the buyer to their order detail screen and explain that their order status will update once payment is confirmed. The order status is the authoritative indicator.
- Error handling: See error code table below.

> ⚠️ **Async payment:** A 201/202 response means the payment was queued with the provider — it does not mean the payment succeeded. The provider processes it asynchronously. Always tell the buyer to check their order status, not their payment status screen.

> ⚠️ **Fraud decline messaging:** If the payment is declined by the fraud engine (402 `PAYMENT_DECLINED`), show only: "Payment declined. Please try a different payment method." Do not attempt to explain the reason — the fraud engine does not expose decline reasons to the buyer.

**Method availability:**
- Before rendering payment method options, call `GET /api/payment/payment-methods` (if available) to check `available: true/false` for each method.
- Only show methods where `available: true`. Methods with `available: false` are disabled in the system and will return 422 `METHOD_DISABLED` if attempted.
- Grey out or hide unavailable methods rather than showing them as selectable.

**Error Code Table:**

| HTTP Status | Error Code | User-Facing Message | Retry? |
|---|---|---|---|
| 400 | METHOD_NOT_FOUND | "This payment method is not supported." | No — choose another method |
| 401 | UNAUTHORIZED | "Please log in again." | Yes — re-authenticate |
| 402 | PAYMENT_DECLINED | "Payment declined. Please try a different payment method." | No — try another method |
| 409 | DUPLICATE_PAYMENT | "A payment for this order has already been submitted." | No |
| 422 | METHOD_DISABLED | "This payment method is currently unavailable." | No — try another method |
| 503 | PROVIDER_UNAVAILABLE | "Payment provider temporarily unavailable. Please try again." | Yes — retry after delay |
| 503 | METHOD_MISCONFIGURED | "Payment provider temporarily unavailable. Please try again." | Yes — retry after delay |
| 5xx | — | "Something went wrong. Please try again." | Yes — retry after delay |

**What the User Should Understand at Every Stage:**
- While the loading spinner shows, the app is submitting the payment request to the mobile money or card provider.
- After a successful submission, the payment is being processed — this is not immediate confirmation. The buyer should watch for a push notification from their mobile money app.
- Their order status page is the best place to confirm that payment went through. A `CONFIRMED` or `PROCESSING` order status means the payment succeeded.
- If the payment is declined, they can try a different method. No explanation of the specific decline reason is provided.

---

## Flow 2: Wallet Payment

**User Goal:** Pay for an order by debiting the Maysar wallet balance instantly.

**UI States to Handle:**

| State | What User Sees | UI Treatment |
|---|---|---|
| Loading | "Processing payment…" | Loading spinner; disable pay button |
| Success | Order confirmed | Wallet payment is synchronous — on success, navigate to order confirmation screen. Show "Payment complete — order confirmed." |
| Insufficient balance | Balance too low | "Your wallet balance is insufficient. Please top up or choose a different payment method." — show current balance and top-up option |
| Method disabled | Wallet payment unavailable | "This payment method is currently unavailable." |
| Error | Payment failed | "Something went wrong. Please try again." + retry |

**Actions the User Can Take:**

**Submit wallet payment:**
- What the user sees: Checkout payment screen with wallet selected. Show the current `availableBalance` (fetched from `GET /api/wallet/balance`) so the buyer can confirm they have enough before paying.
- What they click/tap: "Pay with wallet" or "Confirm payment" button
- API call: `POST /api/payment/payments`
- Auth: Bearer JWT (buyer role)
- Request body:
  ```json
  {
    "orderId": "string",
    "method": "WALLET",
    "amount": 150000,
    "currency": "TZS"
  }
  ```
- Success response: `200/201 { paymentId, status: "COMPLETED", method: "WALLET", amount }`
- Success handling: Wallet payment is synchronous. A successful response means the debit has completed and the order is confirmed. Navigate to the order confirmation screen and show "Payment complete — order confirmed."
- Error handling: See error code table below.

**Wallet balance check before payment:**
- Always fetch `GET /api/wallet/balance` when the wallet option is selected to pre-populate the available balance display.
- Show: "Available balance: TZS {availableBalance}"
- Disable the pay button if `availableBalance < orderAmount`.
- Show a top-up prompt if the balance is insufficient: "Your wallet balance is insufficient. Please top up or choose a different payment method."

**Error Code Table:**

| HTTP Status | Error Code | User-Facing Message | Retry? |
|---|---|---|---|
| 401 | UNAUTHORIZED | "Please log in again." | Yes — re-authenticate |
| 402 | INSUFFICIENT_BALANCE | "Your wallet balance is insufficient. Please top up or choose a different payment method." | No — top up or switch method |
| 422 | METHOD_DISABLED | "This payment method is currently unavailable." | No — try another method |
| 422 | WALLET_NOT_ACTIVE | "Your wallet is currently inactive. Please contact support." | No |
| 422 | VELOCITY_LIMIT_EXCEEDED | "Payment limit exceeded. Please try again later." | No — wait |
| 5xx | — | "Something went wrong. Please try again." | Yes — retry after delay |

**What the User Should Understand at Every Stage:**
- Before paying, they can see exactly how much is in their wallet. The balance shown is `availableBalance` — the amount they can actually spend (excludes any frozen funds).
- Wallet payment completes immediately. Unlike mobile money, there is no waiting for a provider — the order is confirmed as soon as the button is tapped.
- If the balance is too low, they can top up their wallet or choose a different payment method.

---

## Flow 3: COD Payment Indicator

**User Goal:** Understand what "pay on delivery" means at checkout and whether they are eligible.

> **Note:** COD is not initiated via a direct API call at the payment step. It is handled internally during checkout confirm (`POST /api/checkout/{id}/confirm`). This section documents what the payment selection UI should show for COD.

**UI States to Handle:**

| State | What User Sees | UI Treatment |
|---|---|---|
| COD eligible | "Pay on delivery" option | Show COD as a selectable payment method. Display the current COD tier and the exposure limit available. |
| COD not eligible | COD not available | "COD is not available at your current trust level. You need more successful deliveries to unlock higher COD limits." — show the option as greyed out with this explanation |
| COD selected | COD indicator active | Show a "Pay on delivery" badge alongside the order summary. Explain the COD hold that will be placed. |

**Actions the User Can Take:**

**Select COD at checkout:**
- What the user sees: Payment method list includes a "Pay on delivery" option. If eligible, it shows the buyer's current COD tier and how much they can spend.
- What they click/tap: "Pay on delivery" option in the payment method list
- No API call at this step — COD is confirmed as part of `POST /api/checkout/{id}/confirm`
- After selection: Show a summary line: "A hold of TZS {orderAmount} will be placed on your wallet until delivery. No charge until you receive your order."

**COD eligibility display:**
- Derive eligibility from the checkout confirm error response (`COD_INELIGIBLE`) or pre-check from order/checkout service.
- Show the buyer's current COD tier if available (e.g., "NEW_BUYER: up to TZS 30,000").
- If ineligible: "COD is not available at your current trust level. You need more successful deliveries to unlock higher COD limits." Link to the COD trust tier explanation page.

**COD tier limits reference:**

| Trust Tier | Max Exposure | Max Concurrent Orders |
|---|---|---|
| NEW_BUYER | TZS 30,000 | 1 |
| TRUSTED_BEGINNER | TZS 150,000 | 2 |
| TRUSTED_BUYER | TZS 500,000 | 3 |
| GOLD_BUYER | TZS 2,000,000 | 5 |
| PLATINUM_BUYER | TZS 10,000,000 | Unlimited |

**Error Code Table:**

| HTTP Status | Error Code | User-Facing Message | Retry? |
|---|---|---|---|
| 422 | COD_INELIGIBLE | "COD is not available at your current trust level. You need more successful deliveries to unlock higher COD limits." | No — build trust tier |
| 422 | COD_COMMITMENT_LIMIT_EXCEEDED | "You have reached your COD limit. Complete your pending COD orders before placing a new one." | No — wait for active orders |
| 422 | COD_AREA_NOT_SUPPORTED | "Pay on delivery is not available for this delivery address." | No — switch method |

**What the User Should Understand at Every Stage:**
- Selecting COD reserves a hold on the wallet equal to the order amount. This is not a charge — the money stays in the buyer's wallet but is locked until delivery or cancellation.
- The hold is released automatically if the order is cancelled. The charge is settled on confirmed delivery when the courier verifies the COD OTP.
- COD availability depends on the buyer's trust tier, which improves with successful completed deliveries.

---

## ✅ Resolved — Payment Status Endpoints (DEF-001)

> ✅ **Resolved:** The following three endpoints previously returned **500 FAILING** in the September 2026 sweep. They can now be used to build payment status screens:
>
> - `GET /api/payment/payments/{id}` → 200 with the payment record · 404 when the id does not exist
> - `GET /api/payment/payments/{id}/status` → 200 with the status payload · 404 when the id does not exist
> - `GET /api/payment/payments/order/{orderId}` → 200 with the payment record · 404 when the order has no payment row
>
> **UI handling:**
> - Treat `404` from `GET /api/payment/payments/order/{orderId}` as "no payment-service record for this order" (orders paid by direct wallet debit never create one). Show the order status instead of an error.
> - **Ownership (DEF-012):** all three reads are owner-scoped. A request without a caller identity answers `401 UNAUTHORIZED` (checked before the lookup, so ids cannot be probed), and a payment that belongs to another user answers `403 FORBIDDEN` and never returns the record. Only read ids the buyer obtained from their own checkout; treat `401`/`403` as non-retryable.
> - **Payment confirmation:** Keep order status from `GET /api/order/orders/:orderId` as the authoritative signal. A `CONFIRMED` or `PROCESSING` order status reliably indicates that payment was accepted.
> - **Payment history:** Use wallet transaction history from `GET /api/wallet/statement`. Filter by transaction type `DEBIT` or `DEBIT_FROZEN` to show the buyer a record of payment activity.
>
> **Tracked in:** `docs/FLOWS/_verification/defect-register.md` (DEF-001, DEF-012).

**Error Code Table — full reference:**

| HTTP Status | Error Code | User-Facing Message | Retry? |
|---|---|---|---|
| 400 | METHOD_NOT_FOUND | "This payment method is not supported." | No |
| 400 | VALIDATION_ERROR | "Please check your payment details and try again." | Yes — fix input |
| 401 | UNAUTHORIZED | "Please log in again." | Yes — re-authenticate |
| 403 | FORBIDDEN | "You can only view your own payment details." | No — wrong account or record |
| 402 | PAYMENT_DECLINED | "Payment declined. Please try a different payment method." | No — try another method |
| 402 | INSUFFICIENT_BALANCE | "Your wallet balance is insufficient. Please top up or choose a different payment method." | No — top up or switch |
| 422 | METHOD_DISABLED | "This payment method is currently unavailable." | No — try another method |
| 422 | COD_INELIGIBLE | "COD is not available at your current trust level." | No — build trust tier |
| 503 | PROVIDER_UNAVAILABLE | "Payment provider temporarily unavailable. Please try again." | Yes — retry after delay |
| 5xx | — | "Something went wrong. Please try again." | Yes — retry after delay |
