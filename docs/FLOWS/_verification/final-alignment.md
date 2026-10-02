# Final Alignment Report — service-flow-documentation

> **Generated:** September 2026
> **Verification basis:** `docs/FLOWS/_verification/analysis-report.md` (September 2026 live endpoint sweep, 563 operations)
> **Spec:** `.kiro/specs/service-flow-documentation/`

---

## Summary Statistics

| Category | Count | Status |
|---|---|---|
| Role lifecycle overview documents | 9 | ✅ Complete |
| User flow documents (`{role}-flows.md`) | 44 | ✅ Complete |
| Frontend guide documents (`{role}-guide.md`) | 45 | ✅ Complete |
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
| **Verified** | ~19 | logistics (core), order, support, payout, catalog (products), checkout (confirm), auth (flows), payment (core + lookups) |
| **Partially Verified** | ~20 | auth (CSRF/refresh), wallet, notification, user, chat, inventory, business-registry (partial), training, analytics (read), enabler (lifecycle), production |
| **Failing (5xx)** | 0 endpoints (DEF-001 – DEF-004 resolved) | enabler (1 GET), analytics (1 PATCH), catalog (1 DELETE admin) — all now return accurate 404 / real data |
| **Missing (route-level 404)** | ~85 routes | most business-registry/public, most community — commission resolved (DEF-006), governance removed from the platform (DEF-007) |
| **Conflicting/Obsolete (405)** | 6 endpoints | checkout (5 cart endpoints), business-registry/public (1) |

---

## Resolved Defect Endpoints (DEF-001 – DEF-006)

| Endpoint | Service | Previous Status | Current Status | Notes |
|---|---|---|---|---|
| `GET /api/payment/payments/{id}` | payment-service | 500 FAILING | **200 / 404 VERIFIED** | Fixed schema discrepancy & prisma delegate query. Returns 200 with payment record or 404 if missing. |
| `GET /api/payment/payments/{id}/status` | payment-service | 500 FAILING | **200 / 404 VERIFIED** | Returns 200 with status payload or 404 if missing. |
| `GET /api/payment/payments/order/{orderId}` | payment-service | 500 FAILING | **200 / 404 VERIFIED** | Returns 200 with the persisted payment record; **404** `{success:false, error:"No payment found for the specified order"}` when the order has no payment row (was a fabricated 200 stub); 400 for a malformed order id. |
| `GET /api/enabler/enablers/{id}` | enabler-service | 500 FAILING / 200 stub | **200 / 404 VERIFIED** | Returns the real profile or 404 `{success:false, error:"Enabler not found"}`; no fabricated `pending` stub. |
| `PATCH /api/analytics/action-items/{actionId}/resolve` | analytics-service | 500 FAILING | **200 / 404 VERIFIED** | Prisma `P2025` mapped to 404 `{success:false, error:"Action item not found"}`; genuine failures stay 500. |
| `DELETE /api/catalog/v1/admin/buy-box/anomaly-flags/{flagId}` | catalog-service | 500 FAILING | **200 / 404 / 403 VERIFIED** | Prisma `P2025` mapped to 404 `{code:"ANOMALY_FLAG_NOT_FOUND"}`; permission failures stay 403. |
| `GET /api/wallet/wallets/{userId}/payout` | wallet-service | 200 stub (always empty) | **200 REAL / 404 VERIFIED** | Reads persisted payouts through `IPayoutServiceClient.getPayoutsByUserId`; 404 when the wallet does not exist. |
| `GET /api/wallet/wallets/{userId}/holds` | wallet-service | 200 stub (empty for any id) | **200 REAL / 404 VERIFIED** | 404 when the wallet does not exist, instead of an empty-200 payload. |
| `GET /api/payout/payouts/user/{userId}` | payout-service | Route-level 404 | **200 / 403 VERIFIED** | Newly registered user-scoped route backed by `PayoutRepository.findByUserId`; owner/admin/system allowed, cross-user → 403. |
| `GET /api/payout/payouts/user/{userId}`, `GET /api/payout/payouts`, `GET /api/payout/payouts/{payoutId}` | payout-service | Raw aggregate `{props:{...}}` (internal `id`, `Date` objects, unmasked PII) | **200 FLAT / 403 / 401 VERIFIED** | Reads now serialise through the documented `PayoutSummary` shape (`payoutId`, ISO timestamps); bank/mobile-money data is not returned in lists and the detail read only exposes a masked `phoneNumber` (DEF-011). |
| `POST /api/commission/calculate`, `PUT /api/commission/{id}/approve`, `GET /api/commission/{id}`, `GET /api/commission/sellers/{sellerId}`, `GET /api/commission/sellers/{sellerId}/summary`, `/api/commission/health*` | commission-service | Route-level 404 (whole surface mounted at `/api/commissions`) | **REGISTERED — 401/400/2xx VERIFIED** | `CommissionModule.name` had regressed to `commissions-service`; the bootstrap derives the mount path from the module name, so the surface moved to `/api/commissions`. Renamed back to `commission-service`, extracted the shared derivation `resolveModuleMountPath` and locked it with `services/commission-service/src/__tests__/commission-module.contract.test.ts` (all 8 contract operations and every E2E-referenced path answer non-404; mutation-tested). |

