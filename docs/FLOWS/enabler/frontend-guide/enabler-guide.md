# Enabler Guide — Enabler Service

> Mirrors: `docs/FLOWS/enabler/user-flow/enabler-flows.md`
> Verification status: Mixed (lifecycle flows Partially Verified; GET profile resolved — accurate 404, DEF-002)
> Last updated: September 2026

## Overview

This guide covers the enabler activation journey: registration, admin approval, terms acceptance, training completion, and the two-gate activation. The most critical UI requirement is tracking both activation gates separately and surfacing which gate is blocking when a 409 is returned.

---

## Flow 1: Registration and Admin Approval

**User Goal:** Create an enabler account and await admin approval.

**UI States:** Registration form | Loading | Success (awaiting review) | Email exists | Error

- Submit: `POST /api/auth/register` with `{ role: "enabler", ... }`
- Post-registration: show "Your application is under review. You'll be notified when approved."
- Post-approval: status badge updates to `APPROVED` — proceed to terms + training

---

## Flow 2: Accept Terms (Idempotent)

**User Goal:** Accept the current platform terms (Gate 1 of activation).

**UI States:** Not accepted | Loading | Accepted ✓ | Wrong version (409) | Error

**Action:** `POST /api/enabler/enablers/:enablerId/terms` with `{ termsVersion: "2026-01" }`

- Success: show "Terms accepted ✓" with `termsAcceptedAt` date. Mark Gate 1 as satisfied.
- This endpoint is **idempotent** — calling it again is safe. Show "Re-accept terms" option if the version changes without side effects.

| Status | Code | User-Facing Message |
|---|---|---|
| 200 | — | "Terms accepted ✓" |
| 409 | — | "This terms version cannot be accepted. Please contact support." |
| 401 | UNAUTHORIZED | "Please log in again." |

---

## Flow 3: Two-Gate Activation

**User Goal:** Activate the enabler account to unlock commercial capabilities.

> ⚠️ **CRITICAL:** Track both gates separately in UI state. Do not show a single "ready to activate" state — show a checklist:
> - ☐ / ✓ **Terms accepted** (Gate 1)
> - ☐ / ✓ **Training completed** (Gate 2)
>
> Only enable the "Activate" button when both gates show ✓.

**UI States:** Gates incomplete (checklist) | Loading | Active ✓ | Gate 1 blocked | Gate 2 blocked | Both blocked | Error

**Action:** `POST /api/enabler/enablers/:enablerId/activation`

- Success: 200 → status = `ACTIVE` → show "You're now active! Start sharing products."
- 409 `TERMS_NOT_ACCEPTED`: highlight Gate 1 in red — "Please accept the current terms first." Link to terms acceptance.
- 409 `TRAINING_INCOMPLETE`: highlight Gate 2 in red — "Please complete all mandatory training modules first." Link to training.
- 409 both: highlight both gates.

**Activation checklist UI example:**
```
To activate your account, complete both steps:
☑ Terms accepted — 2026-09-01
☐ Training — 2 of 3 modules complete (1 remaining)

[Activate Account] ← disabled until both ✓
```

| Status | Code | User-Facing Message |
|---|---|---|
| 200 | — | "You're now active!" |
| 409 | TERMS_NOT_ACCEPTED | "Please accept the current terms first." |
| 409 | TRAINING_INCOMPLETE | "Please complete all mandatory training modules first." |
| 409 | WRONG_STATUS | "Your account is not in the correct state for activation." |

---

## Flow 4: View Capabilities

**User Goal:** See which commercial actions are currently available.

**UI States:** Loading | ACTIVE (all enabled) | RESTRICTED (view + share only) | SUSPENDED (all disabled) | Error

**Action:** `GET /api/enabler/enablers/:enablerId/capabilities`

Show a capability status list:
- VIEW_ELIGIBLE_PRODUCTS — "Browse products"
- SHARE_PRODUCT — "Share product links"
- BUILD_ORDER_DRAFT — "Build order for customer"
- GENERATE_CUSTOMER_LINK — "Generate referral link"
- ACCESS_PERMANENT_LINK — "Access permanent link"
- QUALIFY_EARNING — "Earn commission"

For `RESTRICTED` status: show which capabilities are blocked with a note: "Your account is restricted. Contact support to resolve."

---

## ✅ Resolved — GET Profile (DEF-002)

> `GET /api/enabler/enablers/{id}` now returns the real profile: `200` with `enablerCode`, `businessName`, `tier`, `totalSales`, `commissionRate` and all profile fields, or `404 {success:false, error:"Enabler not found"}` when the enabler has no profile row.
>
> **UI handling:**
> - Render the profile from the `200` payload as normal.
> - On `404`, show an onboarding/registration empty state ("Complete your enabler registration to start selling") rather than an error — a `404` here means "no profile yet", not a server failure.
> - `GET /api/enabler/enablers/:enablerId/capabilities` remains the lightest source for activation/status gating (`status`, `isOperational`, `capabilities`, `activation`, `lifecycle`).
>
> **Tracked in:** `docs/FLOWS/_verification/defect-register.md` (DEF-002)
