# Courier Flows — Payout Service

> **Verification status:** Verified
> **Verification basis:** `docs/FLOWS/_verification/analysis-report.md` (September 2026); `docs/payout/PAYOUT_SERVICE_SYSTEM.md`
> **Canonical source:** `docs/FLOWS/payout/user-flow/courier-flows.md`
> **Corresponding frontend guide:** `docs/FLOWS/payout/frontend-guide/courier-guide.md`

## Overview

This document covers payout-service flows from the courier's perspective: initiating a payout of accumulated delivery earnings, checking payout status, and cancelling a pending payout. Payouts require KYC level 2 (`requireKycLevel(2)` middleware). Buyers are explicitly blocked — `POST /api/payout/payouts` returns **403 Forbidden** for the buyer role by design. Couriers accumulate earnings via `Delivery.Success.v1` events (see `docs/FLOWS/wallet/user-flow/courier-flows.md`) and request payouts here.

---

## Flow Index

| # | Flow Name | Verification Status | Primary Endpoint |
|---|---|---|---|
| 1 | Initiate Payout | Verified | `POST /api/payout/payouts` |
| 2 | Check Payout Status | Verified | `GET /api/payout/payouts/:id` |
| 3 | Cancel Payout | Verified | `POST /api/payout/payouts/:id/cancel` |

---

## Flow 1: Initiate Payout

### Summary

| Field | Value |
|---|---|
| Actor | Courier |
| Trigger | Courier requests disbursement of accumulated delivery earnings |
| Preconditions | Authenticated (Bearer JWT, courier role); KYC level ≥ 2; `availableBalance ≥ amount`; amount ≥ minimum for selected method |
| Terminal states (success) | Payout record created in `PENDING` status; payout saga begins |
| Terminal states (failure) | 403 if buyer role; 422 if KYC insufficient; 402 if insufficient balance |
| Verification status | Verified |

> **Buyer access:** `POST /api/payout/payouts` returns **403 Forbidden** for the buyer role. This is correct by design. Do not show the payout initiation UI to users with the `buyer` role.

### Happy Path

| Step | Actor/System | Action | Endpoint | Auth | Expected Response |
|---|---|---|---|---|---|
| 1 | Courier | Submits payout request | `POST /api/payout/payouts` | Bearer JWT (courier role) | Request accepted |
| 2 | payout-service | Runs `requireKycLevel(2)` middleware (in-process, kyc-service import) | — | — | KYC level 2 confirmed |
| 3 | payout-service | `checkEligibility`: validates amount ≥ method minimum; courier wallet has sufficient `availableBalance` | — | — | Eligibility confirmed |
| 4 | payout-service | `freezeFunds`: wallet-service `freeze(amount)` — moves amount to `frozenAmount` | — | — | Funds locked |
| 5 | payout-service | `debitFrozenFunds`: wallet-service `DEBIT_FROZEN` transaction | — | — | Frozen funds removed from wallet |
| 6 | payout-service | Routes to provider (MPESA / AIRTEL_MONEY / TIGO_PESA / HALOPESA / BANK_TRANSFER) | — | — | Disbursement initiated |
| 7 | payout-service | `creditWallet` (provider confirmation): records `PAYOUT` transaction | — | — | Status → `PROCESSING` |
| 8 | Courier | Receives payout confirmation | — | — | 201 `{ payoutId, status: "PENDING", amount, method, estimatedCompletion }` |

### Payout Methods and Minimums

| Method | Minimum Amount | Estimated Processing |
|---|---|---|
| `MPESA` | TZS 1,000 | Instant – 5 min |
| `AIRTEL_MONEY` | TZS 1,000 | Instant – 5 min |
| `TIGO_PESA` | TZS 1,000 | Instant – 5 min |
| `HALOPESA` | TZS 1,000 | Instant – 5 min |
| `BANK_TRANSFER` | TZS 10,000 | 1–3 business days |

### Payout Status Lifecycle

```
PENDING → PROCESSING → COMPLETED
                     ↘ FAILED
                     ↘ REVERSED
```

### Request Body

```json
{
  "amount": 50000,
  "currency": "TZS",
  "method": "MPESA",
  "accountDetails": {
    "phoneNumber": "+255712345678"
  }
}
```

