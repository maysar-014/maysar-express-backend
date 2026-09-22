# Courier Flows — Wallet Service

> **Verification status:** Partially Verified
> **Verification basis:** `docs/FLOWS/_verification/analysis-report.md` (September 2026); `docs/wallet/WALLET_SERVICE_SYSTEM.md`
> **Canonical source:** `docs/FLOWS/wallet/user-flow/courier-flows.md`
> **Corresponding frontend guide:** `docs/FLOWS/wallet/frontend-guide/courier-guide.md`

## Overview

This document covers wallet-service flows from the courier's perspective: receiving delivery earnings (event-driven, triggered by `Delivery.Success.v1`) and viewing earnings history via the wallet statement. Couriers do not initiate wallet debits in normal operation — their wallet is a credits-in, payouts-out ledger. The courier wallet is initialized at registration via the `user.registered` → `UserRegisteredHandler` event chain.

---

## Flow Index

| # | Flow Name | Verification Status | Primary Endpoint |
|---|---|---|---|
| 1 | Receive Delivery Earnings | Partially Verified | Event-driven (`Delivery.Success.v1` → wallet credit) |
| 2 | View Earnings | Partially Verified | `GET /api/wallet/balance` + `GET /api/wallet/statement` |

---

## Flow 1: Receive Delivery Earnings

### Summary

| Field | Value |
|---|---|
| Actor | wallet-service (event-driven) |
| Trigger | `Delivery.Success.v1` event published by logistics-service after successful delivery and COD OTP verification (COD orders) or delivery confirmation (non-COD orders) |
| Preconditions | Delivery marked as `delivered`; `Delivery.Success.v1` event received by wallet-service |
| Terminal states (success) | Courier wallet credited with `Logistics_LedgerEntry` type `CARRIER_PAYABLE`; `wallet.credited` event emitted |
| Terminal states (failure) | Saga compensation if credit fails |
| Verification status | Partially Verified |

> **Note:** This is not a courier-initiated flow. The credit is automatic and event-driven. This section documents what the courier sees and what the wallet state represents after a successful delivery.

### Happy Path

| Step | Actor/System | Action | Endpoint | Auth | Expected Response |
|---|---|---|---|---|---|
| 1 | Courier | Completes delivery and verifies COD OTP (COD orders) or marks delivered | `POST /api/logistics/v1/cod/:deliveryId/verify` (COD) or delivery completion endpoint | Courier JWT | Delivery confirmed |
| 2 | logistics-service | Publishes `Delivery.Success.v1` event to platform event bus | Event bus | — | Event includes `courierId`, `deliveryId`, `earningsAmount` |
| 3 | wallet-service | Receives `Delivery.Success.v1` → creates `Logistics_LedgerEntry` (type: `CARRIER_PAYABLE`) | — | — | Earnings record created |
| 4 | wallet-service | Calls `CreditWalletUseCase` → `wallet.credit(earningsAmount)` → `CREDIT` transaction | — | — | Courier wallet `balance` increased |
| 5 | wallet-service | Emits `wallet.credited` event `{ walletId, userId: courierId, amount, balanceAfter }` | Event bus | — | Event published |
| 6 | Courier | Views updated balance | `GET /api/wallet/balance` | Courier JWT | Increased `availableBalance` visible |

### Earnings Amount

The courier's delivery earnings (`CARRIER_PAYABLE`) are calculated by logistics-service based on the delivery distance, vehicle type, route complexity, and platform rate table. This calculation is separate from seller settlement — the courier's earnings come from a logistics fee component of the order total, not from the seller's settlement amount.

### Service Interaction Chain

The earnings credit chain runs entirely via the event bus: `logistics-service` publishes `Delivery.Success.v1` → `wallet-service` consumes it and credits the courier wallet via `CreditWalletUseCase`. No direct HTTP call between services. For COD orders, the buyer hold capture (`CODSettlementSaga`) and the courier earnings credit both run in response to the same `Delivery.Success.v1` event but are independent operations.

### Unhappy Path Branches

| Trigger Condition | System Response | Outcome |
|---|---|---|
| Courier wallet not found | Saga compensation / dead-letter queue | Escalated to platform ops for manual resolution |
| Duplicate `Delivery.Success.v1` (retry) | Idempotency key check prevents double-credit | Original credit result returned |
| Credit exceeds wallet limits | Policy check; saga compensation | Escalated to platform ops |

---

## Flow 2: View Earnings

### Summary

| Field | Value |
|---|---|
| Actor | Courier |
| Trigger | Courier opens earnings screen in their app |
| Preconditions | Authenticated (Bearer JWT, courier role) |
| Terminal states (success) | 200 balance and/or 200 paginated statement |
| Terminal states (failure) | 401 if unauthenticated |
| Verification status | Partially Verified |

### Happy Path

| Step | Actor/System | Action | Endpoint | Auth | Expected Response |
|---|---|---|---|---|---|
| 1 | Courier | Checks current available earnings | `GET /api/wallet/balance` | Bearer JWT (courier role) | 200 `{ balance, frozenAmount, availableBalance, currency: "TZS" }` |
| 2 | Courier | Reviews delivery-by-delivery earnings history | `GET /api/wallet/statement` | Bearer JWT (courier role) | 200 `{ transactions: [...], total, page, limit }` |

### Statement Filters

| Parameter | Type | Description |
|---|---|---|
| `from` | ISO 8601 date | Start of date range |
| `to` | ISO 8601 date | End of date range |
| `page` | integer | Page number (default: 1) |
| `limit` | integer | Results per page (default: 20) |

### Relevant Transaction Types for Couriers

| Type | When it appears |
|---|---|
| `CREDIT` | Delivery earnings received |
| `PAYOUT` | Payout disbursement to mobile money / bank |
| `DEBIT` | Any deduction (rare; platform-initiated only) |

### Unhappy Path Branches

| Trigger Condition | System Response | HTTP Status | Error Code |
|---|---|---|---|
| No transactions in range | 200 with empty `transactions: []` | 200 | — |
| Invalid date parameters | 400 | 400 | `VALIDATION_ERROR` |
| JWT missing or expired | 401 | 401 | `UNAUTHORIZED` |

### Payout from Earnings

To request a payout of accumulated earnings, couriers use the payout-service flow documented at `docs/FLOWS/payout/user-flow/courier-flows.md`. The wallet balance shown here represents earnings available for payout (KYC level 2 required for `POST /api/payout/payouts`).
