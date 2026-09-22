# Courier Guide — Training Service

> Mirrors: `docs/FLOWS/training/user-flow/enabler-flows.md` (same endpoints, courier role)
> Verification status: Partially Verified
> Last updated: September 2026

## Overview

Same flows as the enabler training guide but for couriers. Passing the assessment sets `certificationStatus === 'PASSED'` which gates delivery job acceptance in logistics-service. Use `role=COURIER` in the modules query.

The flows and UI states are identical to `docs/FLOWS/training/frontend-guide/enabler-guide.md`. Key differences:

- Use `GET /api/training/api/v1/modules?role=COURIER`
- On pass: show "Certification complete ✓ — you can now receive delivery assignments."
- Courier certification gates: `certificationStatus === 'PASSED'` is checked by the DriverAssignmentEngine. Without it, the courier will not receive delivery jobs regardless of other eligibility gates.
- EXPIRED: "Your certification has expired. You cannot receive delivery jobs until you recertify. Please retake the assessment."

See `docs/FLOWS/training/frontend-guide/enabler-guide.md` for the full UI states, error codes, and flow details — they are identical except for the role parameter and the post-pass messaging.
