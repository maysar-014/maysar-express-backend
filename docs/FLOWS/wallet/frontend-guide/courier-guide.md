# Courier Guide — Wallet Service

> Mirrors: docs/FLOWS/wallet/user-flow/courier-flows.md
> Verification status: Partially Verified
> Last updated: September 2026

## Overview

This guide is for frontend developers implementing the wallet UI for couriers. Couriers accumulate delivery earnings automatically via the `Delivery.Success.v1` event chain — no manual action is needed to receive payment. The wallet UI for couriers shows current earnings balance and a delivery-by-delivery statement. Payouts from accumulated earnings use the payout flow at `docs/FLOWS/payout/frontend-guide/courier-guide.md`.

> ⚠️ **CRITICAL — availableBalance:** Always show `availableBalance` as the courier's withdrawable amount, not raw `balance`. The `availableBalance` field equals `balance − frozenAmount`.

---

## Flow 1: Delivery Earnings (Event-Driven)

**User Goal:** Understand that earnings have been credited after a completed delivery.

> **Note:** This is not a courier-initiated flow. The credit is automatic and triggered by the `Delivery.Success.v1` event after a successful delivery. The courier UI should surface this as a notification and a balance update.

**UI States to Handle:**

| State | What User Sees | UI Treatment |
|---|---|---|
| Earnings credited | Balance increased | Push notification: "TZS {amount} earned for delivery DJB-{deliveryJobId}". Wallet balance updates on next load. |
| Statement entry | Earnings line in statement | Show as a `CREDIT` transaction in the statement with the delivery job reference |

**Actions the User Can Take:**

No courier action is needed to receive earnings. The credit is processed automatically when the delivery is confirmed.

**Earnings notification:**
- When wallet-service credits the courier wallet, a `wallet.credited` event is published.
- Show a push notification: "TZS {earningsAmount} earned for delivery DJB-{deliveryJobId}"
- On notification tap: navigate to the wallet statement filtered to recent `CREDIT` transactions.

**Earnings timeline:**
1. Courier completes delivery (COD: verifies OTP; non-COD: marks delivered)
2. `Delivery.Success.v1` event published by logistics-service
3. wallet-service credits courier wallet via `CreditWalletUseCase`
4. `wallet.credited` event published → notification sent to courier
5. Courier's `availableBalance` increases (visible on next balance fetch)

**What the Courier Should Understand at Every Stage:**
- Earnings arrive automatically after each completed delivery — no action is needed.
- The amount credited is the delivery earnings (`CARRIER_PAYABLE`) calculated by logistics-service based on distance, vehicle type, and route.
- If a delivery is completed but earnings do not appear, the courier should check the statement before contacting support — there may be a short processing delay.

---

## Flow 2: View Balance and Statement

**User Goal:** Check current earnings balance and review delivery-by-delivery earnings history.

**UI States to Handle:**

| State | What User Sees | UI Treatment |
|---|---|---|
| Loading (balance) | Balance loading | Skeleton placeholder matching the balance card |
| Success (balance) | Available balance | Show `availableBalance` as the primary figure. Show `frozenAmount` if > 0. |
| Loading (statement) | Statement loading | Skeleton list of transaction rows |
| Statement loaded | Paginated transaction list | Render each delivery earning as a `CREDIT` row with amount and delivery job reference |
| Empty (statement) | No transactions | "No earnings yet." |
| Error | Failed to load | "Something went wrong. Please try again." + retry button |

**Actions the User Can Take:**

**Check balance:**
- What the courier sees: Earnings screen showing their total available balance
- What they click/tap: Screen loads automatically on navigation
- API call: `GET /api/wallet/balance`
- Auth: Bearer JWT (courier role)
- Request body: none
- Success response: `200 { balance, frozenAmount, availableBalance, currency: "TZS" }`
- Success handling:
  - Show `availableBalance` as "Available earnings: TZS {availableBalance}"
  - If `frozenAmount > 0`, show: "On hold: TZS {frozenAmount}" (this may reflect a pending payout reservation)
- Error handling: See error code table below.

**View earnings statement:**
- What the courier sees: Statement list below the balance card, with optional date range filter
- What they click/tap: Screen loads automatically; user may filter by date or paginate
- API call: `GET /api/wallet/statement?page=&limit=`
- Auth: Bearer JWT (courier role)
- Query parameters:

  | Parameter | Type | Notes |
  |---|---|---|
  | `from` | ISO 8601 date | Optional — start of date range |
  | `to` | ISO 8601 date | Optional — end of date range |
  | `page` | integer | Default: 1 |
  | `limit` | integer | Default: 20 |

- Success response: `200 { transactions: [...], total, page, limit }`
- Success handling: Render transactions. Credits are delivery earnings; payouts are withdrawals.
- Error handling: See error code table below.

**Transaction type display mapping for couriers:**

| Transaction Type | User-Facing Label | Display |
|---|---|---|
| `CREDIT` | "Delivery earnings" | Green / positive amount |
| `PAYOUT` | "Payout withdrawn" | Red / negative amount |
| `DEBIT` | "Deduction" | Red / negative amount (platform-initiated, rare) |

**Error Code Table:**

| HTTP Status | Error Code | User-Facing Message | Retry? |
|---|---|---|---|
| 401 | UNAUTHORIZED | "Please log in again." | Yes — re-authenticate |
| 404 | WALLET_NOT_FOUND | "Your wallet is being set up. Please try again in a moment." | Yes — retry shortly |
| 400 | VALIDATION_ERROR | "Invalid date range. Please check your filters." | Yes — fix input |
| 5xx | — | "Something went wrong. Please try again." | Yes — retry after delay |

**What the Courier Should Understand at Every Stage:**
- The available balance reflects all earnings minus any pending payout reservations. This is the amount they can request as a payout.
- Each `CREDIT` entry in the statement corresponds to a completed delivery. The delivery job ID (DJB- prefix) links to the specific job.
- To withdraw earnings, couriers use the payout flow. KYC level 2 is required to initiate a payout. See `docs/FLOWS/payout/frontend-guide/courier-guide.md`.
