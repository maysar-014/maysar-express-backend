# Training Service — Frontend Integration Guide

> Audience: Client app engineers (courier app, enabler portal, admin panel)
> Mount path: `/api/training-service` → training at `/api/v1/training`, modules at `/api/v1/modules`

---

## 1. What the Training Service Does

Manages training modules, learner enrollment, progress tracking, certification, and badges for couriers and enablers. Completing required modules gates eligibility for platform operations (e.g. a courier must be certified before accepting deliveries).

```
Admin creates module + requirement → Learner starts training → Tracks progress
→ Completes with score ≥ minimumScore → COMPLETED + badge awarded + expiresAt set
→ Eligibility = all mandatory requirements COMPLETED and not expired
```

---

## 2. Service at a Glance

| Aspect | Detail |
|--------|--------|
| Mount path | `/api/training-service` |
| Training routes | `/api/training-service/api/v1/training` |
| Module routes | `/api/training-service/api/v1/modules` |
| Auth | `requireAuth` on all training routes; modules are public |
| Admin routes | `requireRole(['admin', 'system'])` |
| Default minimum score | 60 (configurable per requirement) |
| Default validity | 365 days (configurable per requirement) |
| Default max attempts | 5 (configurable per requirement) |
| Error envelope | `{ success: false, error: { code, message }, timestamp }` |

---

## 3. Authentication & Roles

| Surface | Auth | Notes |
|---------|------|-------|
| `GET /api/v1/modules` | None | Public module catalog |
| `GET /api/v1/modules/:id` | None | Public |
| `GET /api/v1/modules/:id/content` | None | Public |
| `GET /api/v1/modules/leaderboard` | None | Public |
| `GET /api/v1/modules/badges/:learnerId` | None | Public |
| `POST /api/v1/training/start` | JWT | Any authenticated user |
| `POST /api/v1/training/:id/complete` | JWT | Any authenticated user |
| `GET /api/v1/training/progress/:learnerId` | JWT | Own progress or admin |
| `GET /api/v1/training/eligibility/:learnerId` | JWT | Own eligibility or admin |
| `GET /api/v1/training/available` | JWT | Any authenticated user |
| `POST /api/v1/training/:id/progress` | JWT | Any authenticated user |
| `GET/POST/PUT/DELETE /api/v1/training/admin/*` | JWT (admin/system) | Admin only |

---

## 4. Core Domain Objects

```
TrainingModule
  ├── id, name, description
  ├── contentType: TEXT | VIDEO | QUIZ | INTERACTIVE
  ├── content: { type, body, sections[], steps[] }
  ├── durationMinutes
  ├── category, prerequisites[], targetRoles[]
  ├── difficulty: BEGINNER | INTERMEDIATE | ADVANCED | EXPERT
  └── isPublic

TrainingRecord
  ├── id, learnerId, learnerRole, moduleId
  ├── status: NOT_STARTED → IN_PROGRESS → COMPLETED | FAILED | EXPIRED
  ├── score (0-100)
  ├── attempts (incremented on each start)
  ├── expiresAt (set on COMPLETED = completedAt + validityPeriodDays)
  └── progress (section/step tracking object)

CertificationRequirement
  ├── module (moduleId)
  ├── minimumScore (default 60)
  ├── validityPeriodDays (default 365)
  ├── mandatory (only mandatory requirements gate eligibility)
  └── maxAttempts (default 5 — soft limit, shows warning not hard block)
```

### Training record status machine

```
NOT_STARTED → IN_PROGRESS → COMPLETED (score ≥ minimumScore, expiresAt set)
                          → FAILED    (score < minimumScore)
COMPLETED → EXPIRED       (when current date > expiresAt)
FAILED/EXPIRED → IN_PROGRESS (retake, if attempts < maxAttempts)
```

**Critical rules from the code:**
1. **Eligibility** = all `mandatory` requirements have a `COMPLETED` record that is **not expired**. Non-mandatory requirements do not affect eligibility.
2. **Expiry** — a `COMPLETED` record becomes `EXPIRED` after `validityPeriodDays` days. An expired record counts as missing for eligibility. The learner must retake.
3. **Attempts** — `maxAttempts` is a soft limit (shows a warning, not a hard block). The policy always returns `canStart: true`. The warning text is: "You've reached the suggested maximum attempts. Consider reviewing the material before retrying."
4. **Prerequisites** — also soft (shows a recommendation, not a block). Any authenticated user can start any module.
5. **Retaking a completed module** — allowed. Creates a new attempt and updates the score. The warning text is: "You have already completed this module. Retaking it will update your score."

