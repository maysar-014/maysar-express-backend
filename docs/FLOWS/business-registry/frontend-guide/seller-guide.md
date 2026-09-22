# Seller Guide — Business Registry Service

> Mirrors: `docs/FLOWS/business-registry/user-flow/seller-flows.md`
> Verification status: Mixed (register/view Verified; most public sub-routes Missing)
> Last updated: September 2026

## Overview

Business registration UI for sellers.

---

## Flow 1: Register Business

**Action:** `POST /api/business-registry/businesses`

**UI States:** Form | Loading | Success (show business ID + status) | Duplicate (409) | Error

Show: businessName, businessType, registrationNumber, address fields. On success: "Business registered — status: Pending Verification."

---

## Flow 2: View Business Details

**Action:** `GET /api/business-registry/businesses/:id`

Show verification status badge:

| Status | Badge |
|---|---|
| PENDING_VERIFICATION | "Under review" (amber) |
| VERIFIED | "Verified ✓" (green) |
| REJECTED | "Rejected — see reason" (red) |

---

## Flow 3: Public Seller Profile

**Action:** `GET /api/business-registry/public/sellers/{sellerId}` (unauthenticated)

Show public business name, verification status, and shareable profile URL.

---

## ⚠️ Known Gap — Most Public Sub-Routes Missing

> Most `/api/business-registry/public/*` sub-routes return route-level 404. Only `GET /api/business-registry/public/sellers/{sellerId}` is confirmed working.
>
> `POST /api/business-registry/public` → **405 METHOD_NOT_ALLOWED** — do not call.
>
> Do not build a public business discovery browser until these routes are confirmed active.
