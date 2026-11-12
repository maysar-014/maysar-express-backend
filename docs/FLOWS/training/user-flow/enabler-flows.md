# Enabler Flows — Training Service

> **Verification status:** Partially Verified
> **Verification basis:** `docs/FLOWS/_verification/analysis-report.md` — training-service section; `docs/training/TRAINING_SERVICE_SYSTEM.md`
> **Canonical source:** `docs/FLOWS/training/user-flow/enabler-flows.md`
> **Corresponding frontend guide:** `docs/FLOWS/training/frontend-guide/enabler-guide.md`

---

## Overview

Training applies to both the **enabler** role and the **courier** role. The flows documented here use `role=ENABLER`. The same endpoints and module/assessment structure apply to couriers (using `role=COURIER`) — only the downstream gate differs:

- For enablers: `trainingStatus === 'completed'` is **Gate 2** of `POST /enablers/:id/activation`
- For couriers: `certificationStatus === 'PASSED'` gates delivery job acceptance in logistics-service

The `training.certification_passed` event is consumed by:
- **enabler-service** — mirrors `trainingStatus → 'completed'` and unblocks Gate 2 of activation
- **logistics-service** — enables delivery job acceptance for couriers

All training routes are mounted under `/api/training`. Note: the actual route prefix observed in this service is `/api/training/api/v1/...` (the service mounts its internal router at `/api/v1` under the `/api/training` prefix).

---

## Flows in This Document

| Flow ID | Flow Name | Status | Primary Endpoint |
|---------|-----------|--------|-----------------|
| TRN-ENB-01 | Browse Training Modules | Verified | `GET /api/training/api/v1/modules?role=ENABLER` |
| TRN-ENB-02 | Start Training Session | Verified | `POST /api/training/api/v1/training/start` |
| TRN-ENB-03 | Complete Training Module | Verified | `POST /api/training/api/v1/training/:trainingRecordId/complete` |
| TRN-ENB-04 | Check Training Progress | Verified | `GET /api/training/api/v1/training/progress/:learnerId` |

---

## Flow TRN-ENB-01: Browse Training Modules

| Field | Value |
|-------|-------|
| **Actor** | Enabler |
| **Trigger** | Enabler opens the training dashboard to see required and optional modules |
| **Preconditions** | Enabler JWT. Enabler has been approved (`APPROVED` status or later). |
| **Terminal states** | Returns module list with per-module completion status and certification summary; no state mutation |
| **Verification status** | Partially Verified |

### Happy Path

| Step | Actor/System | Action | Endpoint Method + Path | Auth | Expected Response |
|------|-------------|--------|------------------------|------|-------------------|
| 1 | Enabler | Fetch training modules for enabler role | `GET /api/training/api/v1/modules?role=ENABLER` | Enabler JWT | 200 — module list with `type`, `completionStatus`, `estimatedDuration`, and certification summary |

**Example response:**
```jsonc
{
  "data": {
    "modules": [
      {
        "moduleId": "mod_01...",
        "title": "Platform Orientation",
        "type": "MANDATORY",
        "isRequired": true,
        "estimatedMinutes": 15,
        "completionStatus": "COMPLETED",
        "completedAt": "2026-09-01T10:00:00Z"
      },
      {
        "moduleId": "mod_02...",
        "title": "Referral Link Best Practices",
        "type": "MANDATORY",
        "isRequired": true,
        "estimatedMinutes": 20,
        "completionStatus": "NOT_STARTED"
      },
      {
        "moduleId": "mod_03...",
        "title": "Advanced Selling Techniques",
        "type": "OPTIONAL",
        "isRequired": false,
        "estimatedMinutes": 30,
        "completionStatus": "NOT_STARTED"
      }
    ],
    "certification": {
      "status": "IN_PROGRESS",
      "completedRequired": 1,
      "totalRequired": 3,
      "progressPercent": 33
    }
  }
}
```

### Service Interaction Chain

`GetTrainingModulesUseCase` queries `training_modules` filtered by `role = 'ENABLER'` and joins each module with the caller's progress record. The response includes per-module `completionStatus` and an aggregated `certification` summary. No state is mutated. The `role` query parameter is required — omitting it may return all modules or an empty list depending on service configuration.

### Unhappy Path Branches

| Trigger | System Response | Error Code | Terminal State |
|---------|----------------|------------|----------------|
| No JWT or expired token | 401 unauthorized | — | No data returned |
| No modules configured for `ENABLER` role | 200 with empty `modules` array | — | No state change |
| Invalid `role` query value | 422 validation error | `VALIDATION_ERROR` | No data returned |

---

## Flow TRN-ENB-02: Start and Complete a Module

| Field | Value |
|-------|-------|
## Flow TRN-ENB-02: Start Training Session

> ✅ **Corrected 2026-11-06:** The start endpoint is NOT path-based (`/modules/:id/start`). It is a single POST to `/training/start` with the module ID in the body.

| Field | Value |
|-------|-------|
| **Actor** | Enabler or Courier |
| **Trigger** | Learner begins a training module |
| **Preconditions** | JWT. Module exists. |
| **Terminal states** | Training record created with status `IN_PROGRESS`; `trainingRecordId` returned |
| **Verification status** | Verified |

### Happy Path