---

## 5. Learner API

### 5.1 Start training
`POST /api/training-service/api/v1/training/start` → **201**

```jsonc
{
  "moduleId": "mod_courier_safety_01",
  "learnerId": "usr_01J..."
}
```

Response:
```jsonc
{
  "success": true,
  "data": {
    "trainingId": "trn_01J...",
    "moduleId": "mod_courier_safety_01",
    "learnerId": "usr_01J...",
    "status": "IN_PROGRESS",
    "attempts": 1,
    "startedAt": "2026-09-06T10:00:00Z",
    "warnings": ["You have an in-progress session for this module. Starting again will create a new attempt."],
    "recommendations": null
  }
}
```

The response may include `warnings` and `recommendations` arrays from the TrainingPolicy. Always display these to the user before they start.

### 5.2 Track module progress
`POST /api/training-service/api/v1/training/:id/progress` → **200**

```jsonc
{
  "completedSections": ["intro", "safety-rules"],
  "currentSection": "quiz",
  "progressPercentage": 60
}
```

Call this as the user advances through sections. The `progress` object is stored and returned in `GET /progress/:learnerId`.

### 5.3 Complete training
`POST /api/training-service/api/v1/training/:id/complete` → **200**

```jsonc
{
  "score": 85,
  "answers": [
    { "questionId": "q1", "answer": "B" },
    { "questionId": "q2", "answer": "A" }
  ]
}
```

Response on pass (`score ≥ minimumScore`):
```jsonc
{
  "success": true,
  "data": {
    "trainingId": "trn_01J...",
    "status": "COMPLETED",
    "score": 85,
    "minimumScore": 60,
    "passed": true,
    "expiresAt": "2027-09-06T10:00:00Z",
    "badge": {
      "id": "bdg_01J...",
      "name": "Courier Safety Certified",
      "awardedAt": "2026-09-06T10:30:00Z"
    },
    "completedAt": "2026-09-06T10:30:00Z"
  }
}
```

Response on fail (`score < minimumScore`):
```jsonc
{
  "success": true,
  "data": {
    "trainingId": "trn_01J...",
    "status": "FAILED",
    "score": 45,
    "minimumScore": 60,
    "passed": false,
    "attempts": 2,
    "maxAttempts": 5,
    "canRetake": true
  }
}
```

**Always show `minimumScore` alongside the user's score** so they know what they needed.

### 5.4 Get training progress
`GET /api/training-service/api/v1/training/progress/:learnerId` → **200**

```jsonc
{
  "success": true,
  "data": {
    "learnerId": "usr_01J...",
    "records": [
      {
        "moduleId": "mod_courier_safety_01",
        "moduleName": "Courier Safety",
        "status": "COMPLETED",
        "score": 85,
        "attempts": 1,
        "completedAt": "2026-09-06T10:30:00Z",
        "expiresAt": "2027-09-06T10:30:00Z",
        "expired": false
      },
      {
        "moduleId": "mod_road_safety_01",
        "moduleName": "Road Safety",
        "status": "FAILED",
        "score": 45,
        "attempts": 2,
        "canRetake": true
      }
    ],
    "overallCompletionPercentage": 50,
    "totalMandatoryModules": 4,
    "completedMandatoryModules": 2
  }
}
```

### 5.5 Check eligibility
`GET /api/training-service/api/v1/training/eligibility/:learnerId` → **200**

```jsonc
{
  "success": true,
  "data": {
    "learnerId": "usr_01J...",
    "eligible": false,
    "completionPercentage": 50,
    "completedModules": ["mod_courier_safety_01"],
    "inProgressModules": [],
    "missingRequirements": [
      "mod_road_safety_01",
      "mod_vehicle_inspection_01"
    ]
  }
}
```

