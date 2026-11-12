# Enabler Flows — Commission Service

> **Verification status:** Verified (surface live at `/api/commission/*` — DEF-006 resolved; reads are role-agnostic, scoped by `:sellerId`)
> **Verification basis:** `docs/FLOWS/_verification/defect-register.md` (DEF-006, resolved); `docs/commission/COMMISSION_SERVICE_SYSTEM.md`
> **Canonical source:** `docs/FLOWS/commission/user-flow/enabler-flows.md`
> **Corresponding frontend guide:** `docs/FLOWS/commission/frontend-guide/enabler-guide.md`

## Overview

This document covers commission-service flows from the enabler's perspective. Commission records are written **internally** when an attributed order is fulfilled (`CalculateEnablerCommissionUseCase` computes the breakdown and credits the enabler's wallet); the HTTP surface only **reads** those records.

Key facts for enablers:

1. **Same endpoints, enabler identity as `:sellerId`.** Enabler commission reads reuse the seller paths with the enabler's `userId` in the `:sellerId` position — `GET /api/commission/sellers/:sellerId` and `GET /api/commission/sellers/:sellerId/summary`.
2. **No write access.** `POST /api/commission/calculate` requires `admin`/`system`; `PUT /api/commission/:id/approve` requires `admin`/`ops`. Enablers (and sellers) are read-only on this surface.
3. **Wallet statement stays canonical.** Commission reads explain *how* wallet credits were composed; `GET /api/wallet/statement` remains the source of truth for money actually credited.

---

## Flow Index

| # | Flow Name | Verification Status | Primary Endpoint |
|---|---|---|---|
| 1 | Read Commission History | Verified (surface live; DEF-006) | `GET /api/commission/sellers/:sellerId` |
| 2 | Read Commission Summary | Verified (surface live; DEF-006) | `GET /api/commission/sellers/:sellerId/summary` |
| 3 | Read Single Commission | Verified (surface live; DEF-006) | `GET /api/commission/:id` |
| 4 | Commission Credit (Event-Driven) | Verified | Wallet credit at order fulfillment |

---

## Flow 1: Read Commission History

### Summary

| Field | Value |
|---|---|
| Actor | Enabler |
| Trigger | Enabler reviews commissions earned from attributed orders |
| Preconditions | Authenticated (Bearer JWT); `:sellerId` = the enabler's own `userId` |
| Terminal states (success) | 200 — paginated commission records |
| Terminal states (failure) | 404 data-level when no records exist for the period; 401 unauthenticated |
| Verification status | Verified — `/api/commission/*` registered and contract-locked post-DEF-006 |

### Happy Path

| Step | Actor/System | Action | Endpoint | Auth | Expected Response |
|---|---|---|---|---|---|
| 1 | Enabler | Lists commission records | `GET /api/commission/sellers/:sellerId?status=&limit=&cursor=` | Bearer JWT (enabler) | 200 — paginated records |

### Unhappy Path Branches

| Trigger Condition | System Response | Error Code |
|---|---|---|
| No commission records | 404 data-level | `NOT_FOUND` |
| JWT missing/expired | 401 | `UNAUTHORIZED` |

---

## Flow 2: Read Commission Summary

| Step | Actor/System | Action | Endpoint | Auth | Expected Response |
|---|---|---|---|---|---|
| 1 | Enabler | Fetches aggregate stats | `GET /api/commission/sellers/:sellerId/summary` | Bearer JWT (enabler) | 200 — totals, counts, status breakdown |

> **DEF-006 context (resolved):** `CommissionModule.name` once regressed to `commissions-service`, mounting the surface at `/api/commissions` and causing route-level 404s. The name is fixed and locked by `services/commission-service/src/__tests__/commission-module.contract.test.ts`. If any commission path ever answers 404 again, treat it as a regression of DEF-006.

---

## Flow 4: Commission Credit (Event-Driven — Background)

Not HTTP-initiated. When an attributed order fulfills:

| Step | Actor/System | Action | Endpoint | Auth | Expected Response |
|---|---|---|---|---|---|
| 1 | order saga | Computes enabler commission (rate capped at 25%) | internal | — | Commission record written |
| 2 | order saga | Credits enabler wallet | wallet-service | — | `CREDIT` transaction on wallet statement |
| 3 | Enabler | Confirms the credit landed | `GET /api/wallet/wallets/:userId/statement` | Bearer JWT (enabler, owner) | 200 — statement includes the credit |

There is **no** HTTP endpoint to initiate commission collection — reading and withdrawing are the only enabler actions (withdraw via `docs/FLOWS/payout/user-flow/enabler-flows.md`).

---

## Cross-References

| Document | Scope |
|---|---|
| `docs/FLOWS/commission/frontend-guide/enabler-guide.md` | Enabler earnings UI guidance |
| `docs/FLOWS/commission/user-flow/seller-flows.md` | Same surface for sellers (primary reference) |
| `docs/FLOWS/payout/user-flow/enabler-flows.md` | Withdrawing earned commission |
| `docs/commission/COMMISSION_SERVICE_SYSTEM.md` | Authoritative commission service reference |
| `docs/FLOWS/_verification/defect-register.md` | DEF-006 — mount-path regression and its lock test |
