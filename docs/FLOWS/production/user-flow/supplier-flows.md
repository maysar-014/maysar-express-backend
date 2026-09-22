# Supplier Flows — Production Service

> **Verification status:** Partially Verified (plan lifecycle endpoints verified from service docs; inter-service event subscriptions unconfirmed)
> **Verification basis:** `docs/production/PRODUCTION_SERVICE_SYSTEM.md`; `docs/SERVICE_DEPENDENCY_MAP.md`
> **Last updated:** September 2026

## Overview

This document covers production-service flows from the supplier's perspective: creating and managing production plans, recording quality checkpoints, and completing plans. 

> ⚠️ **Partially Verified Notice:** `production-service` has **no documented inter-service event subscriptions** in the verified dependency map (`docs/SERVICE_DEPENDENCY_MAP.md`). The integration between `production.plan_ready` and inventory-service stock updates is not sweep-confirmed. The production plan lifecycle endpoints themselves are documented from service documentation and are expected to work, but cross-service flows are Partially Verified only.

---

## Flow Index

| # | Flow Name | Verification Status | Primary Endpoint |
|---|---|---|---|
| 1 | Create Production Plan | Partially Verified | `POST /api/production/plans` |
| 2 | Schedule Plan | Partially Verified | `POST /api/production/plans/:planId/schedule` |
| 3 | Start Production | Partially Verified | `POST /api/production/plans/:planId/start` |
| 4 | Record Quality Checkpoint | Partially Verified | `POST /api/production/plans/:planId/checkpoints/:checkpointId` |
| 5 | Complete Plan | Partially Verified | `POST /api/production/plans/:planId/complete` |
| 6 | View / List Plans | Partially Verified | `GET /api/production/plans`, `GET /api/production/plans/:planId` |

---

## Production Plan State Machine

```
DRAFT → SCHEDULED → IN_PRODUCTION → QUALITY_CHECK → READY | REJECTED
```

- `DRAFT` — plan created; not yet scheduled
- `SCHEDULED` — production start date set
- `IN_PRODUCTION` — active production; quality checkpoints being recorded
- `QUALITY_CHECK` — final quality inspection stage
- `READY` — all checkpoints passed; inventory sync triggered
- `REJECTED` — admin or quality rejection; plan cannot proceed

---

## Flow 1: Create Production Plan

### Summary

| Field | Value |
|---|---|
| Actor | Supplier |
| Trigger | Supplier initiates a new production run |
| Preconditions | Authenticated (Bearer JWT, supplier role) |
| Terminal states | 201 — plan created in `DRAFT` status |
| Verification status | Partially Verified |

### Happy Path

| Step | Actor/System | Action | Endpoint | Auth | Expected Response |
|---|---|---|---|---|---|
| 1 | Supplier | Create plan | `POST /api/production/plans` | Bearer JWT | 201 `{ planId, status: "DRAFT" }` |

### Request Body

```json
{
  "productId": "prod_01...",
  "plannedQuantity": 500,
  "targetCompletionDate": "2026-10-01",
  "notes": "Q4 restock run"
}
```

### Unhappy Path Branches

| Trigger | System Response | Error Code |
|---|---|---|
| Invalid `productId` | 422 | `VALIDATION_ERROR` |
| JWT missing | 401 | `UNAUTHORIZED` |

---

## Flow 2: Schedule Plan

### Summary

| Field | Value |
|---|---|
| Actor | Supplier |
| Trigger | Supplier commits to a production start date |
| Preconditions | Plan in `DRAFT` status; supplier JWT |
| Terminal states | Plan transitions to `SCHEDULED` |
| Verification status | Partially Verified |

### Happy Path

| Step | Actor/System | Action | Endpoint | Auth | Expected Response |
|---|---|---|---|---|---|
| 1 | Supplier | Schedule plan | `POST /api/production/plans/:planId/schedule` | Bearer JWT | 200 `{ planId, status: "SCHEDULED", scheduledStartDate }` |

