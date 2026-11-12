> **Corrected by flow audit:** October 2026
> - Flow Index table corrected: `/api/analytics/dashboard` → `/api/analytics/seller-profitability/dashboard`
> - Flow Index: `GET /api/analytics/action-items` → `GET /api/analytics/sellers/:sellerId/dashboard/action-center`
> - Flow 3 body: standalone `/api/analytics/action-items` route does not exist; action items are returned under `actionCenter` key from the dashboard, or via the dedicated action-center sub-route

# Seller Flows — Analytics Service

> **Verification status:** Verified (October 2026 live lifecycle run — 52/52 steps pass)
> **Verification basis:** `docs/FLOWS/_verification/analysis-report.md` (September 2026); October 2026 lifecycle verification run
> **Last updated:** October 2026

## Overview

This document covers analytics-service flows from the seller's perspective: viewing sales dashboard metrics, checking SLA performance, and managing action items. The action item resolution endpoint previously returned **500** for unknown action item ids and now returns **404** (DEF-003) — resolving an existing action item returns `200 {success:true}`.

---

## Flow Index

| # | Flow Name | Verification Status | Primary Endpoint |
|---|---|---|---|
| 1 | View Seller Dashboard | ✅ Verified | `GET /api/analytics/sellers/:sellerId/dashboard` |
| 2 | View SLA Metrics | ✅ Verified | `GET /api/analytics/sellers/:sellerId/sla` |
| 3 | View Action Items | ✅ Verified | `GET /api/analytics/sellers/:sellerId/dashboard/action-center` |
| 4 | Resolve Action Item | ✅ Verified | `PATCH /api/analytics/action-items/:actionId/resolve` |
| 5 | View Profitability Dashboard | ✅ Verified | `GET /api/analytics/seller-profitability/dashboard` |
| 6 | View Revenue Health | ✅ Verified | `GET /api/analytics/seller-profitability/revenue-health` |

---

## Flow 1: View Seller Dashboard

### Summary

| Field | Value |
|---|---|
| Actor | Seller |
| Trigger | Seller opens their sales analytics dashboard |
| Preconditions | Authenticated (Bearer JWT, seller role) |
| Terminal states | 200 — seller-scoped metrics |
| Verification status | ✅ Verified |

### Happy Path

| Step | Actor/System | Action | Endpoint | Auth | Expected Response |
|---|---|---|---|---|---|
| 1 | Seller | Fetch full dashboard (includes GMV, orders, action items) | `GET /api/analytics/sellers/:sellerId/dashboard` | Bearer JWT | 200 — metrics, actionCenter, liveOrders |
| 2 | Seller | Fetch profitability dashboard | `GET /api/analytics/seller-profitability/dashboard` | Bearer JWT | 200 — profitability metrics, GMV, conversion |
| 3 | Seller | Fetch revenue health | `GET /api/analytics/seller-profitability/revenue-health` | Bearer JWT | 200 — revenue health signals |

---

## Flow 2: View SLA Metrics

### Summary

| Field | Value |
|---|---|
| Actor | Seller |
| Trigger | Seller checks their SLA performance |
| Preconditions | Authenticated (Bearer JWT, seller role) |
| Terminal states | 200 — SLA metrics and breach history |
| Verification status | Partially Verified |

### Happy Path

| Step | Actor/System | Action | Endpoint | Auth | Expected Response |
|---|---|---|---|---|---|
| 1 | Seller | Fetch SLA summary | `GET /api/analytics/sellers/:sellerId/sla` | Bearer JWT | 200 — SLA metrics |
| 2 | Seller | Fetch SLA breaches | `GET /api/analytics/sellers/:sellerId/sla/breaches` | Bearer JWT | 200 — breach history |

---

## Flow 3: View Action Items

### Summary

| Field | Value |
|---|---|
| Actor | Seller |
| Trigger | Seller checks for platform-generated action items |
| Preconditions | Authenticated (Bearer JWT, seller role) |
| Terminal states | 200 — list of open action items |
| Verification status | ✅ Verified |

### Happy Path

| Step | Actor/System | Action | Endpoint | Auth | Expected Response |
|---|---|---|---|---|---|
| 1 | Seller | Fetch action items via dedicated sub-route | `GET /api/analytics/sellers/:sellerId/dashboard/action-center` | Bearer JWT | 200 `{ actionCenter[] }` |
| alt | Seller | Action items are also embedded in the full dashboard | `GET /api/analytics/sellers/:sellerId/dashboard` | Bearer JWT | 200 — dashboard includes `actionCenter` array |

> **Note:** There is no standalone `GET /api/analytics/action-items` route. The October 2026 audit confirmed action items are served either via the full dashboard response (`data.actionCenter`) or the dedicated sub-route `/dashboard/action-center`. The `PATCH /action-items/:actionId/resolve` endpoint is separate and works independently.

---

## Resolved — Action Item Resolution (DEF-003)

> ✅ **Resolved:** `PATCH /api/analytics/action-items/{actionId}/resolve` previously raised an unhandled Prisma error (`P2025`) and answered **500** for action item ids that do not exist.
>
> **Current behaviour:**
> - Existing action item → `200 {success:true}` (sets `isResolved: true`)
> - Unknown action item id → `404 {success:false, error:"Action item not found"}`
> - Genuine infrastructure failure → `500 {error:"Failed to resolve action item"}`
>
> **UI handling:** Keep the "Mark as resolved" button enabled. Treat `404` as a stale list (refresh the action items) rather than a server error.
>
> **Tracked in:** `docs/FLOWS/_verification/defect-register.md` (DEF-003)
