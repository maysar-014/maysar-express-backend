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
| TRN-ENB-01 | Browse Training Modules | Partially Verified | `GET /api/training/api/v1/modules` |
| TRN-ENB-02 | Start and Complete a Module | Partially Verified | `POST /api/training/api/v1/modules/:moduleId/start` + `/complete` |
| TRN-ENB-03 | Submit Assessment | Partially Verified | `POST /api/training/api/v1/assessments/:assessmentId/submit` |
| TRN-ENB-04 | Check Certification Status | Partially Verified | `GET /api/training/api/v1/modules/:id` + `GET /api/training/certification` |

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
| **Actor** | Enabler |
| **Trigger** | Enabler works through a training module |
| **Preconditions** | Enabler JWT. Module exists and has status `NOT_STARTED` or `IN_PROGRESS`. |
| **Terminal states** | Module status `COMPLETED`; overall `trainingStatus` progresses toward `'completed'` as all mandatory modules finish |
| **Verification status** | Partially Verified |

### Happy Path

| Step | Actor/System | Action | Endpoint Method + Path | Auth | Expected Response |
|------|-------------|--------|------------------------|------|-------------------|
| 1 | Enabler | Start the module | `POST /api/training/api/v1/modules/:moduleId/start` | Enabler JWT | 200 `{ data: { moduleId, status: "IN_PROGRESS", startedAt } }` |
| 2 | Enabler | Mark module complete | `POST /api/training/api/v1/modules/:moduleId/complete` | Enabler JWT | 200 `{ data: { moduleId, status: "COMPLETED", completedAt } }` |

### Service Interaction Chain

`StartModuleUseCase` creates or updates the learner's progress record for the module, setting status to `IN_PROGRESS` and writing `startedAt`. It also returns the module content payload so the frontend can render the learning material without a second request.

`CompleteModuleUseCase` marks the progress record `COMPLETED` and then checks whether all mandatory modules for the role are now complete and unexpired. If they are, the mirrored `trainingStatus` on the enabler profile advances toward `'completed'`. However, completion of modules alone does not emit `training.certification_passed` — that event is only emitted by a passed assessment (see Flow TRN-ENB-03). If a module has no associated assessment, the aggregate gate check in `EnablerTrainingGateService` determines whether the training requirement is fully satisfied.

### Unhappy Path Branches

| Trigger | System Response | Error Code | Terminal State |
|---------|----------------|------------|----------------|
| `:moduleId` does not exist | 404 not found | — | No state change |
| Module already `COMPLETED` | 200 idempotent return or 409 conflict (implementation-dependent) | — | No state change |
| Module record has expired | 409 — requires re-completion | — | Module must be retaken |
| No JWT or expired token | 401 unauthorized | — | No state change |

---

## Flow TRN-ENB-03: Submit Assessment

| Field | Value |
|-------|-------|
| **Actor** | Enabler |
| **Trigger** | Enabler submits answers for a training module's assessment |
| **Preconditions** | Enabler JWT. The assessment must belong to a module the enabler has started. Attempt limit not exhausted. |
| **Terminal states** | **Pass:** `training.certification_passed` event emitted; Gate 2 of enabler activation satisfied. **Fail:** `training.certification_failed` emitted; retry available after cooldown. |
| **Verification status** | Partially Verified |

### Happy Path

| Step | Actor/System | Action | Endpoint Method + Path | Auth | Expected Response |
|------|-------------|--------|------------------------|------|-------------------|
| 1 | Enabler | Submit assessment answers | `POST /api/training/api/v1/assessments/:assessmentId/submit` | Enabler JWT | 200 `{ data: { passed: true, score: 87, passingScore: 70, certificationId, passedAt, attemptsRemaining } }` |

**Request body:**
```jsonc
{
  "answers": [
    { "questionId": "q1", "selectedOption": "B" },
    { "questionId": "q2", "selectedOption": "A" }
  ]
}
```

### Service Interaction Chain

`SubmitAssessmentUseCase` scores the submitted answers against the stored correct answers, calculates a percentage `score`, and compares it to the `passingScore` threshold configured for the assessment.

**On pass:** certification status transitions to `PASSED`; `training.certification_passed` is published with `{ userId, role: 'ENABLER', certificationId, passedAt }`. This event is consumed by enabler-service, which mirrors `trainingStatus → 'completed'` on the enabler profile. Gate 2 of `POST /enablers/:id/activation` is now satisfied.

**On fail:** `training.certification_failed` is published with `{ userId, role, attemptCount, maxAttempts }`. The response body includes `score`, `passingScore`, `passed: false`, `feedback[]`, and `attemptsRemaining`. A cooldown period is enforced before the next attempt is allowed.

### Unhappy Path Branches

| Trigger | System Response | Error Code | Terminal State |
|---------|----------------|------------|----------------|
| Score below passing threshold | 200 with `passed: false`, score, feedback, `attemptsRemaining` | — | `training.certification_failed` emitted; retry after cooldown |
| `attemptsRemaining === 0` | 403 — max attempts exhausted; support contact CTA | — | Assessment locked; support required |
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
| 2 | Enabler | Fetch full certification status | `GET /api/training/certification` | Enabler JWT | 200 `{ data: { status, passedAt, expiresAt, score, certificateUrl } }` |

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