---

## Flow 3: Start Production

### Summary

| Field | Value |
|---|---|
| Actor | Supplier |
| Trigger | Supplier begins the production run |
| Preconditions | Plan in `SCHEDULED` status |
| Terminal states | Plan transitions to `IN_PRODUCTION` |
| Verification status | Partially Verified |

### Happy Path

| Step | Actor/System | Action | Endpoint | Auth | Expected Response |
|---|---|---|---|---|---|
| 1 | Supplier | Start production | `POST /api/production/plans/:planId/start` | Bearer JWT | 200 `{ planId, status: "IN_PRODUCTION", startedAt }` |

---

## Flow 4: Record Quality Checkpoint

### Summary

| Field | Value |
|---|---|
| Actor | Supplier |
| Trigger | Supplier records the result of a quality inspection at a production stage |
| Preconditions | Plan in `IN_PRODUCTION` or `QUALITY_CHECK` status; all required checkpoints must pass before completion |
| Terminal states | Checkpoint recorded as `PASSED` or `FAILED` |
| Verification status | Partially Verified |

### Checkpoint Types

| Type | Stage |
|---|---|
| `RAW_MATERIAL_INSPECTION` | Before production starts |
| `IN_PROCESS_INSPECTION` | During active production |
| `FINAL_INSPECTION` | After production completes |
| `PACKAGING_INSPECTION` | Before shipment |

### Happy Path

| Step | Actor/System | Action | Endpoint | Auth | Expected Response |
|---|---|---|---|---|---|
| 1 | Supplier | Submit checkpoint result | `POST /api/production/plans/:planId/checkpoints/:checkpointId` | Bearer JWT | 200 `{ checkpointId, status: "PASSED", inspectedAt }` |

### Unhappy Path Branches

| Trigger | System Response | Error Code |
|---|---|---|
| Checkpoint result is `FAILED` | 200 with `status: "FAILED"` | — |
| All checkpoints must be re-done | Production may be paused | — |

---

## Flow 5: Complete Plan

### Summary

| Field | Value |
|---|---|
| Actor | Supplier |
| Trigger | Supplier marks the production plan as complete after all checkpoints pass |
| Preconditions | Plan in `QUALITY_CHECK` status; all required checkpoints have `PASSED` status |
| Terminal states | Plan transitions to `READY`; `production.plan_ready` event emitted |
| Verification status | Partially Verified (event consumer unconfirmed) |

### Happy Path

| Step | Actor/System | Action | Endpoint | Auth | Expected Response |
|---|---|---|---|---|---|
| 1 | Supplier | Complete plan | `POST /api/production/plans/:planId/complete` | Bearer JWT | 200 `{ planId, status: "READY", completedAt }` |
| 2 | production-service | Emits `production.plan_ready` event | Internal (outbox) | — | ⚠️ Consumer subscription by inventory-service unconfirmed |

### Known Gap — Inventory Sync Unconfirmed

> ⚠️ `production.plan_ready` event is emitted but its consumption by inventory-service is **not confirmed** in `docs/SERVICE_DEPENDENCY_MAP.md`. Inventory stock update after plan completion may not be automatic. Verify in staging before relying on this integration in production.

### Unhappy Path Branches

| Trigger | System Response | Error Code |
|---|---|---|
| Not all required checkpoints passed | 422 | `CHECKPOINTS_NOT_COMPLETE` |
| Plan in wrong state | 409 | `INVALID_STATUS_TRANSITION` |

---

## Flow 6: View / List Plans

### Happy Path

| Step | Actor/System | Action | Endpoint | Auth | Expected Response |
|---|---|---|---|---|---|
| 1 | Supplier | List own plans | `GET /api/production/plans?status=&page=&limit=` | Bearer JWT | 200 `{ plans[], pagination }` |
| 2 | Supplier | View plan detail | `GET /api/production/plans/:planId` | Bearer JWT | 200 — full plan with checkpoints |