`missingRequirements` contains module IDs. Cross-reference with `GET /api/v1/modules` to get module names for display.

**`eligible: true` means all mandatory requirements are COMPLETED and not expired.** Use this to gate platform features.

### 5.6 Get available modules
`GET /api/training-service/api/v1/training/available` → **200**

Returns modules the authenticated user is eligible to take based on their role and completed prerequisites. Use this to populate the "Start Training" screen.

---

## 6. Module Catalog API (public)

### 6.1 List all modules
`GET /api/training-service/api/v1/modules` → **200**

Returns all public training modules with metadata (no content body).

### 6.2 Get a module
`GET /api/training-service/api/v1/modules/:id` → **200**

Returns module metadata including `prerequisites`, `targetRoles`, `difficulty`, `durationMinutes`.

### 6.3 Get module content
`GET /api/training-service/api/v1/modules/:id/content` → **200**

Returns full content including sections, steps, and quiz questions. Load this only when the user starts the module — not on the catalog page.

### 6.4 Get leaderboard
`GET /api/training-service/api/v1/modules/leaderboard` → **200**

Returns top learners ranked by total score and completion count.

### 6.5 Get learner badges
`GET /api/training-service/api/v1/modules/badges/:learnerId` → **200**

```jsonc
{
  "success": true,
  "data": {
    "learnerId": "usr_01J...",
    "badges": [
      {
        "id": "bdg_01J...",
        "name": "Courier Safety Certified",
        "moduleId": "mod_courier_safety_01",
        "awardedAt": "2026-09-06T10:30:00Z"
      }
    ]
  }
}
```

---

## 7. Admin API

| Endpoint | Description |
|----------|-------------|
| `GET /admin/modules` | List all modules |
| `GET /admin/modules/:id` | Get module |
| `POST /admin/modules` | Create module (`id`, `name` required; `contentType`, `durationMinutes`, `category`, `targetRoles[]` optional) |
| `PUT /admin/modules/:id` | Update module |
| `PATCH /admin/modules/:id/content` | Merge-patch module content (sections/steps) |
| `DELETE /admin/modules/:id` | Delete module |
| `GET /admin/requirements` | List certification requirements |
| `POST /admin/requirements` | Create requirement (`module` required; `minimumScore` default 60, `validityPeriodDays` default 365, `mandatory` default false, `maxAttempts` default 5) |
| `PUT /admin/requirements/:module` | Update requirement |
| `DELETE /admin/requirements/:module` | Delete requirement |
| `GET /admin/learners?moduleId=...&status=...&limit=50&offset=0` | List learners |
| `GET /admin/learners/:learnerId` | Get learner progress |
| `POST /admin/complete-for-learner` | Override: mark training complete (`learnerId`, `moduleId`, `score` optional) |
| `POST /admin/grant-eligibility/:learnerId` | Override: grant eligibility (sets `completionPercentage: 100`, `eligible: true`) |
| `DELETE /admin/learners/:learnerId/reset` | Reset all training records for learner |
| `GET /admin/stats` | Training statistics per module (total enrollments) |

---

## 8. Error Codes

| Code | HTTP | Meaning | UI action |
|------|------|---------|-----------|
| `UNAUTHORIZED` | 401 | No/expired JWT | Re-login |
| `FORBIDDEN` | 403 | Not admin for admin routes | Hide admin UI |
| `MODULE_NOT_FOUND` | 404 | Invalid module ID | Show "not found" |
| `TRAINING_NOT_FOUND` | 404 | Invalid training record ID | Show "not found" |
| `TRAINING_NOT_IN_PROGRESS` | 422 | Completing a non-in-progress record | Show "start training first" |
| `VALIDATION_ERROR` | 400 | Missing required fields | Highlight fields |
| `INTERNAL_SERVER_ERROR` | 500 | Server failure | Retry with backoff |

---

## 9. UX Patterns

