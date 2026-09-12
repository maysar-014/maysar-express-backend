# Production Service — Frontend Integration Guide

> Mount path: `/api/production`
> Audience: Supplier portal, admin panel

---

## Production Plans

### Plan Status Machine

```
DRAFT → SCHEDULED → IN_PROGRESS → COMPLETED (terminal)
                  ↘ ON_HOLD ↗
DRAFT | SCHEDULED | IN_PROGRESS | ON_HOLD → CANCELLED (terminal)
```

- `COMPLETED` is terminal — all action buttons must be hidden.
- Progress updates only accepted when status is `IN_PROGRESS`.

### ProductionPriority values
`LOW` | `MEDIUM` | `HIGH` | `CRITICAL`

---

### Create a Production Plan
`POST /api/production/plans` — requires auth (supplier/admin)

```jsonc
{
  "supplierId": "sup_01J...",
  "name": "Batch 42 — Cotton Shirts",       // min 3 chars
  "description": "Q3 production run",        // optional
  "targetQuantity": 500,                     // positive integer
  "startDate": "2024-09-01T00:00:00.000Z",  // ISO datetime
  "endDate": "2024-09-30T00:00:00.000Z",    // ISO datetime
  "priority": "HIGH",                        // optional: LOW|MEDIUM|HIGH|CRITICAL
  "maxCapacity": 600,                        // optional
  "usedCapacity": 0,                         // optional
  "reservedCapacity": 0,                     // optional
  "capacityUnit": "units"                    // optional
}
```

```jsonc
// Response 201
{
  "success": true,
  "data": {
    "id": "pln_01J...",
    "supplierId": "sup_01J...",
    "name": "Batch 42 — Cotton Shirts",
    "status": "DRAFT",
    "targetQuantity": 500,
    "startDate": "2024-09-01T00:00:00.000Z",
    "endDate": "2024-09-30T00:00:00.000Z",
    "priority": "HIGH",
    "createdAt": "2024-08-15T10:00:00.000Z"
  }
}
```

---

### Get a Plan
`GET /api/production/plans/:id` — requires auth

```jsonc
// Response 200
{
  "success": true,
  "data": {
    "id": "pln_01J...",
    "name": "Batch 42 — Cotton Shirts",
    "status": "IN_PROGRESS",
    "targetQuantity": 500,
    "progressPercent": 42,
    "startDate": "2024-09-01T00:00:00.000Z",
    "endDate": "2024-09-30T00:00:00.000Z",
    "priority": "HIGH",
    "capacity": { "max": 600, "used": 210, "reserved": 0, "unit": "units" }
  }
}
```

---

### Update Plan Status
`PUT /api/production/plans/:id/status` — requires auth

```jsonc
{ "status": "IN_PROGRESS" }
```

```jsonc
// Response 200
{
  "success": true,
  "data": { "id": "pln_01J...", "status": "IN_PROGRESS", "updatedAt": "2024-09-01T08:00:00.000Z" }
}
```

**Blocked transitions:**
- Any transition from `COMPLETED` → 409 `INVALID_STATUS_TRANSITION`

---

### Get Dashboard
`GET /api/production/dashboard` — requires auth

Returns summary counts by status, capacity utilisation, and recent plans.

---

## Quality Checkpoints

### Record a Quality Checkpoint
`POST /api/production/quality/checkpoints` — requires auth

```jsonc
{
  "orderId": "ord_01J...",
  "passed": false,
  "defectCount": 12,
  "notes": "Stitching defects on collar",   // optional
  "images": ["https://cdn.example.com/img1.jpg"]  // optional
}
```

```jsonc
// Response 201
{
  "success": true,
  "data": {
    "id": "qcp_01J...",
    "orderId": "ord_01J...",
    "status": "REWORK_REQUIRED",
    "passed": false,
    "defectCount": 12,
    "passRate": 97.6,
    "requiresRework": true,
    "createdAt": "2024-09-10T14:00:00.000Z"
  }
}
```

**Status set automatically by server:**
- `passed: true` → `PASSED`
- `passed: false` → `FAILED` or `REWORK_REQUIRED` (based on defect count vs 95% threshold)

**Minimum pass rate: 95%.** `requiresRework` = `passRate < 95`.

---

## Bulk Orders

### Create a Bulk Order Request
`POST /api/production/bulk-orders` — requires auth

```jsonc
{
  "supplierId": "sup_01J...",
  "buyerId": "usr_01J...",          // optional
  "title": "500 Cotton Shirts",     // min 3 chars
  "description": "Q3 restock order for Dar es Salaam warehouse",  // min 10 chars
  "productId": "prd_01J...",        // optional
  "quantity": 500,
  "unit": "pieces",
  "currency": "TZS",
  "targetUnitPrice": 8500,          // optional
  "requiredBy": "2024-10-01T00:00:00.000Z",
  "deliveryAddress": "Kariakoo, Dar es Salaam",  // optional
  "notes": "Must be pre-washed"     // optional
}
```

```jsonc
// Response 201
{
  "success": true,
  "data": {
    "id": "bor_01J...",
    "supplierId": "sup_01J...",
    "title": "500 Cotton Shirts",
    "quantity": 500,
    "unit": "pieces",
    "currency": "TZS",
    "status": "PENDING",
    "requiredBy": "2024-10-01T00:00:00.000Z",
    "createdAt": "2024-08-15T10:00:00.000Z"
  }
}
```

### Submit a Quote for a Bulk Order
`POST /api/production/bulk-orders/:id/quotes` — requires auth

```jsonc
{
  "unitPrice": 8200,
  "currency": "TZS",
  "leadTimeDays": 21,
  "minimumOrderQuantity": 100,      // optional
  "validUntil": "2024-09-01T00:00:00.000Z",
  "notes": "Price includes packaging",  // optional
  "paymentTerms": "50% upfront, 50% on delivery"  // optional
}
```

```jsonc
// Response 201
{
  "success": true,
  "data": {
    "id": "bqt_01J...",
    "bulkOrderId": "bor_01J...",
    "unitPrice": 8200,
    "currency": "TZS",
    "leadTimeDays": 21,
    "validUntil": "2024-09-01T00:00:00.000Z",
    "createdAt": "2024-08-16T09:00:00.000Z"
  }
}
```

### List Bulk Orders
`GET /api/production/bulk-orders?supplierId=sup_01J...&status=PENDING`

---

## Capacity

```
GET /api/production/capacity?supplierId=sup_01J...
PUT /api/production/capacity
```

---

## Error Codes

| Code | HTTP | Meaning |
|------|------|---------|
| `VALIDATION_ERROR` | 400 | Missing/invalid fields — `details[]` array included |
| `UNAUTHORIZED` | 401 | No/expired JWT |
| `FORBIDDEN` | 403 | Insufficient role |
| `NOT_FOUND` | 404 | Plan/checkpoint not found |
| `INVALID_STATUS_TRANSITION` | 409 | Attempted transition from COMPLETED or other illegal move |
| `CAPACITY_UNAVAILABLE` | 409 | `canApprove()` failed — capacity not available for targetQuantity |

---

## Display Notes

- `COMPLETED` plans: render in read-only mode, hide all action buttons.
- Quality score gauge: render 0–100 with a red threshold line at 95%.
- Show `defectCount` alongside quality status for `FAILED` and `REWORK_REQUIRED` checkpoints.
- Progress updates (percentage) only accepted when status is `IN_PROGRESS` — hide the progress form otherwise.
- `currency` on bulk orders is always a 3-letter ISO code (e.g. `TZS`).
