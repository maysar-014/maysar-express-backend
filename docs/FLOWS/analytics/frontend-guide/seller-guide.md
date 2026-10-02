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

## ✅ Resolved — Action Item Resolution (DEF-003)

> `PATCH /api/analytics/action-items/{actionId}/resolve` now returns `200 {success:true}` for existing action items and `404 {success:false, error:"Action item not found"}` for unknown ids (previously an unhandled `500`).
>
> **UI treatment:**
> - Keep the "Mark as resolved" / "Resolve" button enabled.
> - On `200`, remove the item from the list optimistically.
> - On `404`, the action item no longer exists — refresh the action items list instead of showing an error.
> - Only show a generic error message on `5xx`.
>
> **Tracked in:** `docs/FLOWS/_verification/defect-register.md` (DEF-003)
