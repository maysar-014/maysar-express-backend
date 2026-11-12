# Supplier Flows — KYC Service

> **Verification status:** Partially Verified (middleware behaviour confirmed; no standalone HTTP surface)
> **Verification basis:** `docs/FLOWS/_verification/analysis-report.md` — kyc-service section; `services/payout-service/src/api/routes/payout.routes.ts`; `services/catalog-service/src/api/routes/product.routes.ts`
> **Canonical source:** `docs/FLOWS/kyc/user-flow/supplier-flows.md`
> **Corresponding frontend guide:** `docs/FLOWS/kyc/frontend-guide/supplier-guide.md`

---

> ⚠️ **KYC Architecture Clarification — REQUIRED READING**
>
> KYC-service has **NO standalone HTTP surface**. There are **no `/api/kyc/*` routes** of any kind.
>
> KYC is enforced as `requireKycLevel(N)` middleware imported **directly from kyc-service** into catalog-service, payout-service, and wallet-service routes. This is an **in-process gate** — not a separate HTTP call. There is no `compliance-service`.

---

## Flows in This Document

| Flow ID | Flow Name | Status | Primary Endpoint |
|---------|-----------|--------|-----------------|
| KYC-SUP-01 | KYC Gate on Supplier Payout | Partially Verified | `POST /api/payout/payouts` (in-process KYC check) |
| KYC-SUP-02 | KYC Gate on Supplier Product Listing | Partially Verified | `POST /api/catalog/v1/products` (in-process KYC check + listing cap) |
| KYC-SUP-03 | KYC Status Change Effect on Supplier Capabilities | Partially Verified | `kyc.status_changed` event |
| KYC-SUP-04 | Wallet Access Excluded for Suppliers | Verified (by exclusion) | all `/api/wallet/*` routes → 403 |

---

## Flow KYC-SUP-01: KYC Gate on Supplier Payout

| Field | Value |
|-------|-------|
| **Actor** | Supplier |
| **Trigger** | Supplier requests a payout of receivables |
| **Preconditions** | Authenticated (supplier role — `POST /api/payout/payouts` `requiredRoles` includes `supplier`); KYC level must be ≥ 2 |
| **Terminal states** | **Pass:** payout saga initiates (201). **Fail:** 422 `KYC_LEVEL_INSUFFICIENT` |
| **Verification status** | Partially Verified |

### Happy Path

| Step | Actor/System | Action | Endpoint Method + Path | Auth | Expected Response |
|------|-------------|--------|------------------------|------|-------------------|
| 1 | Supplier | Request payout | `POST /api/payout/payouts` | Supplier JWT | 201 `{ payoutId, status: "PENDING", … }` |

### Service Interaction Chain

`payout.routes.ts` applies `requireKycLevel(2)` middleware — the source comment states explicitly: *"Payouts require identity verification — applies to all roles including suppliers"*. The gate reads the supplier's KYC level from the stored KYC record in-process; failure short-circuits with 422 **before** any wallet interaction.

### Unhappy Path Branches

| Trigger | System Response | Error Code | Terminal State |
|---------|----------------|------------|----------------|
| Supplier KYC level < 2 | 422 — middleware gate rejected | `KYC_LEVEL_INSUFFICIENT` | No payout initiated |
| Insufficient wallet balance | 402 | `INSUFFICIENT_BALANCE` | No payout initiated |
| No JWT | 401 | — | No payout initiated |

---

## Flow KYC-SUP-02: KYC Gate on Supplier Product Listing

| Field | Value |
|-------|-------|
| **Actor** | Supplier |
| **Trigger** | Supplier creates a catalog product for produced goods |
| **Preconditions** | `requireRole(['seller','supplier','admin'])` admits the supplier role; `requireKycLevel(0)` + `requireKycListingCapacity` run next |
| **Terminal states** | **Pass:** product created. **Fail:** 403 `KYC_LISTING_CAP_REACHED` when the KYC listing cap is hit |
| **Verification status** | Partially Verified |

### Service Interaction Chain

1. `requireRole(['seller','supplier','admin'])` — role gate.
2. `requireKycLevel(0)` — Level 0 allows up to the default cap (5 listings) so suppliers can start listing without KYC approval; higher `kycLimitMaxListings` values unlock with KYC.
3. `requireKycListingCapacity` — counts existing listings against `user.kycLimitMaxListings` (default 5); over cap → **403 `KYC_LISTING_CAP_REACHED`** (403, not 422).
4. Product create handler runs if all guards pass.

### Unhappy Path Branches

| Trigger | System Response | Error Code | Terminal State |
|---------|----------------|------------|----------------|
| Listing cap reached | 403 — capacity gate rejected | `KYC_LISTING_CAP_REACHED` | No product created |
| Role not in gate (e.g. buyer) | 403 | `FORBIDDEN` | No product created |

---

## Flow KYC-SUP-03: KYC Status Change Effect on Supplier Capabilities

| Field | Value |
|-------|-------|
| **Actor** | System (event-driven) |
| **Trigger** | kyc-service publishes `kyc.status_changed` after a review completes |
| **Terminal states** | Next request through any `requireKycLevel(N)` gate evaluates the new level immediately |
| **Verification status** | Partially Verified |

| Action | Before KYC Level 2 | After KYC Level 2 |
|--------|--------------------|-------------------|
| `POST /api/payout/payouts` | 422 `KYC_LEVEL_INSUFFICIENT` | ✓ Payout allowed |
| Product listing (cap) | Limited to default 5-listing cap | Cap raised per `kycLimitMaxListings` |

The new level is read live from the stored KYC record on each request — no cache invalidation delay. order-service consumes `kyc.status_changed` for buyer COD trust signals; supplier-facing gates pick the level up automatically on the next call.

---

## Flow KYC-SUP-04: Wallet Access Excluded for Suppliers

| Field | Value |
|-------|-------|
| **Actor** | Supplier attempting any wallet API call |
| **Terminal states** | **403** on every `/api/wallet/*` route |
| **Verification status** | Verified — `AuthorizationMiddleware.authorizeWalletAccess()` excludes `supplier` and `system` roles with the message *"Supplier and System roles do not have wallet access"* |

Suppliers therefore have **no wallet UI**: receivables accumulate in the internal ledger during fulfillment and are disbursed through the payout flow (KYC-SUP-01). Show balances nowhere in the supplier app; direct suppliers to payout status instead.

---

## Cross-References

| Document | Scope |
|---------|-------|
| `docs/FLOWS/kyc/frontend-guide/supplier-guide.md` | Supplier KYC messaging and UI gates |
| `docs/FLOWS/kyc/user-flow/seller-flows.md` | KYC middleware gate — canonical reference |
| `docs/FLOWS/kyc/user-flow/enabler-flows.md` | KYC gates for the enabler role |
| `docs/FLOWS/payout/user-flow/supplier-flows.md` | Payout flow gated by KYC-SUP-01 |
| `docs/FLOWS/_verification/analysis-report.md` | September 2026 endpoint sweep — verification evidence |

