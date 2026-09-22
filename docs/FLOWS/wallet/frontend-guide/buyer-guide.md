# Buyer Guide — Wallet Service

> Mirrors: docs/FLOWS/wallet/user-flow/buyer-flows.md
> Verification status: Partially Verified
> Last updated: September 2026

## Overview

This guide is for frontend developers implementing the wallet UI for buyers. It covers three flows: checking the wallet balance, displaying the COD commitment hold lifecycle, and viewing transaction history. The transaction history endpoint is also the recommended fallback for payment status when the payment GET endpoints are unavailable (see Known Gap in the payment guide).

> ⚠️ **CRITICAL — availableBalance:** Always show `availableBalance` as the buyer's spendable amount, not raw `balance`. The `availableBalance` field equals `balance − frozenAmount` and represents what the buyer can actually spend. Never show `balance` as spendable when `frozenAmount > 0`.

---

## Flow 1: Check Wallet Balance

**User Goal:** Know how much they can spend from their wallet.

**UI States to Handle:**

| State | What User Sees | UI Treatment |
|---|---|---|
| Loading | Balance loading | Skeleton placeholder matching the balance card layout |
| Success | Available balance in TZS | Show `availableBalance` prominently as the main balance figure. Show `frozenAmount` separately only if > 0. |
| Error | Failed to load balance | "Unable to load your balance. Please try again." + retry button |

**Actions the User Can Take:**

**Load wallet balance:**
- What the user sees: Wallet screen or checkout summary showing their wallet balance
- What they click/tap: Screen loads automatically on navigation
- API call: `GET /api/wallet/balance`
- Auth: Bearer JWT (buyer role)
- Request body: none
- Success response: `200 { balance, frozenAmount, availableBalance, currency: "TZS" }`
- Success handling:
  - Show `availableBalance` as the main balance: "Available: TZS {availableBalance}"
  - If `frozenAmount > 0`, show a secondary line: "On hold: TZS {frozenAmount}"
  - Do not show `balance` as the primary figure — it includes frozen funds that cannot be spent
- Error handling: See error code table below.

**Balance display rules:**

| Field | When to show | Label |
|---|---|---|
| `availableBalance` | Always | "Available balance" (primary) |
| `frozenAmount` | Only when > 0 | "On hold" |
| `balance` | Never show as spendable | — (internal/debug only) |
| `currency` | Always alongside amounts | "TZS" |

**Error Code Table:**

| HTTP Status | Error Code | User-Facing Message | Retry? |
|---|---|---|---|
| 401 | UNAUTHORIZED | "Please log in again." | Yes — re-authenticate |
| 404 | WALLET_NOT_FOUND | "Your wallet is being set up. Please try again in a moment." | Yes — retry shortly |
| 5xx | — | "Unable to load your balance. Please try again." | Yes — retry after delay |

**What the User Should Understand at Every Stage:**
- The available balance is the amount they can spend right now. Frozen amounts are reserved for active orders or COD commitments and will be released or settled when those orders resolve.
- The wallet is created automatically when they register — they do not need to do anything to set it up.
- If a COD hold is active, the "On hold" line explains why their available balance is lower than expected.

---

## Flow 2: COD Commitment Hold Display

**User Goal:** Understand the status of their COD payment commitment for an active order.

> **Note:** This is not a buyer-initiated flow. The hold is placed automatically when the buyer places a COD order and is managed by the system throughout the order lifecycle. This section documents what the buyer-facing UI should show at each stage.

**UI States to Handle:**

| State | What User Sees | UI Treatment |
|---|---|---|
| Hold active | COD hold indicator | "COD hold: TZS {amount} active — will be released on delivery or cancellation" |
| Hold captured (delivered) | Payment settled | "Payment confirmed — TZS {amount} paid on delivery" |
| Hold released (cancelled) | Refund indicator | "Refunded — TZS {amount} returned to your available balance" |

**Actions the User Can Take:**

There are no buyer actions for the COD hold lifecycle — it is fully event-driven. The UI reflects the current hold state derived from the wallet balance response and order status.

**COD hold lifecycle state mapping:**

