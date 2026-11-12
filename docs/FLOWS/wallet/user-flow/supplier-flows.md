# Supplier Flows — Wallet Service

> **Verification status:** Verified (by exclusion — supplier is not a wallet-service actor)
> **Verification basis:** `docs/FLOWS/_verification/analysis-report.md` (September 2026); `docs/wallet/WALLET_SERVICE_SYSTEM.md`; `services/wallet-service/src/api/routes/wallet.routes.ts` (`authorizeWalletAccess()` excludes suppliers)
> **Canonical source:** `docs/FLOWS/wallet/user-flow/supplier-flows.md`
> **Corresponding frontend guide:** `docs/FLOWS/wallet/frontend-guide/supplier-guide.md`

---

> ⚠️ **Wallet-Access Clarification — REQUIRED READING**
>
>wallet-service **excludes the suppliers, enablers, and system role** with *"Supplier and System roles do not have wallet access"* (`AuthorizationMiddleware.authorizeWalletAccess()`). Suppliers therefore have **no wallet HTTP surface**: `GET /api/wallet/balance`, `GET /api/wallet/statement`, and all `/api/wallet/*` routes return **403**.
>
>Supplier receivables accrue internally during fulfillment and are disbursed through **payout-service** (`docs/FLOWS/payout/user-flow/supplier-flows.md`), not wallet-service.

---

## Flow Index

| # | Flow Name | Verification Status | Primary Endpoint |
|---|---|---|---|
| 1 | Wallet Access Denied (403) | Verified | `GET /api/wallet/balance`, `GET /api/wallet/statement` |
| 2 | Receivables Accumulation (Event-Driven) | Verified | Internal ledger during fulfillment |
| 3 | Supplier Payout (payout-service) | Verified | `POST /api/payout/payouts` |

---

## Flow 1: Wallet Access Denied (403)

### Summary

| Field | Value |
|---|---|
| Actor | Supplier |
| Trigger | Supplier calls any `/api/wallet/*` endpoint |
| Preconditions | Authenticated (Bearer JWT, supplier role) |
| Terminal states (success) | N/A — request rejected |
| Terminal states (failure) | **403** `FORBIDDEN` — "Supplier and System roles do not have wallet access" |
| Verification status | Verified |

### Happy Path (fails)

| Step | Actor/System | Action | Endpoint | Auth | Expected Response |
|---|---|---|---|---|---|
| 1 | Supplier | Requests balance | `GET /api/wallet/balance` | Bearer JWT (supplier) | 403 `FORBIDDEN` |

### Unhappy Path Branches

| Trigger | System Response | HTTP Status | Error Code |
|---|---|---|---|
| Supplier calls any `/api/wallet/*` route | `authorizeWalletAccess()` rejects | 403 | `FORBIDDEN` |

---

## Flow 2: Receivables Accumulation (Event-Driven — Background)

Not an HTTP flow. Supplier receivables are recorded internally when:

1. A managed order is delivered (supplier ships; `Delivery.Success.v1` fired by logistics-service).
2. `CODSettlementSaga` captures the buyer hold and credits the **seller** wallet; the **supplier** ledger records the receivable internally (institutional bookkeeping, no HTTP), per `SettlementEngine` in order-service.

Supplier ledger entries are visible only in internal reconciliation reports — there is no supplier-facing statement. When the receivable is disbursed, the supplier is notified through the **payout** flow (Step 3).

---

## Flow 3: Supplier Payout (payout-service)

Suppliers withdraw receivables via payout-service (KYC-required, documented in `docs/FLOWS/payout/user-flow/supplier-flows.md`):

| Step | Actor/System | Action | Endpoint | Auth | Expected Response |
|---|---|---|---|---|---|
| 1 | Supplier | Requests payout | `POST /api/payout/payouts` | Bearer JWT (supplier) | 201 `PENDING` |
| 2 | Payout saga | Disburses receivable | — | — | 200/202 status confirmed |

KYC gate **≥ 2** applies (422 `KYC_LEVEL_INSUFFICIENT` if below).

---

## Cross-References

| Document | Scope |
|---|---|
| `docs/FLOWS/wallet/frontend-guide/supplier-guide.md` | Supplier wallet UI — rejection handling |
| `docs/FLOWS/payout/user-flow/supplier-flows.md` | Payout disbursement (payout-service) |
| `docs/FLOWS/catalog/frontend-guide/supplier-guide.md` | Supplier product listing |
| `docs/wallet/WALLET_SERVICE_SYSTEM.md` | Authoritative wallet service reference |
