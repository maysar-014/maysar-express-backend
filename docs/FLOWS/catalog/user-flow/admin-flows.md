# Admin Flows — Catalog Service

> **Verification status:** Partially Verified (role gates confirmed by sweep; buy-box anomaly deletion Failing)
> **Verification basis:** `docs/FLOWS/_verification/analysis-report.md` (September 2026); `docs/catalog/CATALOG_SERVICE_SYSTEM.md`
> **Canonical source:** `docs/FLOWS/catalog/user-flow/admin-flows.md`
> **Corresponding frontend guide:** `docs/FLOWS/catalog/frontend-guide/admin-guide.md`

## Overview

This document covers catalog-service flows from the platform admin's perspective: category management, buy-box oversight, pricing rules, review moderation, and product intervention. Admin authorization is enforced with `requireRole(['admin'])` (or `requireRole(['admin', 'operator'])` for buy-box management) — the September sweep confirmed every gate by probing as `buyer` and receiving **403** on each write endpoint.

---

## Flow Index

| # | Flow Name | Verification Status | Primary Endpoint |
|---|---|---|---|
| 1 | Manage Categories | Partially Verified (role gate confirmed) | `POST/PUT/DELETE /api/catalog/v1/categories` |
| 2 | Buy-Box Strategy & Overrides | Partially Verified (role gate confirmed) | `PUT /api/catalog/v1/admin/buy-box/strategies/:categoryId` |
| 3 | Review Buy-Box History | Verified | `GET /api/catalog/v1/admin/buy-box/history/:productId` |
| 4 | Clear Buy-Box Anomaly Flag | ⚠️ FAILING | `DELETE /api/catalog/v1/admin/buy-box/anomaly-flags/:flagId` |
| 5 | Manage Pricing Rules | Partially Verified (role gate confirmed) | `POST /api/catalog/v1/pricing/rules` |
| 6 | Moderate Reviews | Partially Verified (role gate confirmed) | `PUT /api/catalog/v1/reviews/:reviewId/moderate` |
| 7 | Match Audit | Verified | `GET /api/catalog/match/audit/:productId` |

---

## Flow 1: Manage Categories

### Summary

| Field | Value |
|---|---|
| Actor | Admin |
| Trigger | Admin creates, renames, or removes a product category |
| Preconditions | Authenticated (Bearer JWT, `admin` role) |
| Terminal states (success) | Category record created/updated/deleted |
| Terminal states (failure) | 403 for non-admin roles (sweep: buyer → 403 confirmed); 404 data-level if `:id` unknown |
| Verification status | Partially Verified — role gate confirmed in sweep |

### Happy Path

| Step | Actor/System | Action | Endpoint | Auth | Expected Response |
|---|---|---|---|---|---|
| 1 | Admin | Creates a category | `POST /api/catalog/v1/categories` | Bearer JWT (admin) | 201/200 — category created |
| 2 | Admin | Renames or reorders a category | `PUT /api/catalog/v1/categories/:id` | Bearer JWT (admin) | 200 — updated |
| 3 | Admin | Removes a category | `DELETE /api/catalog/v1/categories/:id` | Bearer JWT (admin) | 200 — deleted (fails with a conflict if products still reference it) |

### Unhappy Path Branches

| Trigger Condition | System Response | HTTP Status | Error Code |
|---|---|---|---|
| Non-admin caller (buyer sweep probe) | 403 | 403 | `FORBIDDEN` |
| Category id not found | 404 data-level | 404 | `NOT_FOUND` |
| Products still reference the category | Conflict | 409 | category-in-use |

---

## Flow 2: Buy-Box Strategy & Overrides

### Summary

| Field | Value |
|---|---|
| Actor | Admin / operator |
| Trigger | Admin tunes ranking weights per category or applies a manual buy-box override |
| Preconditions | Authenticated (Bearer JWT, `admin` or `operator` role — `requireRole(['admin','operator'])`) |
| Terminal states (success) | Strategy upserted / override applied |
| Terminal states (failure) | 403 for other roles; 400 validation |
| Verification status | Partially Verified — sweep admin probe reached validation (400), confirming the route is reachable and role-admitted |

### Happy Path

| Step | Actor/System | Action | Endpoint | Auth | Expected Response |
|---|---|---|---|---|---|
| 1 | Admin | Upserts category ranking weights | `PUT /api/catalog/v1/admin/buy-box/strategies/:categoryId` | Bearer JWT (admin/operator) | 200 — strategy saved |
| 2 | Admin | Applies a manual override pinning a winner | `POST /api/catalog/v1/admin/buy-box/overrides` | Bearer JWT (admin/operator) | 200/201 — override recorded |
| 3 | Admin | Reviews prior state | `GET /api/catalog/v1/admin/buy-box/history/:productId` | Bearer JWT (admin/operator) | 200 — history list (sweep: 200) |

---

## Flow 3: Review Buy-Box History

