# Admin Flows — Analytics Service

> **Verification status:** Verified — Live-verified 2026-11-06 against `run-lifecycle-checks.mjs` (LC-09, LC-20)
> **Verification basis:** `scripts/verification/run-lifecycle-checks.mjs` LC-09/LC-20 (2026-11-06); `docs/FLOWS/_verification/analysis-report.md` (September 2026); DEF-003 resolved
> **Last updated:** 2026-11-06 (corrected: DEF-003 resolve endpoint now 200/404; added MSS-001 admin job trigger)

## Overview

This document covers analytics-service flows from the admin's perspective: platform KPI monitoring, red flags dashboard, founder OS view, seller profitability oversight, action item resolution, and on-demand job triggering. The action item resolution endpoint was previously 500 FAILING (DEF-003 — resolved); it now returns 200/404.

---

## Flow Index

| # | Flow Name | Verification Status | Primary Endpoint |
|---|---|---|---|
| 1 | Platform KPIs | Verified | `GET /api/analytics/platform/kpis` |
| 2 | Red Flags Dashboard | Verified | `GET /api/analytics/admin/dashboard/red-flags` |
| 3 | Founder OS View | Verified | `GET /api/analytics/admin/dashboard/founder-operating-system` |
| 4 | Seller Profitability | Verified | `GET /api/analytics/seller-profitability/dashboard` |
| 5 | Resolve Action Item | Verified (DEF-003 resolved) | `PATCH /api/analytics/action-items/:actionId/resolve` |
| 6 | Trigger Action Center Generation | Verified | `POST /api/analytics/admin/jobs/action-center` |

---

## Flow 1: Platform KPIs

### Happy Path

| Step | Actor/System | Action | Endpoint | Auth | Expected Response |
|---|---|---|---|---|---|
| 1 | Admin | Fetch platform KPIs | `GET /api/analytics/platform/kpis` | Bearer JWT (admin) | 200 — GMV, active users, active sellers, order count, conversion rate, AOV, COD acceptance rate, delivery success rate |

---

## Flow 2: Red Flags Dashboard

### Happy Path

| Step | Actor/System | Action | Endpoint | Auth | Expected Response |
|---|---|---|---|---|---|
| 1 | Admin | Fetch red flags | `GET /api/analytics/admin/dashboard/red-flags` | Bearer JWT (admin) | 200 — anomaly flags, threshold breaches, suspicious patterns |

---

## Flow 3: Founder OS View

### Happy Path

| Step | Actor/System | Action | Endpoint | Auth | Expected Response |
|---|---|---|---|---|---|
| 1 | Admin | Fetch founder OS view | `GET /api/analytics/admin/dashboard/founder-operating-system` | Bearer JWT (admin) | 200 — cohort analysis, retention curves, GMV breakdown |

---

## Flow 4: Seller Profitability

### Happy Path

| Step | Actor/System | Action | Endpoint | Auth | Expected Response |
|---|---|---|---|---|---|
| 1 | Admin | Fetch aggregate seller profitability | `GET /api/analytics/seller-profitability/dashboard` | Bearer JWT (admin) | 200 — platform-wide profitability metrics |
| 2 | Admin | Check revenue health | `GET /api/analytics/seller-profitability/revenue-health` | Bearer JWT (admin) | 200 — revenue health signals |
| 3 | Admin | Check retention metrics | `GET /api/analytics/seller-profitability/retention` | Bearer JWT (admin) | 200 — buyer retention data |

---

## Flow 5: Resolve Action Item

> ✅ **DEF-003 resolved (2026-11-06):** This endpoint was previously 500 FAILING. It now returns 200 on success and 404 when the action item does not exist.

### Happy Path

| Step | Actor/System | Action | Endpoint | Auth | Expected Response |
|---|---|---|---|---|---|
| 1 | Admin or Seller | Mark action item resolved | `PATCH /api/analytics/action-items/:actionId/resolve` | Bearer JWT | 200 `{ success: true }` |

### Unhappy Path Branches

| Trigger | System Response | Error Code |
|---|---|---|
| `actionId` not found | 404 `{ success: false, error: "Action item not found" }` | `ACTION_ITEM_NOT_FOUND` |
| Server error | 500 | `INTERNAL_SERVER_ERROR` |

---

## Flow 6: Trigger Action Center Generation (Admin On-Demand)

> ✅ **MSS-001 — New endpoint added 2026-11-06** (`services/analytics-service/src/api/routes/sellerDashboardRoutes.ts`).
> Previously, `ActionCenterGenerationJob` ran only on a 60-minute schedule, meaning action items were never available during a fresh lifecycle run. This endpoint triggers the job synchronously for all active sellers.

### Summary

| Field | Value |
|---|---|
| Actor | Admin |
| Trigger | Ops tooling or lifecycle verification needs fresh action items immediately |
| Preconditions | Authenticated (Bearer JWT, admin role) |
| Terminal states (success) | 200 — job completed; `analytics_SellerActionItem` rows upserted for all active sellers |
| Terminal states (failure) | 403 if non-admin; 500 if job throws |

### Happy Path

| Step | Actor/System | Action | Endpoint | Auth | Expected Response |
|---|---|---|---|---|---|
| 1 | Admin | Trigger action center generation | `POST /api/analytics/admin/jobs/action-center` | Bearer JWT (admin) | 200 `{ success: true, data: { sellersProcessed: N }, message: "ActionCenterGenerationJob completed" }` |
| 2 | analytics-service | Runs `ActionCenterGenerationJob.execute()` for all `ACTIVE` sellers | — | — | Low-stock, pending-inquiry, low-conversion action items upserted |
| 3 | Admin | Fetches seller dashboard to see generated action items | `GET /api/analytics/sellers/:sellerId/dashboard` | Bearer JWT | Action items embedded in response |

### When to Use

- Lifecycle verification: trigger before checking `action-items/:id/resolve`
- Ops: trigger when a seller reports their action center is empty after a bulk inventory change
- Testing: trigger to seed action items without waiting for the hourly scheduler

### Unhappy Path Branches

| Trigger | System Response | Error Code |
|---|---|---|
| Caller is not admin | 403 `{ success: false, error: "Admin only" }` | — |
| Job throws internally | 500 `{ success: false, error: "..." }` | — |
