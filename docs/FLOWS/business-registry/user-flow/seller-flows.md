# Seller Flows — Business Registry Service

> **Verification status:** Mixed (Register and View Verified; most public sub-routes Missing)
> **Verification basis:** `docs/FLOWS/_verification/analysis-report.md` (September 2026); `docs/business-registry/BUSINESS_REGISTRY_SERVICE_SYSTEM.md`
> **Last updated:** September 2026

## Overview

This document covers business-registry-service flows from the seller's perspective: registering a business entity, viewing business details, and accessing the public seller profile. Most `/api/business-registry/public/*` sub-routes return route-level 404 — only the public seller profile endpoint is confirmed working.

---

## Flow Index

| # | Flow Name | Verification Status | Primary Endpoint |
|---|---|---|---|
| 1 | Register Business | Verified | `POST /api/business-registry/businesses` |
| 2 | View Business Details | Verified (data-level 404) | `GET /api/business-registry/businesses/:id` |
| 3 | Public Seller Profile | Verified (data-level 404) | `GET /api/business-registry/public/sellers/{sellerId}` |

---

## Flow 1: Register Business

### Summary

| Field | Value |
|---|---|
| Actor | Seller |
| Trigger | Seller completes account setup and registers their business entity |
| Preconditions | Authenticated (Bearer JWT, seller role); no existing business for this seller |
| Terminal states | 201 — business record created; seller can now list products |
| Verification status | Verified |

### Happy Path

| Step | Actor/System | Action | Endpoint | Auth | Expected Response |
|---|---|---|---|---|---|
| 1 | Seller | Submit business registration | `POST /api/business-registry/businesses` | Bearer JWT | 201 `{ businessId, status: "PENDING_VERIFICATION" }` |
| 2 | business-registry-service | Creates business record | Internal | — | Record persisted |

### Request Body

```json
{
  "businessName": "Acme Supplies Ltd",
  "businessType": "LLC",
  "registrationNumber": "TZ123456",
  "address": { "street": "...", "city": "Dar es Salaam", "country": "TZ" },
  "documents": []
}
```

### Unhappy Path Branches

| Trigger | System Response | Error Code |
|---|---|---|
| Duplicate business registration | 409 | `DUPLICATE_BUSINESS` |
| Invalid registration number | 422 | `VALIDATION_ERROR` |
| JWT missing | 401 | `UNAUTHORIZED` |

---

## Flow 2: View Business Details

### Summary

| Field | Value |
|---|---|
| Actor | Seller |
| Trigger | Seller views their registered business record |
| Preconditions | Authenticated (Bearer JWT, seller role); business belongs to seller |
| Terminal states | 200 — business details; 404 data-level if not found |
| Verification status | Verified (data-level 404 observed in sweep — route exists) |

### Happy Path

| Step | Actor/System | Action | Endpoint | Auth | Expected Response |
|---|---|---|---|---|---|
| 1 | Seller | Fetch business | `GET /api/business-registry/businesses/:id` | Bearer JWT | 200 `{ businessId, businessName, status, documents[], verificationStatus }` |

---

## Flow 3: Public Seller Profile

### Summary

| Field | Value |
|---|---|
| Actor | Buyer (unauthenticated) or Seller |
| Trigger | View a seller's public business profile |
| Preconditions | None (public endpoint) |
| Terminal states | 200 — public profile; 404 data-level if not found |
| Verification status | Verified (data-level 404 observed — route exists) |

### Happy Path

| Step | Actor/System | Action | Endpoint | Auth | Expected Response |
|---|---|---|---|---|---|
| 1 | Buyer/Seller | Fetch public seller profile | `GET /api/business-registry/public/sellers/{sellerId}` | None | 200 — public seller profile |

---

## Known Gap — Most Public Sub-Routes Missing

> ⚠️ **Known Gap:** Most `/api/business-registry/public/*` sub-routes return route-level 404 (Missing) in the September 2026 sweep.
>
> Only `GET /api/business-registry/public/sellers/{sellerId}` is confirmed as Verified.
>
> Additionally: `POST /api/business-registry/public` → **405 METHOD_NOT_ALLOWED** — do not use.
>
> Most seller discovery and public business listing routes are not currently available. UI fallback: show only the individual seller profile endpoint; do not build a business discovery browser until these routes are confirmed.
