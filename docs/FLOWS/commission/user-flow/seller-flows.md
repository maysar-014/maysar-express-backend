# Seller Flows — Commission Service

> **Verification status:** Missing (all routes return route-level 404)
> **Verification basis:** `docs/FLOWS/_verification/analysis-report.md` (September 2026)
> **Last updated:** September 2026

## Overview

commission-service has **no active HTTP surface**. All `/api/commission/*` and `/api/commissions/*` routes return route-level 404 in the September 2026 sweep — the route surface is entirely unregistered. Commission is calculated internally by order fulfillment sagas and credited directly to the seller's or enabler's wallet. This document exists only to document the Known Gap and provide UI fallback guidance.

---

## Known Gap — Commission Service Routes (ALL MISSING)

> ⚠️ **ALL `/api/commission/*` routes return route-level 404 in the September 2026 sweep.**
> The commission service HTTP surface is entirely unregistered.
>
> Commission is calculated internally by order fulfillment sagas (`CalculateEnablerCommissionUseCase`) and credited directly to the seller's or enabler's wallet. No HTTP endpoint exists to retrieve commission details separately.
>
> **UI fallback:**
> - Wallet transaction history: `GET /api/wallet/statement` — shows commission credits as wallet transactions
> - Enabler earnings: `GET /api/enabler/enablers/:enablerId/earnings` and `/earnings/summary`
> - Do not build commission detail screens that call `/api/commission/*` until the routes are registered
>
> **Tracked in:** `docs/FLOWS/_verification/analysis-report.md` (September 2026 sweep — commission-service section)

---

## Intended Behavior (Background Context Only — Not Currently Available)

When the commission HTTP surface is active, the intended flows are:

| Flow | Endpoint | Description |
|---|---|---|
| Calculate commission | `POST /api/commissions/calculate` | Compute commission for an order |
| Approve commission | `POST /api/commissions/:id/approve` | Admin approves commission payout |
| List seller commissions | `GET /api/commissions/seller/:sellerId` | Seller views commission history |
| Commission summary | `GET /api/commissions/seller/:sellerId/summary` | Aggregate commission stats |
| Single commission detail | `GET /api/commissions/:id` | Detail for one commission record |

None of these endpoints are currently accessible. Do not document them as working flows.
