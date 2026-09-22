# Final Alignment Report — service-flow-documentation

> **Generated:** September 2026
> **Verification basis:** `docs/FLOWS/_verification/analysis-report.md` (September 2026 live endpoint sweep, 563 operations)
> **Spec:** `.kiro/specs/service-flow-documentation/`

---

## Summary Statistics

| Category | Count | Status |
|---|---|---|
| Role lifecycle overview documents | 9 | ✅ Complete |
| User flow documents (`{role}-flows.md`) | 42 | ✅ Complete |
| Frontend guide documents (`{role}-guide.md`) | 43 | ✅ Complete |
| Mermaid diagrams embedded | 26 | ✅ Complete |
| Service directories with `user-flow/` + `frontend-guide/` | 22 | ✅ Complete |
| Conflicts resolved (legacy docs updated with notices) | 4 | ✅ Complete |
| Known Gap sections documented | 11 distinct gaps | ✅ Complete |
| Final alignment report | 1 | ✅ This document |
| `docs/Flow Docs/README.md` deprecation notice | Applied | ✅ Complete |
| `docs/FLOWS/user-flow-maps.md` converted to index | Applied | ✅ Complete |

---

## Flow Verification Status Summary

| Verification Status | Count | Primary Services |
|---|---|---|
| **Verified** | ~18 | logistics (core), order, support, payout, catalog (products), checkout (confirm), auth (flows) |
| **Partially Verified** | ~20 | auth (CSRF/refresh), wallet, notification, user, chat, inventory, business-registry (partial), training, analytics (read), enabler (lifecycle), production |
| **Failing (5xx)** | 6 endpoints across 3 services | payment (3 GET), enabler (1 GET), analytics (1 PATCH), catalog (1 DELETE admin) |
| **Missing (route-level 404)** | ~101 routes | commission (all), governance (all), most business-registry/public, most community |
| **Conflicting/Obsolete (405)** | 6 endpoints | checkout (5 cart endpoints), business-registry/public (1) |

---

## Failing Endpoints — Confirmed in Verification Sweep

All Failing (5xx) endpoints have dedicated Known Gap sections in their respective flow documents and frontend guides.

| Endpoint | Service | Status | Flow Document | Frontend Guide |
|---|---|---|---|---|
| `GET /api/payment/payments/{id}` | payment-service | **500 FAILING** | `docs/FLOWS/payment/user-flow/buyer-flows.md` | `docs/FLOWS/payment/frontend-guide/buyer-guide.md` |
| `GET /api/payment/payments/{id}/status` | payment-service | **500 FAILING** | `docs/FLOWS/payment/user-flow/buyer-flows.md` | `docs/FLOWS/payment/frontend-guide/buyer-guide.md` |
| `GET /api/payment/payments/order/{orderId}` | payment-service | **500 FAILING** | `docs/FLOWS/payment/user-flow/buyer-flows.md` | `docs/FLOWS/payment/frontend-guide/buyer-guide.md` |
| `GET /api/enabler/enablers/{id}` | enabler-service | **500 FAILING** | `docs/FLOWS/enabler/user-flow/enabler-flows.md` | `docs/FLOWS/enabler/frontend-guide/enabler-guide.md` |
| `PATCH /api/analytics/action-items/{actionId}/resolve` | analytics-service | **500 FAILING** | `docs/FLOWS/analytics/user-flow/seller-flows.md` | `docs/FLOWS/analytics/frontend-guide/seller-guide.md` |
| `DELETE /api/catalog/v1/admin/buy-box/anomaly-flags/{flagId}` | catalog-service | **500 FAILING** | `docs/FLOWS/catalog/user-flow/seller-flows.md` | `docs/FLOWS/catalog/frontend-guide/seller-guide.md` |

**Alignment confirmed:** Every Failing endpoint is marked `⚠️ FAILING` in its user flow document and has a "Known Gap — Not Yet Verified" section in the corresponding frontend guide with an explicit UI fallback recommendation.

