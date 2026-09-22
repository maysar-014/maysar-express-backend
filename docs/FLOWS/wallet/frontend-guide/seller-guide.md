# Seller Guide — Wallet Service

> Mirrors: docs/FLOWS/wallet/user-flow/seller-flows.md
> Verification status: Partially Verified
> Last updated: September 2026

## Overview

This guide is for frontend developers implementing the wallet UI for sellers. It covers three flows: viewing wallet balance, receiving order payment credits from COD settlement (event-driven), and viewing the earnings statement. The seller wallet accumulates credits from order settlements and is drawn down by payout requests.

> ⚠️ **CRITICAL — availableBalance:** Always show `availableBalance` as the seller's spendable/withdrawable amount, not raw `balance`. The `availableBalance` field equals `balance − frozenAmount`.

---

## Flow 1: View Wallet Balance

**User Goal:** Know how much they have available to withdraw or spend.

**UI States to Handle:**

| State | What User Sees | UI Treatment |
|---|---|---|
| Loading | Balance loading | Skeleton placeholder matching the balance card layout |
| Success | Available balance in TZS | Show `availableBalance` prominently. Show `frozenAmount` if > 0 with "On hold" label. |
| Error | Failed to load | "Unable to load your balance. Please try again." + retry button |

**Actions the User Can Take:**

**Load wallet balance:**
- What the seller sees: Earnings or wallet screen showing their current balance
- What they click/tap: Screen loads automatically on navigation
- API call: `GET /api/wallet/balance`
- Auth: Bearer JWT (seller role)
- Request body: none
- Success response: `200 { balance, frozenAmount, availableBalance, currency: "TZS" }`
- Success handling:
  - Show `availableBalance` as the primary balance figure: "Available: TZS {availableBalance}"
  - If `frozenAmount > 0`, show: "On hold: TZS {frozenAmount}"
  - Never show `balance` as the withdrawable amount when `frozenAmount > 0`
- Error handling: See error code table below.

**Balance display rules:**

| Field | When to show | Label |
|---|---|---|
| `availableBalance` | Always | "Available balance" (primary) |
| `frozenAmount` | Only when > 0 | "On hold" |
| `currency` | Always | "TZS" |

**Error Code Table:**

| HTTP Status | Error Code | User-Facing Message | Retry? |
|---|---|---|---|
| 401 | UNAUTHORIZED | "Please log in again." | Yes — re-authenticate |
| 404 | WALLET_NOT_FOUND | "Your wallet is being set up. Please try again in a moment." | Yes — retry shortly |
| 5xx | — | "Unable to load your balance. Please try again." | Yes — retry after delay |

**What the Seller Should Understand at Every Stage:**
- The available balance is what can be withdrawn via payout. Frozen amounts may reflect pending payout reservations.
- Balance increases automatically as order settlements are credited. No seller action is needed to receive payment from COD deliveries.

---

## Flow 2: COD Settlement (Event-Driven)

**User Goal:** Understand when and why their wallet balance increases after a COD delivery.

> **Note:** This is not a seller-initiated flow. The seller receives a credit automatically when a COD order is delivered and confirmed by the courier. The UI should surface this as a notification and a wallet balance update.

**UI States to Handle:**

| State | What User Sees | UI Treatment |
|---|---|---|
| Settlement received | Balance increased | Push notification: "Payment received for order ORD-XXXXX". Wallet balance reflects the new credit on next load. |
| Statement entry | Settlement line in statement | Show as a `CREDIT` transaction in the earnings statement with the order reference |

**Actions the User Can Take:**

No seller action is required for COD settlement. The flow is triggered automatically by the `Delivery.Success.v1` event after the courier confirms delivery and verifies the COD OTP.

**Settlement notification:**
- When the wallet is credited via a COD settlement, the notification-service sends a `wallet.credited` event.
- Show the seller a push notification: "Payment received for order ORD-{orderId}" with the settlement amount.
- On notification tap: navigate to the wallet statement filtered to recent `CREDIT` transactions.

**Settlement timeline:**
1. Courier confirms delivery and verifies COD OTP
2. `Delivery.Success.v1` event triggers `CODSettlementSaga` in wallet-service
3. Buyer's frozen hold is captured; seller wallet is credited
4. `wallet.credited` event published → notification sent to seller
5. Seller's `availableBalance` increases (visible on next balance fetch)

**What the Seller Should Understand at Every Stage:**
- Payment for COD orders arrives after the courier confirms delivery — not when the order is placed.
- The settlement amount is the order amount minus platform commission and applicable fees. The exact breakdown is visible in the earnings statement.
- If the balance does not increase after a known delivery, the seller should check the statement for the `CREDIT` transaction before contacting support.

---

## Flow 3: View Earnings Statement

**User Goal:** Review a detailed history of earnings, settlements, payouts, and fees.

**UI States to Handle:**

| State | What User Sees | UI Treatment |
|---|---|---|
| Loading | Statement loading | Skeleton list of transaction rows |
| List with transactions | Paginated transaction list | Render each transaction with type label, amount, date, and order reference where available |
| Empty | No transactions | "No transactions yet." |
| Error | Failed to load | "Something went wrong. Please try again." + retry button |

**Actions the User Can Take:**

**Load earnings statement:**
- What the seller sees: Earnings statement screen with optional date range filter
- What they click/tap: Screen loads automatically; user may adjust filters or paginate
- API call: `GET /api/wallet/statement?page=&limit=`
- Auth: Bearer JWT (seller role)
- Query parameters:

  | Parameter | Type | Notes |
  |---|---|---|
  | `from` | ISO 8601 date | Optional — start of date range |
  | `to` | ISO 8601 date | Optional — end of date range |
  | `page` | integer | Default: 1 |
  | `limit` | integer | Default: 20 |

- Success response: `200 { transactions: [...], total, page, limit }`
- Success handling: Render transactions as a list. Credits are earnings; debits are payouts or fees. Use the transaction type display mapping below.
- Error handling: See error code table below.

**Transaction type display mapping for sellers:**

| Transaction Type | User-Facing Label | Display |
|---|---|---|
| `CREDIT` | "Order payment received" | Green / positive amount |
| `DEBIT` | "Fee or deduction" | Red / negative amount |
| `PAYOUT` | "Payout disbursed" | Red / negative amount |
| `REFUND` | "Refund reversed" | Red / negative amount |

**Error Code Table:**

| HTTP Status | Error Code | User-Facing Message | Retry? |
|---|---|---|---|
| 400 | VALIDATION_ERROR | "Invalid date range. Please check your filters." | Yes — fix input |
| 401 | UNAUTHORIZED | "Please log in again." | Yes — re-authenticate |
| 5xx | — | "Something went wrong. Please try again." | Yes — retry after delay |

**What the Seller Should Understand at Every Stage:**
- Each `CREDIT` entry corresponds to an order settlement. The order reference (if included in the transaction metadata) links to the specific order.
- `PAYOUT` entries record disbursements to their mobile money or bank account. See `docs/FLOWS/payout/frontend-guide/seller-guide.md` for the payout flow.
- An empty statement is normal for a new seller who has not yet received or dispatched any orders.
