# Maysar Training Service — Implementation Reference (As-Built)

> **Status:** Live and verified — courier and enabler training modules, certification tracking, business gate enforcement.
> **Last updated:** September 2026
> **Scope:** `services/training-service`

---

## 1. Guiding Principles

| Principle | Where it lives |
|---|---|
| **Certification gates business operations** | Couriers cannot accept deliveries; enablers cannot generate referral links until `certificationStatus === 'PASSED'` |
| **Training modules are versioned** | Module content changes create new versions; users must re-certify on major version bumps |
| **Progress is tracked per module** | Each module has a completion status; overall certification requires all required modules |
| **Assessments have attempt limits** | Configurable max attempts per assessment; lockout on exhaustion |

---

## 2. Domain Model

### TrainingModule Entity

Fields: `moduleId`, `title`, `role` (`COURIER | ENABLER`), `version`, `isRequired`, `estimatedMinutes`, `content` (JSON), `assessmentId`.

### Certification Entity

```
CertificationStatus: NOT_STARTED → IN_PROGRESS → PASSED | FAILED | EXPIRED
```

Fields: `certificationId`, `userId`, `role`, `status`, `completedModules[]`, `score`, `passedAt`, `expiresAt`, `attemptCount`.

---

## 3. Application Layer

| Use case | What it does |
|---|---|
| `GetTrainingModulesUseCase` | List modules for a role |
| `StartModuleUseCase` | Mark module as started, track progress |
| `CompleteModuleUseCase` | Mark module complete, check if all required modules done |
| `SubmitAssessmentUseCase` | Score assessment → update certification status |
| `GetCertificationStatusUseCase` | Current certification status + progress |
| `RenewCertificationUseCase` | Re-certification flow for expired certs |

---

## 4. HTTP Surface

Mounted at `/api/training`.

| Method | Path | Auth | Description |
|---|---|---|---|
| GET  | `/api/training/modules` | JWT | List training modules for role |
| GET  | `/api/training/modules/:moduleId` | JWT | Module content |
| POST | `/api/training/modules/:moduleId/start` | JWT | Start module |
| POST | `/api/training/modules/:moduleId/complete` | JWT | Complete module |
| POST | `/api/training/assessments/:assessmentId/submit` | JWT | Submit assessment |
| GET  | `/api/training/certification` | JWT | Certification status |
| GET  | `/api/training/health/live` | none | Health check |

---

## 5. Events

| Event | Emitted by | Payload |
|---|---|---|
| `training.certification_passed` | `SubmitAssessmentUseCase` | `userId, role, certificationId, passedAt` |
| `training.certification_failed` | `SubmitAssessmentUseCase` | `userId, role, attemptCount, maxAttempts` |
| `training.certification_expired` | Expiry job | `userId, role, expiredAt` |

Events consumed:
- `training.certification_passed` → enabler-service activates enabler profile
- `training.certification_passed` → courier can now accept delivery jobs

---

## 6. Frontend Integration Guide

### Training dashboard

`GET /api/training/modules?role=COURIER`

```jsonc
{
  "data": {
    "modules": [
      {
        "moduleId": "mod_01...",
        "title": "Platform Orientation",
        "isRequired": true,
        "estimatedMinutes": 15,
        "status": "COMPLETED",
        "completedAt": "2026-09-01T10:00:00Z"
      },
      {
        "moduleId": "mod_02...",
        "title": "Delivery Standards",
        "isRequired": true,
        "estimatedMinutes": 20,
        "status": "NOT_STARTED"
      }
    ],
    "certification": {
      "status": "IN_PROGRESS",
      "completedRequired": 1,
      "totalRequired": 4,
      "progressPercent": 25
    }
  }
}
```

### Certification status

`GET /api/training/certification`

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

### Assessment submission

`POST /api/training/assessments/:assessmentId/submit`

```jsonc
{
  "answers": [
    { "questionId": "q1", "selectedOption": "B" },
    { "questionId": "q2", "selectedOption": "A" }
  ]
}
```

Response includes `score`, `passed`, `feedback[]`, and `attemptsRemaining`.

### Integration checklist

- [ ] Show training progress bar on courier/enabler onboarding screen
- [ ] Block referral link generation and delivery acceptance until `certificationStatus === 'PASSED'`
- [ ] Show certificate download link after passing
- [ ] Display expiry date and renewal CTA when cert is within 30 days of expiry
- [ ] Show attempt count and remaining attempts on assessment screen
- [ ] Lock assessment after max attempts with support contact CTA


---

## System Maintenance Routes

The training service does not currently expose outbox maintenance routes (no `maintenance.routes.ts` file). If an outbox is added in future, the standard pattern applies: mount at `/api/training/system/maintenance` behind `requireRoleOrService(['admin','system'])` and `x-service-key`.