---

## Missing Routes — Confirmed in Verification Sweep

All Missing (route-level 404) route groups have Known Gap sections documenting intended behavior without happy path steps.

| Route Group | Service | Status | Document |
|---|---|---|---|
| `/api/commission/*` | commission-service | **Missing (all routes)** | `docs/FLOWS/commission/user-flow/seller-flows.md` |
| `/api/governance/*` | unknown | **Missing (all routes)** | Noted in `docs/FLOWS/role-overviews/admin-lifecycle.md` |
| Most `/api/business-registry/public/*` sub-routes | business-registry-service | **Missing (route-level)** | `docs/FLOWS/business-registry/user-flow/seller-flows.md` |
| Most `/api/community/*` routes | community-service | **Missing (route-level)** | `docs/FLOWS/community/user-flow/buyer-flows.md`, `seller-flows.md` |

---

## Method Not Allowed (405) — Conflicting/Obsolete Endpoints

All 405 endpoints have conflict notes in their flow documents and are excluded from working flow documentation.

| Endpoint | Service | Documented As |
|---|---|---|
| `POST /api/checkout/items` | checkout-service | Conflicting/Obsolete — 405 preamble in `checkout/user-flow/buyer-flows.md` |
| `PATCH /api/checkout/items` | checkout-service | Conflicting/Obsolete |
| `DELETE /api/checkout/items` | checkout-service | Conflicting/Obsolete |
| `POST /api/checkout/merge` | checkout-service | Conflicting/Obsolete |
| `DELETE /api/checkout/{cartId}` | checkout-service | Conflicting/Obsolete |
| `POST /api/business-registry/public` | business-registry-service | Conflicting/Obsolete |

---

## Special Cases — Correctly Documented

| Behavior | Service | Document |
|---|---|---|
| COD endpoints use legacy error format `{ "success": false, "error": "<string>" }` | logistics-service | `docs/FLOWS/logistics/user-flow/courier-flows.md`, `docs/FLOWS/logistics/frontend-guide/courier-guide.md` |
| `GET /api/catalog/v1/search` → 301 redirect (use canonical path) | catalog-service | `docs/FLOWS/catalog/user-flow/buyer-flows.md`, `docs/FLOWS/catalog/frontend-guide/buyer-guide.md` |
| `GET /api/catalog/v1/search/products` → 301 redirect | catalog-service | Same as above |
| `POST /api/auth/refresh` requires refresh token in request body | auth-service | All auth user flow + frontend guide docs |
| `POST /api/auth/2fa/enable` and `/disable` require CSRF token | auth-service | All auth user flow + frontend guide docs |
| `/system/maintenance/cleanup/*` requires JWT + `x-service-key` | all services | `docs/FLOWS/role-overviews/platform-operator-lifecycle.md`, `docs/FLOWS/role-overviews/admin-lifecycle.md` |
| `compliance-service` does not exist | N/A | Conflict notices on `docs/Flow Docs/03-seller-journeys.md`, `docs/Flow Docs/07-admin-support-compliance.md` |
| `kyc-service` is middleware only (no standalone HTTP surface) | kyc-service | `docs/FLOWS/kyc/user-flow/seller-flows.md`, `docs/FLOWS/kyc/user-flow/enabler-flows.md` |
| `production-service` has no confirmed inter-service event subscriptions | production-service | `docs/FLOWS/production/user-flow/supplier-flows.md`, `docs/FLOWS/role-overviews/supplier-lifecycle.md` |

---

## Discrepancies Resolved During Alignment

