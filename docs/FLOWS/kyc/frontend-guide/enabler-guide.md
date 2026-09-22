# Enabler Guide — KYC Service

> Mirrors: `docs/FLOWS/kyc/user-flow/enabler-flows.md`
> Verification status: Partially Verified (middleware behaviour confirmed)
> Last updated: September 2026

## Overview

Same pattern as the seller KYC guide. KYC gates surface contextually — there is no `/api/kyc/*` endpoint. This guide defines what to show when a KYC gate blocks an enabler action.

---

## KYC Gate: Listing Creation (Level 1 Required)

When `POST /api/enabler/enablers/:enablerId/listings` returns **422 `KYC_LEVEL_REQUIRED`**:

Show a contextual prompt:
```
To create product listings, you need to complete KYC verification.

[Complete KYC Verification →]
```

---

## KYC Gate: Payout (Level 2 Required)

When `POST /api/payout/payouts` returns **422 `KYC_LEVEL_INSUFFICIENT`**:

Show:
```
KYC level 2 is required to request payouts.
Complete your identity verification to unlock payouts.

[Complete KYC Verification →]
```

---

## After KYC Approval

Previously blocked actions become available immediately on the next request. Refresh capability state after approval notification.

| HTTP Status | Error Code | Context | User-Facing Message |
|---|---|---|---|
| 422 | KYC_LEVEL_REQUIRED | Listing creation (needs level 1) | "Complete your KYC verification to create listings." |
| 422 | KYC_LEVEL_INSUFFICIENT | Payout (needs level 2) | "KYC level 2 is required to request payouts." |