| Wallet Hold State | Internal Label | User-Facing Message |
|---|---|---|
| Hold placed (active) | `HoldPlaced` | "COD hold active — TZS {amount} reserved for this order" |
| Delivery confirmed | `HoldCaptured` | "Payment confirmed — TZS {amount} paid on delivery" |
| Order cancelled | `HoldReleased` | "Refunded — TZS {amount} returned to your available balance" |

**How to derive hold state in the UI:**
- `HoldPlaced` (active): `frozenAmount > 0` on the wallet balance response; order status is `PENDING`, `CONFIRMED`, `PROCESSING`, or `SHIPPED`
- `HoldCaptured` (settled): `frozenAmount` has decreased and order status is `DELIVERED` or `COMPLETED`
- `HoldReleased` (refunded): `frozenAmount` has decreased and order status is `CANCELLED` or `REFUNDED`

**What the User Should Understand at Every Stage:**
- While the hold is active, the frozen amount is safe in their wallet — it is not gone, just reserved.
- On delivery: the reserved amount is charged as the COD payment. The seller receives the payment after delivery confirmation.
- On cancellation: the hold is released immediately. Their available balance returns to normal with no deduction.
- The wallet statement (Flow 3) shows the full transaction history for each hold event.

---

## Flow 3: View Transaction History

**User Goal:** Review their wallet activity and verify payments when payment status screens are unavailable.

**UI States to Handle:**

| State | What User Sees | UI Treatment |
|---|---|---|
| Loading | Transactions loading | Skeleton list of transaction rows |
| List with transactions | Paginated transaction list | Render each transaction with type label, amount, date, and description |
| Empty | No transactions | "No transactions yet." — shown when the wallet exists but has no activity |
| Error | Failed to load | "Something went wrong. Please try again." + retry button |

**Actions the User Can Take:**

**Load transaction history:**
- What the user sees: Wallet activity screen with optional date range filter
- What they click/tap: Screen loads automatically; user may adjust date range filter or paginate
- API call: `GET /api/wallet/statement?page=&limit=`
- Auth: Bearer JWT (buyer role)
- Query parameters:

  | Parameter | Type | Notes |
  |---|---|---|
  | `from` | ISO 8601 date | Optional — start of date range |
  | `to` | ISO 8601 date | Optional — end of date range |
  | `page` | integer | Default: 1 |
  | `limit` | integer | Default: 20 |

- Success response: `200 { transactions: [...], total, page, limit }`
- Success handling: Render transactions as a list. Show type, amount (credit = positive, debit = negative), and date. Use the transaction type label mapping below.
- Error handling: See error code table below.

**Transaction type display mapping:**

| Transaction Type | User-Facing Label | Display |
|---|---|---|
| `CREDIT` | "Received" | Green / positive amount |
| `DEBIT` | "Payment" | Red / negative amount |
| `FREEZE` | "Hold placed" | Amber / neutral |
| `UNFREEZE` | "Hold released" | Green / positive |
| `DEBIT_FROZEN` | "Payment settled" | Red / negative amount |
| `REFUND` | "Refunded" | Green / positive amount |

**Payment history fallback:**

> ⚠️ **Payment status fallback:** When `GET /api/payment/payments/:paymentId` and related endpoints are unavailable (returning 500 as of September 2026), use the wallet statement as the source for payment activity. Filter by transaction type `DEBIT` or `DEBIT_FROZEN` to show the buyer their payment history. Each `DEBIT` represents a wallet payment; each `DEBIT_FROZEN` represents a COD delivery settlement.

**Error Code Table:**

| HTTP Status | Error Code | User-Facing Message | Retry? |
|---|---|---|---|
| 400 | VALIDATION_ERROR | "Invalid date range. Please check your filters." | Yes — fix input |
| 401 | UNAUTHORIZED | "Please log in again." | Yes — re-authenticate |
| 5xx | — | "Something went wrong. Please try again." | Yes — retry after delay |

**What the User Should Understand at Every Stage:**
- The transaction history shows every wallet event: payments made, refunds received, holds placed and released.
- An empty list means no wallet activity yet — this is normal for a new account.
- The date range filter applies to when the transaction occurred. To find a recent payment, use a recent `from` date.
- If the payment details page is unavailable, this screen is the most reliable way to verify that a wallet payment went through.
