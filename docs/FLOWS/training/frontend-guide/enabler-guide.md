# Enabler Guide — Training Service

> Mirrors: `docs/FLOWS/training/user-flow/enabler-flows.md`
> Verification status: Partially Verified
> Last updated: September 2026

## Overview

This guide covers the training UI for enablers. Completing all mandatory training modules and passing the assessment satisfies Gate 2 of the two-gate activation in enabler-service. The same endpoints apply to couriers (see `docs/FLOWS/training/frontend-guide/courier-guide.md`).

---

## Flow 1: Browse Training Modules

**User Goal:** See required and optional modules and overall certification progress.

**UI States:** Loading (skeleton list) | Module list with progress | Empty | Error

**Action:** `GET /api/training/api/v1/modules?role=ENABLER`

Show each module with:
- MANDATORY / OPTIONAL badge
- Completion status: NOT_STARTED / IN_PROGRESS / COMPLETED
- Estimated duration

Show overall progress bar: "X of Y mandatory modules complete"

| Status | Message |
|---|---|
| 401 | "Please log in again." |
| 5xx | "Something went wrong. Please try again." |

---

## Flow 2: Start and Complete a Module

**User Goal:** Work through a training module.

**UI States:** Not started | In progress (content visible) | Completed ✓

**Actions:**
- Start: `POST /api/training/api/v1/modules/:moduleId/start` → show module content
- Complete: `POST /api/training/api/v1/modules/:moduleId/complete` → mark ✓ in module list; update progress bar

After completing all mandatory modules, show: "All required modules complete — you're ready for the assessment."

| Status | Message |
|---|---|
| 404 | "Module not found." |
| 5xx | "Something went wrong. Please try again." |

---

## Flow 3: Submit Assessment

**User Goal:** Pass the assessment to complete training (Gate 2).

**UI States:** Question form | Loading ("Submitting...") | Pass ✓ | Fail (score + retry) | Max attempts (disabled)

**Action:** `POST /api/training/api/v1/assessments/:assessmentId/submit` with `{ answers: [...] }`

**On pass:** Show "Assessment passed ✓ — Training completed!" with score. Gate 2 is now satisfied. Link back to enabler activation screen.

**On fail:** Show score vs passing score. Display improvement feedback. Show "Retry" button. Note cooldown period if applicable.

**Max attempts exceeded:** "Maximum attempts reached. Please contact support to reset your assessment." Disable retry.

| Status | Message |
|---|---|
| 422 VALIDATION_ERROR | "Please answer all questions before submitting." |
| 403 | "Maximum attempts exceeded. Please contact support." |
| 429 | "Please wait before retrying. A cooldown period is in effect." |
| 5xx | "Something went wrong. Please try again." |

---

## Flow 4: Check Certification Status

**User Goal:** See current certification progress and expiry.

**Action:** `GET /api/training/certification`

| Certification Status | What to Show |
|---|---|
| NOT_STARTED | "Complete the modules above to begin certification." |
| IN_PROGRESS | Progress bar with completed/total |
| PASSED | "Certified ✓ — expires [date]" |
| FAILED | "Assessment failed. Retry when cooldown expires." |
| EXPIRED | "Your certification has expired. Please retake the assessment." |

Gate 2 is satisfied only when status is `PASSED` and not expired.
