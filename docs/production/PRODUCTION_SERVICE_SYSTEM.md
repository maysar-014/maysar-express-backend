# Maysar Production Service — Implementation Reference (As-Built)

> **Status:** Live and verified — supplier production planning, bulk order management, quality checkpoints.
> **Last updated:** September 2026
> **Scope:** `services/production-service`

---

## 1. Guiding Principles

| Principle | Where it lives |
|---|---|
| **Production plans are supplier-scoped** | Each plan belongs to a supplier; buyers never see production internals |
| **Quality checkpoints are mandatory gates** | A production batch cannot advance to READY without passing all required quality checkpoints |
| **Bulk orders aggregate demand** | Multiple buyer orders for the same product can be consolidated into a single production run |
| **Status transitions are enforced** | Named transition methods only — no direct status writes |

---

## 2. Domain Model

### ProductionPlan Entity

```
PlanStatus: DRAFT → SCHEDULED → IN_PRODUCTION → QUALITY_CHECK → READY | REJECTED
```

Fields: `planId`, `supplierId`, `productId`, `quantity`, `status`, `scheduledStartDate`, `estimatedCompletionDate`, `qualityCheckpoints[]`.

### QualityCheckpoint Entity

```
CheckpointStatus: PENDING → PASSED | FAILED
```

Fields: `checkpointId`, `planId`, `checkpointType`, `status`, `checkedBy`, `notes`, `checkedAt`.

Checkpoint types: `RAW_MATERIAL_INSPECTION`, `IN_PROCESS_INSPECTION`, `FINAL_INSPECTION`, `PACKAGING_INSPECTION`.

---

## 3. Application Layer

| Use case | What it does |
|---|---|
| `CreateProductionPlanUseCase` | Creates DRAFT plan with required checkpoints |
| `ScheduleProductionUseCase` | Transitions DRAFT → SCHEDULED with start date |
| `StartProductionUseCase` | Transitions SCHEDULED → IN_PRODUCTION |
| `RecordQualityCheckUseCase` | Records checkpoint result; advances to QUALITY_CHECK when all in-process checks pass |
| `CompleteProductionUseCase` | Requires all checkpoints PASSED → transitions to READY |
| `RejectProductionUseCase` | Marks plan REJECTED with reason |
| `GetProductionPlanUseCase` | Plan detail with checkpoint status |
| `ListProductionPlansUseCase` | Supplier's production plans |

---

## 4. HTTP Surface

Mounted at `/api/production`.

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/production/plans` | supplier JWT | Create production plan |
| GET  | `/api/production/plans` | supplier JWT | List plans |
| GET  | `/api/production/plans/:planId` | supplier JWT | Plan detail |
| POST | `/api/production/plans/:planId/schedule` | supplier JWT | Schedule production |
| POST | `/api/production/plans/:planId/start` | supplier JWT | Start production |
| POST | `/api/production/plans/:planId/checkpoints/:checkpointId` | supplier JWT | Record quality check |
| POST | `/api/production/plans/:planId/complete` | supplier JWT | Complete production |
| POST | `/api/production/plans/:planId/reject` | admin JWT | Reject plan |
| GET  | `/api/production/health/live` | none | Health check |

---

## 5. Events

| Event | Emitted by | Payload |
|---|---|---|
| `production.plan_ready` | `CompleteProductionUseCase` | `planId, supplierId, productId, quantity` |
| `production.plan_rejected` | `RejectProductionUseCase` | `planId, supplierId, reason` |
| `production.checkpoint_failed` | `RecordQualityCheckUseCase` | `planId, checkpointId, checkpointType` |

---

## 6. Frontend Integration Guide

### Supplier production dashboard

`GET /api/production/plans?status=IN_PRODUCTION&limit=20`

```jsonc
{
  "data": {
    "plans": [
      {
        "planId": "pln_01...",
        "productTitle": "Wooden Chair",
        "quantity": 50,
        "status": "IN_PRODUCTION",
        "scheduledStartDate": "2026-09-01",
        "estimatedCompletionDate": "2026-09-15",
        "checkpoints": [
          { "type": "RAW_MATERIAL_INSPECTION", "status": "PASSED" },
          { "type": "IN_PROCESS_INSPECTION", "status": "PENDING" },
          { "type": "FINAL_INSPECTION", "status": "PENDING" }
        ],
        "progressPercent": 33
      }
    ]
  }
}
```

### Record quality checkpoint

`POST /api/production/plans/:planId/checkpoints/:checkpointId`

```jsonc
{
  "status": "PASSED",
  "notes": "All dimensions within tolerance. No defects found.",
  "checkedBy": "QC Inspector Name"
}
```

### Production status display

| Status | Display | Supplier action |
|---|---|---|
| `DRAFT` | Draft | Schedule |
| `SCHEDULED` | Scheduled | Start when ready |
| `IN_PRODUCTION` | In production | Record checkpoints |
| `QUALITY_CHECK` | Quality check | Complete final inspection |
| `READY` | Ready to ship | Notify logistics |
| `REJECTED` | Rejected | Review reason, create new plan |

### Integration checklist

- [ ] Show checkpoint progress as a stepper component
- [ ] Block "Complete" action until all checkpoints are PASSED
- [ ] Show estimated completion date with days remaining
- [ ] Alert supplier when a checkpoint fails (push notification)
- [ ] Show production plan linked to the originating bulk order
