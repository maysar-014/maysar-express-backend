# Seller Guide — Commission Service

> Mirrors: `docs/FLOWS/commission/user-flow/seller-flows.md`
> Verification status: Missing (all routes return route-level 404)
> Last updated: September 2026

## ⚠️ Known Gap — Commission Service Entirely Unavailable

All `/api/commission/*` routes return route-level 404. Do not build any UI that calls commission endpoints.

**UI treatment:** Do not show a "Commission Details" section. Instead, direct sellers to:
- Wallet transaction history: `GET /api/wallet/statement` — commission credits appear as `CREDIT` transactions
- Enabler earnings: `GET /api/enabler/enablers/:enablerId/earnings`

**Placeholder message if a commission section is needed in the UI:**
```
"Commission details are not yet available.
View your earnings in your wallet statement."
```

---

## Intended Behavior (When Routes Become Available)

Commission endpoints are expected to provide:
- Commission calculation history
- Approval status per order
- Aggregate commission summary

Do not implement these screens until routes are confirmed active.
