# Seller Guide — Analytics Service

> Mirrors: `docs/FLOWS/analytics/user-flow/seller-flows.md`
> Verification status: Partially Verified (read endpoints); Failing (action item resolve)
> Last updated: September 2026

## Overview

Analytics dashboard UI for sellers: sales metrics, SLA performance, and action items. All screens are read-only — action item resolution is blocked by a known gap.

---

## Flow 1: Dashboard

**Action:** `GET /api/analytics/seller-profitability/dashboard`

**UI States:** Loading (skeleton charts) | Data rendered | Error ("Analytics temporarily unavailable. Please try again.")

Show GMV, conversion rate, revenue health indicators.

---

## Flow 2: SLA Metrics

**Action:** `GET /api/analytics/sellers/:sellerId/sla` + `GET /api/analytics/sellers/:sellerId/sla/breaches`

Show SLA compliance rate, breach history list with dates and order references.

---

## Flow 3: Action Items

**Action:** `GET /api/analytics/action-items`

Show action items list with type and priority.

## ⚠️ Known Gap — Action Item Resolution (500 FAILING)

> `PATCH /api/analytics/action-items/{actionId}/resolve` → **500 FAILING**
>
> **UI treatment:**
> - Show action items in a read-only list
> - Disable the "Mark as resolved" / "Resolve" button
> - Show tooltip on hover: "Action resolution is temporarily unavailable"
> - Do NOT hide the resolve button entirely — sellers should see that it exists but is unavailable
