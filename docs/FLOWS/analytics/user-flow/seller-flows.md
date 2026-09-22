# Seller Flows — Analytics Service

> **Verification status:** Partially Verified (read endpoints); Failing (`PATCH /api/analytics/action-items/{actionId}/resolve` → 500)
> **Verification basis:** `docs/FLOWS/_verification/analysis-report.md` (September 2026); `docs/analytics/ANALYTICS_SERVICE_SYSTEM.md`
> **Last updated:** September 2026

## Overview

This document covers analytics-service flows from the seller's perspective: viewing sales dashboard metrics, checking SLA performance, and managing action items. The action item resolution endpoint is **500 FAILING** — sellers can view action items but not resolve them.

---

## Flow Index

| # | Flow Name | Verification Status | Primary Endpoint |
|---|---|---|---|
| 1 | View Seller Dashboard | Partially Verified | `GET /api/analytics/dashboard` (seller-scoped) |
| 2 | View SLA Metrics | Partially Verified | `GET /api/analytics/sellers/:sellerId/sla` |
| 3 | View Action Items | Partially Verified | `GET /api/analytics/action-items` |
| 4 | Resolve Action Item | ⚠️ FAILING | `PATCH /api/analytics/action-items/:actionId/resolve` |

---

## Flow 1: View Seller Dashboard

### Summary

| Field | Value |
|---|---|
| Actor | Seller |
| Trigger | Seller opens their sales analytics dashboard |
| Preconditions | Authenticated (Bearer JWT, seller role) |
| Terminal states | 200 — seller-scoped metrics |
| Verification status | Partially Verified |

### Happy Path

| Step | Actor/System | Action | Endpoint | Auth | Expected Response |
|---|---|---|---|---|---|
| 1 | Seller | Fetch dashboard data | `GET /api/analytics/seller-profitability/dashboard` | Bearer JWT | 200 — profitability metrics, GMV, conversion |
| 2 | Seller | Fetch revenue health | `GET /api/analytics/seller-profitability/revenue-health` | Bearer JWT | 200 — revenue health signals |

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
| Verification status | Partially Verified |

### Happy Path

| Step | Actor/System | Action | Endpoint | Auth | Expected Response |
|---|---|---|---|---|---|
| 1 | Seller | Fetch action items | `GET /api/analytics/action-items` | Bearer JWT | 200 `{ actionItems[] }` |

---

## Known Gap — Action Item Resolution (500 FAILING)

> ⚠️ **Known Gap — Not Yet Verified**
>
> `PATCH /api/analytics/action-items/{actionId}/resolve` → **500 FAILING** in the September 2026 sweep.
>
> Sellers can view action items but cannot resolve them.
>
> **UI fallback:** Show action items in a read-only list. Disable the "Mark as resolved" button with tooltip: "Action resolution temporarily unavailable."
>
> **Tracked in:** `docs/FLOWS/_verification/analysis-report.md`