### Service Interaction Chain

`POST /api/payout/payouts` is handled by `InitiatePayoutUseCase` in payout-service. The saga (`checkEligibility → freezeFunds → debitFrozenFunds → creditWallet`) interacts with wallet-service for fund management. Phone numbers are masked in responses (last 3 digits only).

### Unhappy Path Branches

| Trigger Condition | System Response | HTTP Status | Error Code |
|---|---|---|---|
| Buyer role attempting payout | 403 — by design | 403 | `FORBIDDEN` |
| KYC level < 2 | 422 | 422 | `KYC_LEVEL_INSUFFICIENT` |
| `availableBalance` < amount | 402 | 402 | `INSUFFICIENT_BALANCE` |
| Amount below method minimum | 422 | 422 | `BELOW_MINIMUM_PAYOUT` |
| Invalid payout method | 400 | 400 | `INVALID_PAYOUT_METHOD` |
| Provider unavailable | 503 | 503 | `PROVIDER_UNAVAILABLE` |
| JWT missing or expired | 401 | 401 | `UNAUTHORIZED` |

---

## Flow 2: Check Payout Status

### Summary

| Field | Value |
|---|---|
| Actor | Courier |
| Trigger | Courier tracks the status of a submitted payout |
| Preconditions | Authenticated (Bearer JWT, courier role); `payoutId` belongs to the requesting courier |
| Terminal states (success) | 200 — payout record with current status |
| Terminal states (failure) | 404 data-level if `payoutId` invalid |
| Verification status | Verified |

### Happy Path

| Step | Actor/System | Action | Endpoint | Auth | Expected Response |
|---|---|---|---|---|---|
| 1 | Courier | Requests payout status | `GET /api/payout/payouts/:id` | Bearer JWT (courier role) | Request accepted |
| 2 | payout-service | Fetches payout scoped to requesting courier | — | — | Record retrieved |
| 3 | Courier | Receives payout detail | — | — | 200 `{ payoutId, status, amount, method, phoneNumber (masked), createdAt, completedAt? }` |

### Status Display

| Status | What to show courier |
|---|---|
| `PENDING` | Processing |
| `PROCESSING` | Sending to provider |
| `COMPLETED` | Paid |
| `FAILED` | Failed — contact support |
| `REVERSED` | Reversed |

### Unhappy Path Branches

| Trigger Condition | System Response | HTTP Status | Error Code |
|---|---|---|---|
| `payoutId` not found | 404 data-level | 404 | `PAYOUT_NOT_FOUND` |
| JWT missing or expired | 401 | 401 | `UNAUTHORIZED` |

---

## Flow 3: Cancel Payout

### Summary

| Field | Value |
|---|---|
| Actor | Courier |
| Trigger | Courier wants to cancel a payout before it processes |
| Preconditions | Authenticated (Bearer JWT, courier role); payout status is `PENDING`; `payoutId` belongs to the requesting courier |
| Terminal states (success) | 200 — payout cancelled; frozen funds returned to `availableBalance` |
| Terminal states (failure) | 422 if payout is not `PENDING`; 404 if not found |
| Verification status | Verified |

### Happy Path

| Step | Actor/System | Action | Endpoint | Auth | Expected Response |
|---|---|---|---|---|---|
| 1 | Courier | Submits cancellation request | `POST /api/payout/payouts/:id/cancel` | Bearer JWT (courier role) | Request accepted |
| 2 | payout-service | Validates `PENDING` status and courier ownership | — | — | Status and ownership confirmed |
| 3 | payout-service | Cancels payout; wallet-service unfreezes funds | — | — | `availableBalance` restored |
| 4 | Courier | Receives confirmation | — | — | 200 `{ payoutId, status: "CANCELLED" }` |

### Unhappy Path Branches

| Trigger Condition | System Response | HTTP Status | Error Code |
|---|---|---|---|
| Payout is not `PENDING` | 422 | 422 | `INVALID_STATUS_TRANSITION` |
| `payoutId` not found | 404 data-level | 404 | `PAYOUT_NOT_FOUND` |
| JWT missing or expired | 401 | 401 | `UNAUTHORIZED` |
