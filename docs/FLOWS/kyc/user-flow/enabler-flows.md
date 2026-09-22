# Enabler Flows — KYC Service

> **Verification status:** Partially Verified (middleware behaviour confirmed; no standalone HTTP surface)
> **Verification basis:** `docs/FLOWS/_verification/analysis-report.md` — kyc-service section; `docs/enabler/ENABLER_SERVICE_SYSTEM.md`
> **Canonical source:** `docs/FLOWS/kyc/user-flow/enabler-flows.md`
> **Corresponding frontend guide:** `docs/FLOWS/kyc/frontend-guide/enabler-guide.md`

---

> ⚠️ **KYC Architecture Clarification — REQUIRED READING**
>
> KYC-service has **NO standalone HTTP surface**. There are **no `/api/kyc/*` routes** of any kind.
>
> KYC is enforced as `requireKycLevel(N)` middleware imported **directly from kyc-service** into enabler-service and payout-service routes. This is an **in-process gate** — not a separate HTTP call. There is no `compliance-service`.

---

## Flows in This Document

| Flow ID | Flow Name | Status | Primary Endpoint |
|---------|-----------|--------|-----------------|
| KYC-ENB-01 | KYC Gate on Enabler Listing Creation | Partially Verified | `POST /api/enabler/enablers/:enablerId/listings` (in-process KYC check) |
| KYC-ENB-02 | KYC Gate on Enabler Payout | Partially Verified | `POST /api/payout/payouts` (in-process KYC check) |
| KYC-ENB-03 | KYC Status Change Effect on Enabler Capabilities | Partially Verified | `kyc.status_changed` event |

---

## Flow KYC-ENB-01: KYC Gate on Enabler Listing Creation

| Field | Value |
|-------|-------|
| **Actor** | Enabler |
| **Trigger** | Enabler attempts to create a product listing |
| **Preconditions** | Enabler is `ACTIVE` status. KYC level must be ≥ 1 to pass the gate. Listing capacity not exhausted. |
| **Terminal states** | **Pass:** listing created with status `ACTIVE` (201). **Fail:** 422 `KYC_LEVEL_REQUIRED` or `KYC_LISTING_CAP_REACHED`. |
| **Verification status** | Partially Verified |

### Happy Path

| Step | Actor/System | Action | Endpoint Method + Path | Auth | Expected Response |
|------|-------------|--------|------------------------|------|-------------------|
| 1 | Enabler | Create a product listing | `POST /api/enabler/enablers/:enablerId/listings` | Enabler JWT | 201 `{ success: true, data: { listingId, status: "ACTIVE" } }` |

### Service Interaction Chain

The enabler listing route runs two sequential in-process guards before the handler:

1. **`authorizeEnabler` middleware** — verifies the enabler profile is `ACTIVE`. Any other status returns `403 STATUS_NOT_PERMITTED`.
2. **`requireKycLevel(1)` middleware** — checks that the authenticated user's KYC level is ≥ 1. Failure returns `422 KYC_LEVEL_REQUIRED`.
3. **`requireKycListingCapacity` middleware** — counts existing `enabler_ProductListing` records for this enabler and enforces the tier-based cap. Failure returns `422 KYC_LISTING_CAP_REACHED`.

If all three guards pass, `ListProductUseCase` creates the listing record linked to the catalog product.

There is no call to any `/api/kyc/*` endpoint. The KYC check is entirely in-process inside enabler-service using an imported function from kyc-service.

### Unhappy Path Branches

| Trigger | System Response | Error Code | Terminal State |
|---------|----------------|------------|----------------|
| Enabler KYC level < 1 | 422 — middleware gate rejected | `KYC_LEVEL_REQUIRED` | No listing created |
| Enabler has reached max allowed listings | 422 — capacity gate rejected | `KYC_LISTING_CAP_REACHED` | No listing created |
| Enabler status is not `ACTIVE` | 403 — `authorizeEnabler` rejects | `STATUS_NOT_PERMITTED` | No listing created |
| No JWT or expired token | 401 unauthorized | — | No listing created |

---

## Flow KYC-ENB-02: KYC Gate on Enabler Payout

