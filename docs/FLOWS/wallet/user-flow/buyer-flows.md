# Buyer Flows — Wallet Service

> **Verification status:** Partially Verified
> **Verification basis:** `docs/FLOWS/_verification/analysis-report.md` (September 2026); `docs/wallet/WALLET_SERVICE_SYSTEM.md`
> **Canonical source:** `docs/FLOWS/wallet/user-flow/buyer-flows.md`
> **Corresponding frontend guide:** `docs/FLOWS/wallet/frontend-guide/buyer-guide.md`

## Overview

This document covers wallet-service flows from the buyer's perspective: checking wallet balance, understanding the COD commitment hold lifecycle, and viewing transaction history. The wallet is automatically created for the buyer when they register via the `user.registered` → `UserRegisteredHandler` event chain. All balance-modifying operations use the `availableBalance` field (`balance − frozenAmount`), never raw `balance`. The transaction history endpoint is also the recommended fallback for payment status when the payment GET endpoints are unavailable.

---

## Flow Index

| # | Flow Name | Verification Status | Primary Endpoint |
|---|---|---|---|
| 1 | Check Wallet Balance | Partially Verified | `GET /api/wallet/balance` |
| 2 | COD Commitment (Hold Lifecycle) | Partially Verified | Internal (wallet-service, event-driven) |
| 3 | View Transaction History | Partially Verified | `GET /api/wallet/statement` |

---

## Flow 1: Check Wallet Balance

### Summary

| Field | Value |
|---|---|
| Actor | Buyer |
| Trigger | Buyer opens wallet screen or checkout summary |
| Preconditions | Authenticated (Bearer JWT, any role with wallet) |
| Terminal states (success) | 200 `{ balance, frozenAmount, availableBalance, currency }` |
| Terminal states (failure) | 401 if unauthenticated; 404 if wallet not yet initialized |
| Verification status | Partially Verified |

### Happy Path

| Step | Actor/System | Action | Endpoint | Auth | Expected Response |
|---|---|---|---|---|---|
| 1 | Buyer | Requests current wallet balance | `GET /api/wallet/balance` | Bearer JWT (buyer role) | Request accepted |
| 2 | wallet-service | Fetches wallet scoped to requesting user's `userId` | — | — | Wallet record retrieved |
| 3 | wallet-service | Computes `availableBalance = balance − frozenAmount` | — | — | Available balance calculated |
| 4 | Buyer | Receives balance response | — | — | 200 `{ balance, frozenAmount, availableBalance, currency: "TZS" }` |

### Balance Fields

| Field | Meaning |
|---|---|
| `balance` | Total wallet balance including frozen funds |
| `frozenAmount` | Funds currently locked (active holds, COD commitments) |
| `availableBalance` | Spendable balance: `balance − frozenAmount` |
| `currency` | Always `"TZS"` for platform wallets |

> **UI rule:** Always display `availableBalance` as the buyer's usable balance. Never show raw `balance` as the spendable amount when `frozenAmount > 0`.

### Service Interaction Chain

`GET /api/wallet/balance` is handled entirely within wallet-service. The `availableBalance` computation is performed by `Wallet.getAvailableBalance()` in the domain model. No cross-service calls occur at read time.

### Unhappy Path Branches

| Trigger Condition | System Response | HTTP Status | Error Code |
|---|---|---|---|
| JWT missing or expired | 401 | 401 | `UNAUTHORIZED` |
| Wallet not yet created (edge case: registration event not yet processed) | 404 | 404 | `WALLET_NOT_FOUND` |

---

## Flow 2: COD Commitment (Hold Lifecycle)

### Summary

| Field | Value |
|---|---|
| Actor | wallet-service (event-driven) |
| Trigger | Buyer places a COD order (checkout confirm) |
| Preconditions | COD eligibility confirmed; buyer wallet is `ACTIVE` |
| Terminal states (success) | Hold `CAPTURED` (delivery confirmed → seller credited) or `RELEASED` (order cancelled → buyer refunded) |
| Terminal states (failure) | `useCODCommitment` fails if commitment limit is exceeded |
| Verification status | Partially Verified |

> **Note:** This is not a buyer-initiated flow. The buyer triggers the COD order at checkout, and wallet-service manages the hold lifecycle in response to downstream events. This section documents what the buyer experiences and what the wallet state represents at each phase.

### Hold Lifecycle States

```
ORDER PLACED (COD)
  → HoldPlaced / commitment active
       codCommitmentUsed += orderAmount
       codCommitmentCount += 1

  → HoldCaptured (on delivery confirmed + COD OTP verified)
       CODSettlementSaga: captureHold → DEBIT_FROZEN transaction
       Seller wallet credited
       codCommitmentUsed decremented

  → HoldReleased (on order cancelled — buyer cancels or seller declines)
       CODSettlementSaga: releaseHold → UNFREEZE transaction
       codCommitmentUsed decremented
       Buyer balance unchanged (no debit occurred)
```