| Step | Actor/System | Action | Endpoint Method + Path | Auth | Expected Response |
|------|-------------|--------|------------------------|------|-------------------|
| 1 | Enabler | Start training session | `POST /api/training/api/v1/training/start` | Enabler JWT | 200/201 `{ trainingRecordId, status: "IN_PROGRESS" }` |

**Request body:**
```json
{
  "learnerId": "usr_01...",
  "learnerRole": "ENABLER",
  "moduleId": "mod_01..."
}
```

> ⚠️ The response returns `trainingRecordId` at the top level (not nested in `data`). This ID is used for the complete call.

### Unhappy Path Branches

| Trigger | System Response | Error Code |
|---|---|---|
| Invalid `moduleId` | 400/404 | `VALIDATION_ERROR` or `NOT_FOUND` |
| JWT missing | 401 | `UNAUTHORIZED` |

---

## Flow TRN-ENB-03: Complete Training Module

> ✅ **Corrected 2026-11-06:** The completion endpoint uses `trainingRecordId` (from the start response), NOT `moduleId` or `assessmentId`.

| Field | Value |
|-------|-------|
| **Actor** | Enabler or Courier |
| **Trigger** | Learner submits module completion with score |
| **Preconditions** | JWT. `trainingRecordId` from a previous start call. |
| **Terminal states** | Training record updated to `COMPLETED`; certification check triggered |
| **Verification status** | Verified |

### Happy Path

| Step | Actor/System | Action | Endpoint Method + Path | Auth | Expected Response |
|------|-------------|--------|------------------------|------|-------------------|
| 1 | Enabler | Submit module completion | `POST /api/training/api/v1/training/:trainingRecordId/complete` | Enabler JWT | 200/201 — training record updated |

**Request body:**
```json
{
  "score": 85,
  "answers": []
}
```

**Service Interaction Chain:** On completion, training-service checks whether all mandatory modules for the role are now complete. If so, `training.certification_passed` is published with `{ userId, role: 'ENABLER', certificationId, passedAt }`. enabler-service consumes this to satisfy Gate 2 of activation.

### Unhappy Path Branches

| Trigger | System Response | Error Code |
|---|---|---|
| `trainingRecordId` not found | 404 | `NOT_FOUND` |
| Score below passing threshold | 200/400 — implementation-dependent | — |
| Cooldown period active | 429 or 409 — retry not allowed yet | — | No state change |
| `:assessmentId` does not exist | 404 not found | — | No state change |
| Missing or malformed `answers` array | 422 validation error | `VALIDATION_ERROR` | No state change |

---

## Flow TRN-ENB-04: Check Certification Status

| Field | Value |
|-------|-------|
| **Actor** | Enabler |
| **Trigger** | Enabler wants to see current certification progress and overall status |
| **Preconditions** | Enabler JWT. |
| **Terminal states** | Returns certification status snapshot; no state mutation |
| **Verification status** | Partially Verified |

### Happy Path

| Step | Actor/System | Action | Endpoint Method + Path | Auth | Expected Response |
|------|-------------|--------|------------------------|------|-------------------|
| 1 | Enabler | Fetch module detail and completion info | `GET /api/training/api/v1/modules/:id` | Enabler JWT | 200 — module with `completionStatus` and certification info; data-level 404 if no fixture |
| 2 | Enabler | Check training progress | `GET /api/training/api/v1/training/progress/:learnerId` | Enabler JWT | 200 `{ data: { status, completedModules, totalRequired, progressPercent } }` or 404 |

> ⚠️ **Corrected 2026-11-06:** Previous endpoint was `GET /api/training/certification` (returns 404 in live testing). The correct endpoint is `GET /api/training/api/v1/training/progress/:learnerId`, verified in LC-26.

**Example certification response:**
```jsonc
{
  "data": {
    "status": "PASSED",
    "passedAt": "2026-09-01T12:00:00Z",
    "expiresAt": "2027-09-01T12:00:00Z",
    "score": 87,
    "certificateUrl": "https://..."
  }
}
```

### Service Interaction Chain

`GET /api/training/api/v1/modules/:id` calls `GetTrainingModulesUseCase` (single-module variant) and returns the module record joined with the caller's progress. The route is verified to exist; a 404 at this endpoint is a data-level absence (no fixture), not a missing route.

`GET /api/training/certification` calls `GetCertificationStatusUseCase`, which reads the caller's `training_Certification` record and returns the aggregated status. The `certificateUrl` is only populated when `status === 'PASSED'`.

### Certification Status Values and Gate Impact

| Certification Status | Meaning | Enabler Gate 2 |
|---------------------|---------|----------------|
| `NOT_STARTED` | No modules started | Fails |
| `IN_PROGRESS` | Some modules started; not all mandatory complete | Fails |
| `PASSED` | All mandatory modules complete; assessment passed | **Satisfied** |
| `FAILED` | Assessment failed; retry after cooldown | Fails |
| `EXPIRED` | Certification TTL elapsed | Fails — re-certification required |

### Unhappy Path Branches

| Trigger | System Response | Error Code | Terminal State |
|---------|----------------|------------|----------------|
| `:id` not found (no fixture data) | 404 data-level (route itself is verified) | — | No state change |
| Certification `EXPIRED` | 200 with `status: "EXPIRED"` | — | Gate 2 fails; re-certification required |
| No JWT or expired token | 401 unauthorized | — | No data returned |