**Courier onboarding training flow:**
1. `GET /api/v1/training/eligibility/:learnerId` → show progress bar (`completionPercentage`) and list of `missingRequirements`.
2. `GET /api/v1/modules` → cross-reference `missingRequirements` IDs to get module names and `durationMinutes`.
3. For each required module → show card with difficulty badge, duration, and "Start" button.
4. On "Start" → `POST /start` → check response for `warnings` → show warning dialog if present → load `GET /modules/:id/content`.
5. As user advances → `POST /:id/progress` with section completion data.
6. On quiz submit → `POST /:id/complete` with score.
7. On `passed: true` → show badge award animation + `expiresAt` date.
8. On `passed: false` → show score vs `minimumScore`, attempts remaining (`maxAttempts - attempts`), "Try Again" button.
9. When all mandatory modules complete → `eligible: true` → unlock courier features.

**Certification expiry warning:**
- Show a warning badge on modules where `expiresAt` is within 30 days.
- Show "Expired" badge and require retake when `expired: true`.
- An expired certification counts as missing for eligibility — the courier loses access until they retake.

**Training progress screen:**
1. `GET /progress/:learnerId` → show per-module status with scores and expiry dates.
2. `GET /modules/badges/:learnerId` → show earned badges.
3. `GET /modules/leaderboard` → show leaderboard widget.

**Integration checklist:**
- [ ] Gate courier delivery acceptance behind `eligible: true` from eligibility check
- [ ] Show `missingRequirements` as a to-do list with module names (cross-reference with module catalog)
- [ ] Show `warnings` from `POST /start` response before loading module content
- [ ] Show score vs `minimumScore` on fail — not just "failed"
- [ ] Show `expiresAt` on completed modules — warn 30 days before expiry
- [ ] Handle expired certifications — treat as missing for eligibility
- [ ] Load module content (`GET /modules/:id/content`) only when user starts, not on catalog page

---

## 10. Route Map

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/training-service/api/v1/modules` | None | List modules |
| GET | `/api/training-service/api/v1/modules/leaderboard` | None | Leaderboard |
| GET | `/api/training-service/api/v1/modules/:id` | None | Get module |
| GET | `/api/training-service/api/v1/modules/:id/content` | None | Module content |
| GET | `/api/training-service/api/v1/modules/badges/:learnerId` | None | Learner badges |
| POST | `/api/training-service/api/v1/training/start` | JWT | Start training |
| POST | `/api/training-service/api/v1/training/:id/complete` | JWT | Complete training |
| GET | `/api/training-service/api/v1/training/progress/:learnerId` | JWT | Get progress |
| GET | `/api/training-service/api/v1/training/eligibility/:learnerId` | JWT | Check eligibility |
| GET | `/api/training-service/api/v1/training/available` | JWT | Available modules |
| POST | `/api/training-service/api/v1/training/:id/progress` | JWT | Track progress |
| GET | `/api/training-service/api/v1/training/admin/modules` | JWT (admin) | Admin: list modules |
| POST | `/api/training-service/api/v1/training/admin/modules` | JWT (admin) | Admin: create module |
| PUT | `/api/training-service/api/v1/training/admin/modules/:id` | JWT (admin) | Admin: update module |
| PATCH | `/api/training-service/api/v1/training/admin/modules/:id/content` | JWT (admin) | Admin: update content |
| DELETE | `/api/training-service/api/v1/training/admin/modules/:id` | JWT (admin) | Admin: delete module |
| GET | `/api/training-service/api/v1/training/admin/requirements` | JWT (admin) | Admin: list requirements |
| POST | `/api/training-service/api/v1/training/admin/requirements` | JWT (admin) | Admin: create requirement |
| PUT | `/api/training-service/api/v1/training/admin/requirements/:module` | JWT (admin) | Admin: update requirement |
| DELETE | `/api/training-service/api/v1/training/admin/requirements/:module` | JWT (admin) | Admin: delete requirement |
| GET | `/api/training-service/api/v1/training/admin/learners` | JWT (admin) | Admin: list learners |
| POST | `/api/training-service/api/v1/training/admin/complete-for-learner` | JWT (admin) | Admin: override complete |
| POST | `/api/training-service/api/v1/training/admin/grant-eligibility/:learnerId` | JWT (admin) | Admin: grant eligibility |
| DELETE | `/api/training-service/api/v1/training/admin/learners/:learnerId/reset` | JWT (admin) | Admin: reset records |
| GET | `/api/training-service/api/v1/training/admin/stats` | JWT (admin) | Admin: stats |