### Happy Path

| Step | Actor/System | Action | Endpoint | Auth | Expected Response |
|---|---|---|---|---|---|
| 1 | order-service | Checkout confirm: `wallet.useCODCommitment(orderAmount)` | In-process / event | — | `codCommitmentUsed` incremented; hold tracked |
| 2 | Buyer | Views wallet; sees COD commitment reflected in `frozenAmount` | `GET /api/wallet/balance` | Bearer JWT | `frozenAmount` includes the COD hold amount |
| 3a | logistics-service | Delivery confirmed + COD OTP verified → `Delivery.Success.v1` event | Event bus | — | `CODSettlementSaga` triggered |
| 3b | wallet-service | `CODSettlementSaga`: `captureHold` → `DEBIT_FROZEN` transaction; seller credited | — | — | Buyer wallet debited; hold resolved as `CAPTURED` |
| 4 | Buyer | Views wallet post-delivery: hold cleared; balance reduced by order amount | `GET /api/wallet/balance` | Bearer JWT | `frozenAmount` reduced; `balance` reduced |

### Alternative Branch: Order Cancelled

| Step | Actor/System | Action | Expected Response |
|---|---|---|---|
| 3c | order-service | Order cancelled (buyer or seller-declined) → saga compensation | `order.cancelled` event published |
| 3d | wallet-service | `CODSettlementSaga`: `releaseHold` → `UNFREEZE` transaction; `releaseCODCommitment` | `frozenAmount` reduced; `balance` unchanged |
| 4 | Buyer | Hold cleared; no balance deduction | Full pre-order balance restored |

### Buyer-Facing State Mapping

| Wallet Hold State | What to Show Buyer |
|---|---|
| `HoldPlaced` (COD commitment active) | "COD hold active — TZS {amount} reserved for this order" |
| `HoldCaptured` (delivery confirmed) | "Payment settled — TZS {amount} paid on delivery" |
| `HoldReleased` (order cancelled) | "COD hold released — TZS {amount} returned to available balance" |

### Service Interaction Chain

The COD hold lifecycle is entirely event-driven. No buyer-initiated HTTP call triggers hold capture or release. The `CODSettlementSaga` in wallet-service responds to `Delivery.Success.v1` (from logistics-service) for capture, and `order.cancelled` (from order-service) for release.

---

## Flow 3: View Transaction History

### Summary

| Field | Value |
|---|---|
| Actor | Buyer |
| Trigger | Buyer views wallet activity or needs to verify a payment when payment-service GET endpoints are unavailable |
| Preconditions | Authenticated (Bearer JWT, buyer role) |
| Terminal states (success) | 200 — paginated transaction list |
| Terminal states (failure) | 401 if unauthenticated; empty array if no transactions exist |
| Verification status | Partially Verified |

### Happy Path

| Step | Actor/System | Action | Endpoint | Auth | Expected Response |
|---|---|---|---|---|---|
| 1 | Buyer | Requests transaction history with optional date range | `GET /api/wallet/statement` | Bearer JWT (buyer role) | Request accepted |
| 2 | wallet-service | Fetches paginated transactions scoped to requesting user's wallet | — | — | Transactions retrieved |
| 3 | Buyer | Receives list of wallet transactions | — | — | 200 `{ transactions: [...], total, page, limit }` |

### Query Parameters

| Parameter | Type | Description |
|---|---|---|
| `from` | ISO 8601 date | Start of date range filter |
| `to` | ISO 8601 date | End of date range filter |
| `page` | integer | Page number (default: 1) |
| `limit` | integer | Results per page (default: 20) |

### Transaction Types

| Type | Meaning |
|---|---|
| `CREDIT` | Funds received (refund, top-up, seller credit) |
| `DEBIT` | Funds spent (wallet payment) |
| `FREEZE` | Funds frozen (hold placed) |
| `UNFREEZE` | Frozen funds returned (hold released) |
| `DEBIT_FROZEN` | Frozen funds captured (COD delivery settled) |
| `REFUND` | Refund credited |

### Payment History Fallback

> **Important:** When `GET /api/payment/payments/:paymentId` and `GET /api/payment/payments/order/:orderId` are unavailable (both return 500 as of September 2026), `GET /api/wallet/statement` is the recommended fallback for showing buyers their payment activity. Filter by transaction type `DEBIT` or `DEBIT_FROZEN` to show payment-equivalent activity.

### Unhappy Path Branches

| Trigger Condition | System Response | HTTP Status | Error Code |
|---|---|---|---|
| No transactions in range | 200 with empty `transactions: []` | 200 | — |
| Invalid date range | 400 | 400 | `VALIDATION_ERROR` |
| JWT missing or expired | 401 | 401 | `UNAUTHORIZED` |
