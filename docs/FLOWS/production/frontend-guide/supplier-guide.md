# Supplier Guide — Production Service

> Mirrors: `docs/FLOWS/production/user-flow/supplier-flows.md`
> Verification status: Partially Verified (plan lifecycle endpoints; inter-service event subscriptions unconfirmed)
> Last updated: September 2026

## Overview

Production planning UI for suppliers. All plan lifecycle endpoints are documented from service documentation and expected to work. Cross-service inventory sync is unconfirmed.

---

## Production Plan State Machine

Display a visual progress stepper:
```
DRAFT → SCHEDULED → IN_PRODUCTION → QUALITY_CHECK → READY
                                                   ↘ REJECTED
```

---

## Flow 1: Create Plan

**Action:** `POST /api/production/plans`

**UI States:** Form | Loading | Created (DRAFT) | Error

Show: productId selector, planned quantity, target completion date.

---

## Flow 2–3: Schedule and Start

- Schedule: `POST /api/production/plans/:planId/schedule` — set production start date
- Start: `POST /api/production/plans/:planId/start` — begin production

Show the plan status stepper updating at each transition.

---

## Flow 4: Record Quality Checkpoint

**Action:** `POST /api/production/plans/:planId/checkpoints/:checkpointId`

Show checkpoint types with status (PENDING / PASSED / FAILED):
- RAW_MATERIAL_INSPECTION
- IN_PROCESS_INSPECTION
- FINAL_INSPECTION
- PACKAGING_INSPECTION

On FAILED: show "Checkpoint failed. Retest required." Keep plan in QUALITY_CHECK state.

---

## Flow 5: Complete Plan

**Action:** `POST /api/production/plans/:planId/complete`

Only enabled when all required checkpoints show PASSED. On success: show "Production plan complete — inventory sync in progress."

> ⚠️ **Partially Verified:** The inventory sync (`production.plan_ready` → inventory-service) is not confirmed. Show "inventory sync in progress" but do not guarantee immediate stock availability. Advise the supplier to check inventory levels separately.

---

## Flow 6: View Plans

**Action:** `GET /api/production/plans?status=&page=&limit=`

Show plan list with status badges and tap-to-view detail.
