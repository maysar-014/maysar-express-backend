# Enabler Flows — Wallet Service

> **Verification status:** Verified (by exclusion — enabler is not a wallet-service actor)
> **Verification basis:** `docs/FLOWS/_verification/analysis-report.md` (September 2026); `docs/wallet/WALLET_SERVICE_SYSTEM.md`; `services/wallet-service/src/api/routes/wallet.routes.ts` (`authorizeWalletAccess()` excludes enablers)
> **Canonical source:** `docs/FLOWS/wallet/user-flow/enabler-flows.md`
> **Corresponding frontend guide:** `docs/FLOWS/wallet/frontend-guide/enabler-guide.md`

---

> ⚠️ **Wallet-Access Clarification — REQUIRED READING**
>
>wallet-service **excludes the enabler, supplier, and system roles** with *"Supplier and System roles do not have wallet access"* (`AuthorizationMiddleware.authorizeWalletAccess()`). Enablers therefore have **no wallet HTTP surface**: `GET /api/wallet/balance`, `GET /api/wallet/statement`, and all other `/api/wallet/*` routes return **403**.
>
>Enablers earn commission (documented in `docs/FLOWS/commission/...`) and their earnings are disbursed through the **payout-service** flow (`docs/FLOWS/payout/user-flow/enabler-flows.md`), **not** through wallet-service.

---

## Flow Index

| # | Flow Name | Verification Status | Primary Endpoint |
|---|---|---|---|
| 1 | Wallet Access Denied (403) | Verified | `GET /api/wallet/balance`, `GET /api/wallet/statement` |
| 2 | Commission Earnings (Event-Driven) | Verified | wallet credit at attributed-order fulfillment |
| 3 | Enabler Payout (payout-service) | Verified | `POST /api/payout/payouts` |

---

## Flow 1: Wallet Access Denied (403)

### Summary

| Field | Value |
|---|---|
| Actor | Enabler |
| Trigger | Enabler calls any `/api/wallet/*` endpoint |
| Preconditions | Authenticated (Bearer JWT, enabler role) |
| Terminal states (success) | N/A — request rejected |
| Terminal states (failure) | **403** `FORBIDDEN` — "Supplier and System roles do not have wallet access" |
| Verification status | Verified |

### Happy Path (fails)

| Step | Actor/System | Action | Endpoint | Auth | Expected Response |
|---|---|---|---|---|---|
| 1 | Enabler | Requests balance | `GET /api/wallet/balance` | Bearer JWT (enabler) | 403 `FORBIDDEN` |

### Unhappy Path Branches

| Trigger | System Response | HTTP Status | Error Code |
|---|---|---|---|
| Enabler calls any `/api/wallet/*` route | `authorizeWalletAccess()` rejects | 403 | `FORBIDDEN` |

---

## Flow 2: Commission Earnings (Event-Driven — Background)

Not an HTTP flow. When an attributed order fulfills (`CalculateEnablerCommissionUseCase`):

| Step | Actor/System | Action | Endpoint | Auth | Expected Response |
|---|---|---|---|---|---|
| 1 | order saga | Computes commission (rate ≤ 25%) | internal | — | Commission record written |
| 2 | order saga | Credit to wallet | wallet-service | — | `CREDIT` on enabler ledger |
| 3 | Enabler | Confirms credit | `GET /api/enabler/enablers/:enablerId/earnings` | Bearer JWT (enabler) | 200 — earnings summary |

> **Do not build an enabler wallet screen.** Balances do not exist for enablers; earnings are read from the enabler-service earnings endpoints and withdrawn through payout-service.

---

## Flow 3: Enabler Payout (payout-service)

Enablers withdraw earned commission via payout-service (KYC-required, documented in `docs/FLOWS/payout/user-flow/enabler-flows.md`):

| Step | Actor/System | Action | Endpoint | Auth | Expected Response |
|---|---|---|---|---|---|
| 1 | Enabler | Requests payout | `POST /api/payout/payouts` | Bearer JWT (enabler) | 201 `PENDING` |
| 2 | Payout saga | Disburses to enabler wallet or bank | — | — | 200/202 status confirmed |

KYC gate **≥ 2** applies (422 `KYC_LEVEL_INSUFFICIENT` if below).

---

## Cross-References

| Document | Scope |
|---|---|
| `docs/FLOWS/wallet/frontend-guide/enabler-guide.md` | Enabler wallet UI — rejection handling |
| `docs/FLOWS/commission/user-flow/enabler-flows.md` | Commission earnings (enabler-service) |
| `docs/FLOWS/payout/user-flow/enabler-flows.md` | Payout withdrawal (payout-service) |
| `docs/wallet/WALLET_SERVICE_SYSTEM.md` | Authoritative wallet service reference |