| Field | Value |
|-------|-------|
| **Actor** | Enabler |
| **Trigger** | Enabler requests a payout of accumulated earnings |
| **Preconditions** | Enabler is authenticated. KYC level must be ≥ 2 to request a payout. |
| **Terminal states** | **Pass:** payout initiated with status `PENDING` (201). **Fail:** 422 `KYC_LEVEL_INSUFFICIENT`. |
| **Verification status** | Partially Verified |

### Happy Path

| Step | Actor/System | Action | Endpoint Method + Path | Auth | Expected Response |
|------|-------------|--------|------------------------|------|-------------------|
| 1 | Enabler | Request payout | `POST /api/payout/payouts` | Enabler JWT | 201 `{ data: { payoutId, status: "PENDING" } }` |

### Service Interaction Chain

`requireKycLevel(2)` is applied as in-process middleware in payout-service. If the enabler's KYC level is ≥ 2, the gate passes and `InitiatePayoutUseCase` proceeds: eligibility is checked, funds are frozen in the wallet, debited, and credited via the payout saga. If the level is insufficient, the middleware short-circuits with `422` before any wallet interaction.

### Unhappy Path Branches

| Trigger | System Response | Error Code | Terminal State |
|---------|----------------|------------|----------------|
| Enabler KYC level < 2 | 422 — middleware gate rejected | `KYC_LEVEL_INSUFFICIENT` | No payout initiated |
| Insufficient wallet balance | 422 — business rule error | — | No payout initiated |
| No JWT or expired token | 401 unauthorized | — | No payout initiated |

---

## Flow KYC-ENB-03: KYC Status Change Effect on Enabler Capabilities

| Field | Value |
|-------|-------|
| **Actor** | System (event-driven — no direct enabler API call) |
| **Trigger** | `kyc.status_changed` event emitted by kyc-service when an enabler's KYC level changes |
| **Preconditions** | KYC review process has completed (approved or revoked). |
| **Terminal states** | Downstream in-process gates reflect the new KYC level on the next request; previously blocked listing creation and payout actions become available |
| **Verification status** | Partially Verified |

### Happy Path

| Step | Actor/System | Action | Endpoint Method + Path | Auth | Expected Response |
|------|-------------|--------|------------------------|------|-------------------|
| 1 | kyc-service | Publish KYC level change | `kyc.status_changed` event (internal event bus) | — | Consumed by order-service; KYC level updated in store |
| 2 | Enabler (subsequent action) | Create product listing | `POST /api/enabler/enablers/:enablerId/listings` | Enabler JWT | 201 — `requireKycLevel(1)` now passes |
| 3 | Enabler (subsequent action) | Request payout | `POST /api/payout/payouts` | Enabler JWT | 201 — `requireKycLevel(2)` now passes (if level ≥ 2) |

### Service Interaction Chain

When kyc-service completes a review and the enabler's KYC level changes, it publishes `kyc.status_changed` with the new level. order-service consumes this event for COD trust signal updates. Enabler-service and payout-service do not consume this event directly — the new KYC level is read live from the stored KYC record by the `requireKycLevel(N)` middleware on each subsequent request. Previously blocked actions therefore become available immediately on the next call.

### What Changes When KYC Is Approved

| Action | Before KYC Level 1 | After KYC Level 1 | After KYC Level 2 |
|--------|--------------------|-------------------|-------------------|
| `POST /api/enabler/enablers/:enablerId/listings` | 422 `KYC_LEVEL_REQUIRED` | ✓ Listing creation allowed | ✓ |
| `POST /api/payout/payouts` | 422 `KYC_LEVEL_INSUFFICIENT` | 422 (still insufficient) | ✓ Payout allowed |

### Unhappy Path Branches

| Trigger | System Response | Error Code | Terminal State |
|---------|----------------|------------|----------------|
| KYC level revoked / drops below required | `requireKycLevel(N)` rejects on next request | `KYC_LEVEL_REQUIRED` / `KYC_LEVEL_INSUFFICIENT` | Gated actions blocked again |
| `kyc.status_changed` processing failure | Downstream services may not see updated level immediately | — | Event redelivery handles retry |
