# Admin Guide — Analytics Service

> Mirrors: `docs/FLOWS/analytics/user-flow/admin-flows.md`
> Verification status: Partially Verified (read endpoints); Failing (action item resolve)
> Last updated: September 2026

## Overview

Platform analytics UI for admins: KPIs, red flags, founder OS view, seller profitability. All read-only. Action item resolution is blocked.

---

## Flow 1: Platform KPIs

**Action:** `GET /api/analytics/platform/kpis`

Show: GMV, active users, active sellers, order count, conversion rate, AOV, COD acceptance rate, delivery success rate. Use skeleton charts while loading.

---

## Flow 2: Red Flags

**Action:** `GET /api/analytics/admin/dashboard/red-flags`

Show anomaly flags with severity, affected entity, and description. Read-only — no actions available per flag (deletion endpoint is for catalog buy-box flags via a different service).

---

## Flow 3: Founder OS View

**Action:** `GET /api/analytics/admin/dashboard/founder-operating-system`

Show cohort analysis, retention curves, GMV breakdown. Charts and tables.

---

## Flow 4: Seller Profitability

**Action:** `GET /api/analytics/seller-profitability/dashboard`

Show aggregate profitability metrics. Filter by seller if needed.

---

## ⚠️ Known Gap — Action Item Resolution (500 FAILING)

> `PATCH /api/analytics/action-items/{actionId}/resolve` → **500 FAILING**
>
> **UI treatment:** Show action items read-only. Disable resolve button with tooltip: "Action resolution is temporarily unavailable."
