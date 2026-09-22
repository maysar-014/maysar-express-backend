# Admin Flows — Analytics Service

> **Verification status:** Partially Verified (read endpoints); Failing (`PATCH /api/analytics/action-items/{actionId}/resolve` → 500)
> **Verification basis:** `docs/FLOWS/_verification/analysis-report.md` (September 2026); `docs/analytics/ANALYTICS_SERVICE_SYSTEM.md`
> **Last updated:** September 2026

## Overview

This document covers analytics-service flows from the admin's perspective: platform KPI monitoring, red flags dashboard, founder OS view, and seller profitability oversight. The action item resolution endpoint is 500 FAILING.

---

## Flow Index

| # | Flow Name | Verification Status | Primary Endpoint |
|---|---|---|---|
| 1 | Platform KPIs | Partially Verified | `GET /api/analytics/platform/kpis` |
| 2 | Red Flags Dashboard | Partially Verified | `GET /api/analytics/admin/dashboard/red-flags` |
| 3 | Founder OS View | Partially Verified | `GET /api/analytics/admin/dashboard/founder-operating-system` |
| 4 | Seller Profitability | Partially Verified | `GET /api/analytics/seller-profitability/dashboard` |
| 5 | Resolve Action Item | ⚠️ FAILING | `PATCH /api/analytics/action-items/:actionId/resolve` |

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

## Known Gap — Action Item Resolution (500 FAILING)

> ⚠️ **Known Gap — Not Yet Verified**
>
> `PATCH /api/analytics/action-items/{actionId}/resolve` → **500 FAILING** in the September 2026 sweep.
>
> **UI fallback:** Action item resolution is unavailable. Show read-only list with disabled resolve button: "Action resolution temporarily unavailable."
>
> **Tracked in:** `docs/FLOWS/_verification/analysis-report.md`
