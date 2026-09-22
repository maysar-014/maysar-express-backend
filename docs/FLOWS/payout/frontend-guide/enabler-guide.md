# Enabler Guide — Payout Service

> Mirrors: `docs/FLOWS/payout/user-flow/seller-flows.md` (same flows, enabler role)
> Verification status: Verified
> Last updated: September 2026

## Overview

Payout UI for enablers. Commission earnings are accumulated in the enabler's wallet from attributed orders and are withdrawn via this payout flow. KYC level 2 is required.

The flows are identical to the seller payout guide. Key differences:
- Role is `enabler`
- Earnings source: commission credits from attributed order completions (via `CalculateEnablerCommissionUseCase`)
- Commission is credited directly to the wallet — there is no commission endpoint to check (see Known Gap in commission guide)

> ⚠️ **Role gate:** Never render the payout initiation UI for users with the `buyer` role.

See `docs/FLOWS/payout/frontend-guide/seller-guide.md` for the full UI states, error codes, and flow details — they are identical for the enabler role.

**Enabler-specific note on earnings display:** Since `/api/commission/*` endpoints are Missing, direct the enabler to:
- `GET /api/wallet/statement` — commission credits appear as `CREDIT` transactions
- `GET /api/enabler/enablers/:enablerId/earnings` — enabler-specific earnings summary
