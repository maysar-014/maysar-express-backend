# Enabler Flows — Payout Service

> **Verification status:** Verified (role gate confirmed by sweep; flows mirror seller payout)
> **Verification basis:** `docs/FLOWS/_verification/analysis-report.md` (September 2026); `docs/payout/PAYOUT_SERVICE_SYSTEM.md`
> **Canonical source:** `docs/FLOWS/payout/user-flow/enabler-flows.md`
> **Corresponding frontend guide:** `docs/FLOWS/payout/frontend-guide/enabler-guide.md`

## Overview

This document covers payout-service flows from the enabler's perspective: withdrawing commission earnings accumulated in the enabler's wallet. The flows are identical to the seller payout flows — the same endpoints, saga, and status lifecycle apply — with three enabler-specific facts:

1. **Role gate:** `POST /api/payout/payouts` accepts `requiredRoles: [seller, supplier, courier, enabler, system]` — confirmed in the September 2026 sweep (buyer probe → `403 FORBIDDEN` with `requiredRoles` echoed in the error body). The `enabler` role is admitted.
2. **Earnings source:** enabler earnings arrive as commission credits from attributed order completions (computed internally by `CalculateEnablerCommissionUseCase`; there is no HTTP endpoint to initiate commission collection). Commission reads are live at `GET /api/commission/sellers/:sellerId` (using the enabler's `userId`) — DEF-006 resolved.
3. **KYC gate:** `requireKycLevel(2)` middleware (in-process import from kyc-service) runs before payout initiation — applies to enablers exactly as it does to sellers.

> ⚠️ **Buyer access:** `POST /api/payout/payouts` returns **403 Forbidden** for the `buyer` role by design. Never render payout initiation UI to buyers.

---

## Flow Index

| # | Flow Name | Verification Status | Primary Endpoint |
|---|---|---|---|
| 1 | Initiate Payout | Verified | `POST /api/payout/payouts` |
| 2 | Check Payout Status | Verified | `GET /api/payout/payouts/:id` |
| 3 | Cancel Payout | Verified | `POST /api/payout/payouts/:id/cancel` |
| 4 | Review Earnings Before Payout (cross-service) | Verified | `GET /api/commission/sellers/:sellerId` |

---

## Flow 1: Initiate Payout

### Summary

| Field | Value |
|---|---|
| Actor | Enabler |
| Trigger | Enabler withdraws commission earnings from their wallet |
| Preconditions | Authenticated (Bearer JWT, enabler role); KYC level ≥ 2; `availableBalance ≥ amount`; amount ≥ minimum for selected method |
| Terminal states (success) | Payout record created in `PENDING`; payout saga begins processing |
| Terminal states (failure) | 403 if buyer role; 422 if KYC insufficient; 402 if insufficient balance; 422 if below method minimum |
| Verification status | Verified |

### Happy Path

| Step | Actor/System | Action | Endpoint | Auth | Expected Response |
|---|---|---|---|---|---|
| 1 | Enabler | Submits payout request | `POST /api/payout/payouts` | Bearer JWT (enabler role) | Request accepted |
| 2 | payout-service | Runs `requireKycLevel(2)` middleware (in-process, kyc-service import) | — | — | KYC level 2 confirmed; proceeds |
| 3 | payout-service | `checkEligibility`: amount ≥ method minimum; wallet `availableBalance` sufficient | — | — | Eligibility confirmed |
| 4 | payout-service | `freezeFunds` → `debitFrozenFunds` (wallet-service) | — | — | Funds locked then debited |
| 5 | payout-service | Routes to provider: MPESA / AIRTEL_MONEY / TIGO_PESA / HALOPESA / BANK_TRANSFER | — | — | Disbursement initiated |
| 6 | Enabler | Receives payout confirmation | — | — | 201 `{ payoutId, status: "PENDING", amount, method, estimatedCompletion }` |

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
| Actor | Enabler |
| Trigger | Enabler tracks a submitted payout |
| Preconditions | Authenticated (enabler role); `payoutId` belongs to the requesting enabler |
| Terminal states (success) | 200 — payout record with current status |
| Terminal states (failure) | 404 data-level if `payoutId` invalid or not owned |
| Verification status | Verified |

### Happy Path

| Step | Actor/System | Action | Endpoint | Auth | Expected Response |
|---|---|---|---|---|---|
| 1 | Enabler | Requests payout status | `GET /api/payout/payouts/:id` | Bearer JWT (enabler) | Request accepted |
| 2 | payout-service | Fetches payout scoped to requesting user | — | — | Record retrieved |
| 3 | Enabler | Receives payout detail | — | — | 200 `{ payoutId, status, amount, method, phoneNumber (masked), createdAt, completedAt? }` |

### Status Display

| Status | What to show enabler |
|---|---|
| `PENDING` | Processing |
| `PROCESSING` | Sending to provider |
| `COMPLETED` | Paid |
| `FAILED` | Failed — contact support |
| `REVERSED` | Reversed |

### Unhappy Path Branches

| Trigger Condition | System Response | HTTP Status | Error Code |
|---|---|---|---|
| `payoutId` not found or not owned | 404 data-level | 404 | `PAYOUT_NOT_FOUND` |
| JWT missing or expired | 401 | 401 | `UNAUTHORIZED` |

---

## Flow 3: Cancel Payout

### Summary

| Field | Value |
|---|---|
| Actor | Enabler |
| Trigger | Enabler cancels a payout before processing |
| Preconditions | Authenticated (enabler role); payout status is `PENDING`; `payoutId` belongs to requester |
| Terminal states (success) | 200 — payout cancelled; frozen funds returned to `availableBalance` |
| Terminal states (failure) | 422 if not `PENDING`; 404 if not found |
| Verification status | Verified |

### Happy Path

| Step | Actor/System | Action | Endpoint | Auth | Expected Response |
|---|---|---|---|---|---|
| 1 | Enabler | Submits cancellation | `POST /api/payout/payouts/:id/cancel` | Bearer JWT (enabler) | Request accepted |
| 2 | payout-service | Validates `PENDING` status and ownership | — | — | Confirmed |
| 3 | payout-service | Cancels payout; wallet-service unfreezes funds | — | — | `availableBalance` restored |
| 4 | Enabler | Receives confirmation | — | — | 200 `{ payoutId, status: "CANCELLED" }` |

### Unhappy Path Branches

| Trigger Condition | System Response | HTTP Status | Error Code |
|---|---|---|---|
| Payout already `PROCESSING` or terminal | 422 — cannot cancel in-flight payout | 422 | `INVALID_STATUS_TRANSITION` |
| `payoutId` not found | 404 data-level | 404 | `PAYOUT_NOT_FOUND` |
| JWT missing or expired | 401 | 401 | `UNAUTHORIZED` |

---

## Flow 4: Review Earnings Before Payout (cross-service)

### Summary

| Field | Value |
|---|---|
| Actor | Enabler |
| Trigger | Enabler checks accrued commission before requesting a payout |
| Preconditions | Authenticated (enabler role) |
| Terminal states (success) | 200 — commission records and aggregate summary |
| Terminal states (failure) | 404 data-level when no records exist for the period |
| Verification status | Verified (surface live; DEF-006 resolved) |

### Happy Path

| Step | Actor/System | Action | Endpoint | Auth | Expected Response |
|---|---|---|---|---|---|
| 1 | Enabler | Reads commission history (enabler `userId` passed as `:sellerId`) | `GET /api/commission/sellers/:sellerId` | Bearer JWT (enabler) | 200 — paginated commission records |
| 2 | Enabler | Reads commission aggregates | `GET /api/commission/sellers/:sellerId/summary` | Bearer JWT (enabler) | 200 — summary stats |
| 3 | Enabler | Reads wallet balance to confirm credits landed | `GET /api/wallet/wallets/:userId/balance` | Bearer JWT (enabler, owner) | 200 — `balance`, `frozenAmount`, `availableBalance` |

> **Canonical money record:** `GET /api/wallet/statement` remains the canonical view of credited amounts; commission reads explain how those credits are composed.

---

## Known Gap — Two Payout Paths Exist

`POST /api/wallet/wallets/:userId/payout` (wallet-service) is gated `authorizeRole(['enabler'])` + `requireKycLevel(2)` — an enabler-only wallet-side payout path. The payout-service endpoint above (`POST /api/payout/payouts`) is the multi-role path (`seller, supplier, courier, enabler, system`). Both exist; the payout-service saga is the primary withdrawal flow. See `docs/FLOWS/wallet/user-flow/enabler-flows.md`.

---

## Cross-References

| Document | Scope |
|---|---|
| `docs/FLOWS/payout/frontend-guide/enabler-guide.md` | UI states, error codes, and flow details for enabler payout screens |
| `docs/FLOWS/payout/user-flow/seller-flows.md` | Identical flows documented for the seller role (primary reference) |
| `docs/FLOWS/commission/user-flow/enabler-flows.md` | Commission reads that precede a payout |
| `docs/FLOWS/kyc/user-flow/enabler-flows.md` | KYC level 2 gate mechanics |
| `docs/payout/PAYOUT_SERVICE_SYSTEM.md` | Authoritative payout service reference |
| `docs/FLOWS/_verification/analysis-report.md` | September 2026 endpoint sweep — verification evidence |