### Access-control hardening — payment reads (DEF-012)

| Endpoint | Service | Previous Status | Current Status | Notes |
|---|---|---|---|---|
| `GET /api/payment/payments/{id}`, `GET /api/payment/payments/{id}/status`, `GET /api/payment/payments/order/{orderId}` | payment-service | `200` for **any** authenticated caller (cross-user read; a seller token returned the buyer's `paymentId`/`userId`) | **owner 200 / cross-user 403 / anonymous 401 / unknown 404 VERIFIED** | Reads are owner-scoped through `requirePaymentReadCaller` (no identity → `401 UNAUTHORIZED`, resolved *before* any record lookup so ids cannot be probed) and `authorizePaymentRead` (caller ≠ record `userId` → `403 FORBIDDEN`). `admin`/`system` roles and resolved internal services keep unrestricted reads for saga reconciliation. Rule documented in `docs/FLOWS/payment/user-flow/buyer-flows.md`; covered by new unit + integration cases (payment-service suite green, 54/54 suites, 368/368 tests). |

### Verification-suite findings (September 2026 sweep)

The six-service Jest sweep surfaced five non-endpoint issues, tracked in `defect-register.md`:

| ID | Service | Status | Note |
|---|---|---|---|
| DEF-013 | analytics-service | **Resolved** | Two stale unit suites (`AnalyticsControllerEnhanced.test.ts`, `infrastructure/database/prisma.test.ts`) asserted contracts the shipped code no longer honours (500 vs. the degraded-200 founder dashboard; eager vs. lazy Prisma construction). Tests realigned to the implementation — both suites now pass (7/7 tests). |
| DEF-014 | catalog-service | **Resolved** | The catalog test-maintenance pass is complete: stale `501` not-implemented stubs realigned to the shipped `400` contract, requests signed with the real `JWT_SECRET`, prisma mocks extended with the `mediaRef` delegate, alias expectations repointed, timing assertions given warm-up runs, and duplicate legacy suites removed. Catalog project is fully green when run on its own — **226/226 suites, 2497/2497 tests, exit 0**. |
| DEF-015 | verification harness | **Resolved (workaround)** | Invoking Jest without `NODE_OPTIONS=--max-old-space-size=4096` aborts catalog-service with a V8 heap-limit crash (exit code `134`); the sanctioned runner `scripts/testing/run-jest-projects.js` sets that flag automatically. |
| DEF-016 | catalog-service | **Resolved** | `api/controllers/media.controller.ts` read `req.file` although `@types/multer` is not a dependency and no ambient `Express.Multer` augmentation exists, so the dynamically imported media-upload controller was rejected at type-check (`TS2339`). The controller now declares the consumed multipart shape locally; the upload route's `400 NO_FILE` guard is exercised green. |
| DEF-017 | verification harness | **Resolved (workaround)** | Jest projects must be run one at a time. Running payment-service and catalog-service concurrently starved the event loop and pushed the catalog wall-clock stress assertion to 410 ms average (budget 350 ms); the identical suite passes serially (50.6 s). |

**Sweep result:** with the 4 GB heap flag and one project at a time, every project re-run in this pass is green — payment-service (**54/54 suites, 368/368 tests**) after the DEF-012 ownership guard, and catalog-service (**226/226 suites, 2497/2497 tests**) after DEF-014/DEF-016. wallet-service, enabler-service and payout-service remain green as recorded above, and analytics-service is green after DEF-013.



## Failing Endpoints — Remaining Defect Backlog

No Failing (5xx) endpoints remain from the September 2026 sweep. DEF-001 through DEF-004 are resolved and live-verified.

| Endpoint | Service | Status | Flow Document | Frontend Guide |
|---|---|---|---|---|
| `GET /api/enabler/enablers/{id}` | enabler-service | **Resolved (DEF-002)** | `docs/FLOWS/enabler/user-flow/enabler-flows.md` | `docs/FLOWS/enabler/frontend-guide/enabler-guide.md` |
| `PATCH /api/analytics/action-items/{actionId}/resolve` | analytics-service | **Resolved (DEF-003)** | `docs/FLOWS/analytics/user-flow/seller-flows.md` | `docs/FLOWS/analytics/frontend-guide/seller-guide.md` |
| `DELETE /api/catalog/v1/admin/buy-box/anomaly-flags/{flagId}` | catalog-service | **Resolved (DEF-004)** | `docs/FLOWS/catalog/user-flow/seller-flows.md` | `docs/FLOWS/catalog/frontend-guide/seller-guide.md` |

**Alignment confirmed:** Every previously Failing endpoint has been fixed and its user flow document + frontend guide updated with the new response contract (`200` with real data, `404` for missing records) instead of a Known Gap section. No `⚠️ FAILING` badge remains for these endpoints.

---

## Missing Routes — Confirmed in Verification Sweep

All Missing (route-level 404) route groups have Known Gap sections documenting intended behavior without happy path steps.

| Route Group | Service | Status | Document |
|---|---|---|---|
| `/api/commission/*` | commission-service | **Verified (registered — DEF-006)** | `docs/FLOWS/commission/user-flow/seller-flows.md` |
| Most `/api/business-registry/public/*` sub-routes | business-registry-service | **Missing (route-level)** | `docs/FLOWS/business-registry/user-flow/seller-flows.md` |
| Most `/api/community/*` routes | community-service | **Missing (route-level)** | `docs/FLOWS/community/user-flow/buyer-flows.md`, `seller-flows.md` |

---

## Method Not Allowed (405) — Conflicting/Obsolete Endpoints

All 405 endpoints have conflict notes in their flow documents and are excluded from working flow documentation. The five checkout rows are legacy documentation paths that were never mounted — **resolved (DEF-005)**: the cart surface is implemented and documented under the canonical `/api/checkout/cart/*` prefix.

| Endpoint | Service | Documented As |
|---|---|---|
| `POST /api/checkout/items` | checkout-service | Legacy path, never mounted (**DEF-005**) — conflict note + canonical `/api/checkout/cart/items` in `checkout/user-flow/buyer-flows.md` |
| `PATCH /api/checkout/items` | checkout-service | Legacy path, never mounted (**DEF-005**) — canonical `/api/checkout/cart/items` |
| `DELETE /api/checkout/items` | checkout-service | Legacy path, never mounted (**DEF-005**) — canonical `/api/checkout/cart/items` |
| `POST /api/checkout/merge` | checkout-service | Legacy path, never mounted (**DEF-005**) — canonical `/api/checkout/cart/merge` |
| `DELETE /api/checkout/{cartId}` | checkout-service | Legacy path, never mounted (**DEF-005**) — canonical `/api/checkout/cart/{cartId}` |
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
| 3 | `docs/Flow Docs/07-admin-support-compliance.md` referenced `compliance-service` and live governance routes | Conflict notice prepended; governance routes removed from the platform (DEF-007) |
| 4 | `docs/Flow Docs/README.md` pointed to itself as canonical source | Deprecation notice prepended; `docs/FLOWS/` established as canonical |
| 5 | `docs/FLOWS/user-flow-maps.md` contained pre-verification diagrams | Converted to index; legacy diagrams archived at bottom with warning |
| 6 | Checkout cart item endpoints (`POST /api/checkout/items` etc.) documented implicitly as working in older flow docs | **Resolved (DEF-005):** legacy paths documented as never-mounted with a conflict preamble in the checkout flow doc; the cart surface is carried under the canonical `/api/checkout/cart/*` prefix in both API specs and guarded by the contract coverage ratchet |
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

| Gap | Impact | Fallback Documented | Status |
|---|---|---|---|
| Payment GET endpoints (3) | Formerly 500 on missing/mismatched data | Use order status + wallet statement | **Resolved (DEF-001)** — Live verified (200 / 404) |
| Enabler profile GET → 500 | No enabler profile retrieval | Use capabilities endpoint | Open (DEF-002) |
| Analytics action item resolve → 500 | No action item resolution | Read-only view; "temporarily unavailable" | Open (DEF-003) |
| Catalog buy-box flag deletion → 500 | No flag deletion | Read-only view for admin | Open (DEF-004) |
| Commission routes → all 404 | No commission API | Use wallet statement + enabler earnings | **Resolved (DEF-006)** — surface live at `/api/commission/*` |
| Governance routes → all 404 | Not part of the platform | Removed from both API specs, CI, npm scripts and docs | **Resolved (DEF-007)** — governance deleted outright instead of published |
| Most community routes → 404 | Community features unavailable | "Coming soon" placeholder | Known Gap |
| Most business-registry public routes → 404 | Limited public discovery | Only individual seller profile available | Known Gap |
| production-service event subscriptions unconfirmed | Inventory sync unverified | Partially Verified status throughout | Monitored |
| No dedicated compliance role | Compliance uses admin/support roles | Documented in compliance-officer-lifecycle | Working Pattern |
| No paginated KYC queue endpoint | KYC review requires knowing userId | Noted in compliance-officer-lifecycle | Working Pattern |
| SMS webhook 404 | SMS delivery status unknown | Tell user to check SMS directly | Monitored |

---

*This report was produced as part of the `service-flow-documentation` spec (September 2026). The verification evidence base is at `docs/FLOWS/_verification/analysis-report.md`. The canonical flow documentation is at `docs/FLOWS/`.*
