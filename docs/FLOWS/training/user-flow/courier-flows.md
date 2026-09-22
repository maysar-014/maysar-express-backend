# Courier Flows — Training Service

> **Verification status:** Partially Verified
> **Verification basis:** `docs/FLOWS/_verification/analysis-report.md` (September 2026); `docs/training/TRAINING_SERVICE_SYSTEM.md`
> **Last updated:** September 2026

## Overview

Training-service flows for couriers. Completing all mandatory training modules and passing the assessment sets `certificationStatus === 'PASSED'`, which is required before a courier can receive delivery job assignments from the `DriverAssignmentEngine`. Use `role=COURIER` in all module queries.

The flows and endpoints are identical to the enabler training flows. See `docs/FLOWS/training/user-flow/enabler-flows.md` for full flow documentation (TRN-ENB-01 through TRN-ENB-04). Key differences:

| Item | Enabler | Courier |
|---|---|---|
| Role parameter | `?role=ENABLER` | `?role=COURIER` |
| Gate it satisfies | Gate 2 of enabler activation (`trainingStatus === 'completed'`) | Delivery job acceptance (`certificationStatus === 'PASSED'`) |
| Event published on pass | `training.certification_passed` → consumed by enabler-service | `training.certification_passed` → consumed by logistics-service |
| Post-pass effect | Enabler activation gate 2 satisfied | Courier eligible for `DriverAssignmentEngine` scoring |

**EXPIRED certification:** A courier with expired certification will fail the logistics-service hard eligibility gate and not receive delivery job assignments. The DriverAssignmentEngine checks `certificationStatus === 'PASSED'` and not expired at assignment time.

Refer to `docs/FLOWS/training/user-flow/enabler-flows.md` for the four flows:
- TRN-ENB-01: Browse Training Modules (use `?role=COURIER`)
- TRN-ENB-02: Start and Complete a Module
- TRN-ENB-03: Submit Assessment
- TRN-ENB-04: Check Certification Status
