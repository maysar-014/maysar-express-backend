# Seller Flows — Wallet Service

> **Verification status:** Partially Verified
> **Verification basis:** `docs/FLOWS/_verification/analysis-report.md` (September 2026); `docs/wallet/WALLET_SERVICE_SYSTEM.md`
> **Canonical source:** `docs/FLOWS/wallet/user-flow/seller-flows.md`
> **Corresponding frontend guide:** `docs/FLOWS/wallet/frontend-guide/seller-guide.md`

## Overview

This document covers wallet-service flows from the seller's perspective: viewing wallet balance, receiving payment credits from COD order settlements (event-driven, not seller-initiated), and viewing the earnings statement. The seller wallet is automatically created during registration via `UserRegistered.v1` → `UserRegisteredHandler`. All write operations enforce the `availableBalance` invariant (`balance − frozenAmount`).

---

## Flow Index

| # | Flow Name | Verification Status | Primary Endpoint |
|---|---|---|---|
| 1 | View Wallet Balance | Partially Verified | `GET /api/wallet/balance` |
| 2 | Receive Order Payment (COD Settlement) | Partially Verified | Event-driven (`CODSettlementSaga`) |
| 3 | View Earnings / Statement | Partially Verified | `GET /api/wallet/statement` |

---

## Flow 1: View Wallet Balance

### Summary

| Field | Value |
|---|---|
| Actor | Seller |
| Trigger | Seller opens earnings or wallet screen |
| Preconditions | Authenticated (Bearer JWT, seller role) |
| Terminal states (success) | 200 `{ balance, frozenAmount, availableBalance, currency }` |
| Terminal states (failure) | 401 if unauthenticated |
| Verification status | Partially Verified |

### Happy Path

| Step | Actor/System | Action | Endpoint | Auth | Expected Response |
|---|---|---|---|---|---|
| 1 | Seller | Requests current wallet balance | `GET /api/wallet/balance` | Bearer JWT (seller role) | Request accepted |
| 2 | wallet-service | Fetches wallet scoped to requesting seller's `userId` | — | — | Wallet record retrieved |
| 3 | wallet-service | Computes `availableBalance = balance − frozenAmount` | — | — | Available balance calculated |
| 4 | Seller | Receives balance response | — | — | 200 `{ balance, frozenAmount, availableBalance, currency: "TZS" }` |

### Service Interaction Chain

`GET /api/wallet/balance` is handled entirely within wallet-service. The `userId` is extracted from the JWT and used to scope the query. No cross-service calls are needed at read time.

### Unhappy Path Branches

| Trigger Condition | System Response | HTTP Status | Error Code |
|---|---|---|---|
| JWT missing or expired | 401 | 401 | `UNAUTHORIZED` |
| Wallet not yet initialized | 404 | 404 | `WALLET_NOT_FOUND` |

---

## Flow 2: Receive Order Payment (COD Settlement)

### Summary

| Field | Value |
|---|---|
| Actor | wallet-service (event-driven) |
| Trigger | `Delivery.Success.v1` event published by logistics-service after buyer COD OTP verification |
| Preconditions | COD order delivered; COD OTP verified; `CODSettlementSaga` initiated |
| Terminal states (success) | Seller wallet credited via `CreditWalletUseCase`; buyer hold captured via `DEBIT_FROZEN` transaction |
| Terminal states (failure) | Saga compensation if any step fails |
| Verification status | Partially Verified |

> **Note:** This is not a seller-initiated flow. The seller receives a credit automatically when a COD delivery is confirmed. This section documents the event chain so sellers understand when and why their balance changes.

### Happy Path

| Step | Actor/System | Action | Endpoint | Auth | Expected Response |
|---|---|---|---|---|---|
| 1 | Courier | Verifies COD OTP at delivery: `POST /api/logistics/v1/cod/:deliveryId/verify` | — | Courier JWT | OTP verified; delivery confirmed |
| 2 | logistics-service | Publishes `Delivery.Success.v1` event → wallet-service | Event bus | — | Event received by wallet-service |
| 3 | wallet-service | `CODSettlementSaga` initiates: captures buyer hold (`captureHold` → `DEBIT_FROZEN`) | — | — | Buyer wallet: balance reduced, frozen amount reduced |
| 4 | wallet-service | Credits seller wallet: `CreditWalletUseCase` → `CREDIT` transaction | — | — | Seller `balance` increased |
| 5 | wallet-service | Emits `wallet.credited` event `{ walletId, userId, amount, balanceAfter }` | Event bus | — | Event published |
| 6 | Seller | Views updated balance | `GET /api/wallet/balance` | Bearer JWT (seller role) | Increased `availableBalance` visible |

### Settlement Amount

The settlement amount credited to the seller is the order amount minus platform commission and any applicable provider fees:

```
sellerSettlement = orderAmount − platformFee − providerFee
```

This calculation is performed by `SettlementEngine` in order-service as part of the `SettlementSaga`.

### Service Interaction Chain

The COD settlement chain: `logistics-service` → `Delivery.Success.v1` event → `wallet-service` (`CODSettlementSaga`) → buyer hold captured → seller wallet credited. No HTTP calls between services; all communication is via the platform event bus (outbox pattern). The `wallet.credited` event is published after the credit succeeds.

### Unhappy Path Branches

| Trigger Condition | System Response | Outcome |
|---|---|---|
| Seller wallet not found | Saga compensation triggered | Settlement retried or escalated |
| Credit would exceed wallet limits | Policy check fails; saga compensation | Escalated to platform ops |
| `CODSettlementSaga` step failure | Distributed saga compensates previous steps | All operations reversed; funds restored |

---

## Flow 3: View Earnings / Statement

### Summary

| Field | Value |
|---|---|
| Actor | Seller |
| Trigger | Seller reviews earnings history or reconciles payments |
| Preconditions | Authenticated (Bearer JWT, seller role) |
| Terminal states (success) | 200 — paginated list of wallet transactions |
| Terminal states (failure) | 401 if unauthenticated; empty array if no transactions |
| Verification status | Partially Verified |

### Happy Path

| Step | Actor/System | Action | Endpoint | Auth | Expected Response |
|---|---|---|---|---|---|
| 1 | Seller | Requests transaction history with optional date filters | `GET /api/wallet/statement` | Bearer JWT (seller role) | Request accepted |
| 2 | wallet-service | Fetches paginated transactions scoped to seller's wallet | — | — | Transactions retrieved |
| 3 | Seller | Receives earnings statement | — | — | 200 `{ transactions: [...], total, page, limit }` |

### Query Parameters

| Parameter | Type | Description |
|---|---|---|
| `from` | ISO 8601 date | Start of date range filter |
| `to` | ISO 8601 date | End of date range filter |
| `page` | integer | Page number (default: 1) |
| `limit` | integer | Results per page (default: 20) |

### Relevant Transaction Types for Sellers

| Type | When it appears |
|---|---|
| `CREDIT` | Order settlement credited to seller wallet |
| `DEBIT` | Payout initiated or fee deducted |
| `PAYOUT` | Payout disbursement recorded |
| `REFUND` | Refund reversed from seller (if applicable) |

### Unhappy Path Branches

| Trigger Condition | System Response | HTTP Status | Error Code |
|---|---|---|---|
| No transactions in range | 200 with empty `transactions: []` | 200 | — |
| Invalid date parameters | 400 | 400 | `VALIDATION_ERROR` |
| JWT missing or expired | 401 | 401 | `UNAUTHORIZED` |