| Step | Actor/System | Action | Endpoint | Auth | Expected Response |
|---|---|---|---|---|---|
| 1 | Admin | Fetches winner history for a product | `GET /api/catalog/v1/admin/buy-box/history/:productId` | Bearer JWT (admin/operator) | 200 — history entries (sweep: 200) |

---

## Flow 4: Clear Buy-Box Anomaly Flag — ⚠️ FAILING

> ⚠️ **Known Gap — Not Yet Verified**
>
> `DELETE /api/catalog/v1/admin/buy-box/anomaly-flags/:flagId` → **500 FAILING** in the September 2026 sweep (admin probe).
>
> **UI fallback:** render anomaly flags read-only with the delete action disabled: "Flag clearing is temporarily unavailable."
>
> **Tracked in:** `docs/FLOWS/_verification/analysis-report.md`

---

## Flow 5: Manage Pricing Rules

### Summary

| Field | Value |
|---|---|
| Actor | Admin |
| Trigger | Admin creates pricing rules or runs bulk price updates |
| Preconditions | Authenticated (Bearer JWT, `admin` role — `adminMiddleware`) |
| Terminal states (success) | Rule created / bulk update applied |
| Terminal states (failure) | 403 for non-admin (sweep: buyer → 403 on `POST /pricing/rules` and `POST /pricing/bulk-update`) |
| Verification status | Partially Verified — role gates confirmed; buyer-safe reads (`GET /pricing/rules`, `POST /pricing/calculate`, `POST /pricing/validate-rule`) returned 200 in the sweep |

### Happy Path

| Step | Actor/System | Action | Endpoint | Auth | Expected Response |
|---|---|---|---|---|---|
| 1 | Admin | Creates a pricing rule | `POST /api/catalog/v1/pricing/rules` | Bearer JWT (admin) | 201/200 — rule created |
| 2 | Admin | Bulk-updates prices | `POST /api/catalog/v1/pricing/bulk-update` | Bearer JWT (admin) | 200 — update applied |
| 3 | Admin | Updates one product's price | `PUT /api/catalog/v1/products/:productId/pricing` | Bearer JWT (admin) | 200 — price updated |
| 4 | Admin | Reviews pricing analytics | `GET /api/catalog/v1/pricing/analytics` | Bearer JWT (admin) | 200 — analytics payload |

---

## Flow 6: Moderate Reviews

### Summary

| Field | Value |
|---|---|
| Actor | Admin |
| Trigger | Admin approves or rejects a product review |
| Preconditions | Authenticated (Bearer JWT, `admin` role) |
| Terminal states (success) | Review visibility updated |
| Terminal states (failure) | 403 for other roles (sweep: buyer → 403 confirmed) |
| Verification status | Partially Verified — role gate confirmed |

### Happy Path

| Step | Actor/System | Action | Endpoint | Auth | Expected Response |
|---|---|---|---|---|---|
| 1 | Admin | Moderates the review | `PUT /api/catalog/v1/reviews/:reviewId/moderate` | Bearer JWT (admin) | 200 — moderation decision applied |

> Review **creation** and **listing** are buyer/seller surfaces — see `docs/FLOWS/catalog/user-flow/buyer-flows.md`.

---

## Flow 7: Match Audit

| Step | Actor/System | Action | Endpoint | Auth | Expected Response |
|---|---|---|---|---|---|
| 1 | Admin | Fetches the match/audit record for a product | `GET /api/catalog/match/audit/:productId` | Bearer JWT (admin) | 200 (sweep: 200) |

Pending confirmations are listed at `GET /api/catalog/match/pending`; confirm via `POST /api/catalog/match/confirm/:confirmationId` (sweep: buyer probe → 404 data-level, route reachable).

---

## Known Gaps

| Gap | Evidence | UI Fallback |
|---|---|---|
| `DELETE /v1/admin/buy-box/anomaly-flags/:flagId` → 500 | September 2026 sweep (admin) | Read-only flags; disable delete |
| `GET /v1/search`, `GET /v1/search/products` → **301 redirect** | September 2026 sweep | Call the canonical `/v1/products/search?q=` directly |
| `POST /api/catalog/system/maintenance/*` → route-level **404** | September 2026 sweep (admin probe → 404) | Do not expose catalog outbox cleanup in admin UI until mounted |

---

## Cross-References

| Document | Scope |
|---|---|
| `docs/FLOWS/catalog/frontend-guide/admin-guide.md` | Admin UI states and error handling |
| `docs/FLOWS/catalog/user-flow/seller-flows.md` | Seller product CRUD (the surface admins occasionally override) |
| `docs/FLOWS/analytics/user-flow/admin-flows.md` | Buy-box anomaly *detection* dashboards (analytics side) |
| `docs/catalog/CATALOG_SERVICE_SYSTEM.md` | Authoritative catalog service reference |
| `docs/FLOWS/_verification/analysis-report.md` | September 2026 endpoint sweep — verification evidence |