| # | Discrepancy | Resolution |
|---|---|---|
| 1 | `docs/Flow Docs/05-courier-journeys.md` showed obsolete dispatch model (bare Logistics_Delivery, COD through payment-service) | Conflict notice prepended; canonical replacement: `docs/FLOWS/logistics/user-flow/courier-flows.md` |
| 2 | `docs/Flow Docs/03-seller-journeys.md` referenced `compliance-service` as live | Conflict notice prepended; KYC documented correctly as in-process middleware |
| 3 | `docs/Flow Docs/07-admin-support-compliance.md` referenced `compliance-service` and live governance routes | Conflict notice prepended |
| 4 | `docs/Flow Docs/README.md` pointed to itself as canonical source | Deprecation notice prepended; `docs/FLOWS/` established as canonical |
| 5 | `docs/FLOWS/user-flow-maps.md` contained pre-verification diagrams | Converted to index; legacy diagrams archived at bottom with warning |
| 6 | Checkout cart item endpoints (`POST /api/checkout/items` etc.) documented implicitly as working in older flow docs | All 405 endpoints documented as Conflicting/Obsolete with preamble in checkout flow doc |
| 7 | Catalog search redirect paths used in flow references | All flow/guide docs use canonical `/api/catalog/v1/products/search` directly |

---

## Alignment Confirmation Checklist

- [x] Every flow marked Verified or Partially Verified references a primary endpoint that returns non-5xx for the happy path in the verification sweep
- [x] Every Known Gap section corresponds to an endpoint confirmed as Failing (5xx) or Missing (route-level 404) in the September 2026 sweep
- [x] Every frontend guide's error handling references endpoints that appear in its paired user flow document
- [x] All 4 legacy `docs/Flow Docs/` conflict/deprecation notices applied
- [x] `docs/FLOWS/user-flow-maps.md` converted to navigation index with legacy diagrams archived
- [x] `compliance-service` references corrected in all canonical documentation (does not exist; KYC is in-process middleware)
- [x] COD legacy error format (`{ "success": false, "error": "<string>" }`) documented in logistics courier flow and frontend guide
- [x] `POST /api/auth/refresh` refresh-token-in-body requirement documented in all auth flow and guide files
- [x] `POST /api/auth/2fa/enable` and `/disable` CSRF requirement documented in all auth flow and guide files
- [x] `shippingCostTzs` read-from-quote-only rule documented in checkout user flow and buyer guide
- [x] Checkout confirmation idempotency documented in checkout user flow and buyer guide
- [x] `availableBalance` (not raw `balance`) rule documented in all wallet guides
- [x] Payout UI role gate (buyer → 403) documented in all payout guides
- [x] 9 role lifecycle overviews complete with verification status headers

---

## Remaining Known Gaps (Not Blocking)

These gaps are documented throughout the flow documentation but remain unresolved at the system level. They do not block the documentation — each has a documented fallback.

| Gap | Impact | Fallback Documented |
|---|---|---|
| Payment GET endpoints (3) → 500 | No payment status lookup | Use order status + wallet statement |
| Enabler profile GET → 500 | No enabler profile retrieval | Use capabilities endpoint |
| Analytics action item resolve → 500 | No action item resolution | Read-only view; "temporarily unavailable" |
| Catalog buy-box flag deletion → 500 | No flag deletion | Read-only view for admin |
| Commission routes → all 404 | No commission API | Use wallet statement + enabler earnings |
| Governance routes → all 404 | No governance feature | Not documented as capability |
| Most community routes → 404 | Community features unavailable | "Coming soon" placeholder |
| Most business-registry public routes → 404 | Limited public discovery | Only individual seller profile available |
| production-service event subscriptions unconfirmed | Inventory sync unverified | Partially Verified status throughout |
| No dedicated compliance role | Compliance uses admin/support roles | Documented in compliance-officer-lifecycle |
| No paginated KYC queue endpoint | KYC review requires knowing userId | Noted in compliance-officer-lifecycle |
| SMS webhook 404 | SMS delivery status unknown | Tell user to check SMS directly |

---

*This report was produced as part of the `service-flow-documentation` spec (September 2026). The verification evidence base is at `docs/FLOWS/_verification/analysis-report.md`. The canonical flow documentation is at `docs/FLOWS/`.*
