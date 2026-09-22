# Seller Guide — KYC Service

> Mirrors: `docs/FLOWS/kyc/user-flow/seller-flows.md`
> Verification status: Partially Verified (middleware behaviour confirmed; no standalone HTTP surface)
> Last updated: September 2026

## Overview

There is no KYC management screen that calls a `/api/kyc/*` endpoint — those routes do not exist. KYC gates surface as contextual error prompts when the seller attempts a gated action. This guide defines exactly what to show when a KYC gate blocks an action.

---

## KYC Gate: Product Creation (Level 1 Required)

When `POST /api/catalog/v1/products` returns **422 `KYC_LEVEL_INSUFFICIENT`**:

**Do NOT show a generic 422 error.** Show a contextual prompt:

```
To create product listings, you need to complete KYC verification.

[Complete KYC Verification →]
```

- Include a direct CTA linking to the KYC verification flow
- Show the seller's current KYC level if available from their profile
- After KYC is approved, the seller can retry product creation immediately — the gate will pass on the next request

---

## KYC Gate: Payout (Level 2 Required)

When `POST /api/payout/payouts` returns **422 `KYC_LEVEL_INSUFFICIENT`**:

**Do NOT show a generic error.** Show:

```
KYC level 2 is required to request payouts.
Complete your identity verification to unlock payouts.

[Complete KYC Verification →]
```

---

## After KYC Approval

When the seller's KYC is approved:
- Previously blocked actions become available immediately on the next request
- The UI should refresh capability state:
  - Re-enable the "Create product" button if it was disabled
  - Show the payout option if it was hidden
- Detection: re-attempt the previously blocked action — the gate will pass. Alternatively, check KYC level from the user profile endpoint.

---

## Error Code Reference

| HTTP Status | Error Code | Context | User-Facing Message |
|---|---|---|---|
| 422 | KYC_LEVEL_INSUFFICIENT | Product creation (needs level 1) | "Complete your KYC verification to start listing products." |
| 422 | KYC_LEVEL_INSUFFICIENT | Payout (needs level 2) | "KYC level 2 is required to request payouts." |

No other KYC-specific endpoints exist. All KYC enforcement is in-process middleware.
