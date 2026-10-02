# docs/FLOWS — Canonical Flow Documentation

> **This is the canonical source for all user flow documentation and frontend guides on the Maysar platform.**
> The legacy directory `docs/Flow Docs/` is now a deprecated archive. Always defer to this directory for implementation references.
>
> **Verification basis:** September 2026 live endpoint sweep — 563 operations across 22 services.
> **Core principle:** Verify → reconcile → define → document → diagram → re-verify.

---

## Quick Navigation by Role

| Role | Lifecycle Overview | Key Services |
|---|---|---|
| Buyer | [buyer-lifecycle.md](./role-overviews/buyer-lifecycle.md) | auth, catalog, checkout, order, logistics, payment, wallet, support, chat |
| Seller | [seller-lifecycle.md](./role-overviews/seller-lifecycle.md) | auth, business-registry, kyc (middleware), catalog, inventory, order, payout, analytics |
| Courier | [courier-lifecycle.md](./role-overviews/courier-lifecycle.md) | auth, logistics, maps, wallet, payout, training, notification |
| Enabler | [enabler-lifecycle.md](./role-overviews/enabler-lifecycle.md) | auth, enabler, training, kyc (middleware), commission, payout, wallet |
| Supplier | [supplier-lifecycle.md](./role-overviews/supplier-lifecycle.md) | auth, production, inventory, payout, wallet |
| Admin | [admin-lifecycle.md](./role-overviews/admin-lifecycle.md) | auth (2FA), user, support, catalog, analytics, order, payment |
| Support Agent | [support-agent-lifecycle.md](./role-overviews/support-agent-lifecycle.md) | auth, support, user, order |
| Compliance Officer | [compliance-officer-lifecycle.md](./role-overviews/compliance-officer-lifecycle.md) | auth, support (KYC lookup), user, kyc (events) |
| Platform Operator | [platform-operator-lifecycle.md](./role-overviews/platform-operator-lifecycle.md) | auth, all service maintenance endpoints (requires `x-service-key`) |

---

## Service Directory Map

| Service | Directory | Scope | Roles Covered | Notes |
|---|---|---|---|---|
| analytics-service | [analytics/](./analytics/) | Dashboards, seller metrics, action items, admin red-flags | Seller, Admin | ⚠️ `PATCH /api/analytics/action-items/{actionId}/resolve` → 500 FAILING |
| auth-service | [auth/](./auth/) | Register, login, 2FA, refresh, sessions, OAuth, phone OTP | All roles | CSRF required for 2FA; refresh requires body |
| business-registry-service | [business-registry/](./business-registry/) | Business CRUD, verification, documents | Seller, Admin | ⚠️ Most public sub-routes → route-level 404 (Missing) |
| catalog-service | [catalog/](./catalog/) | Product CRUD, search, buy-box, storefront, reviews | Buyer, Seller, Admin | ⚠️ Search endpoints → 301 redirects; buy-box flag deletion → 500 |
| chat-service | [chat/](./chat/) | Conversations, messages, WebSocket real-time | Buyer, Seller | WebSocket required for real-time delivery |
| checkout-service | [checkout/](./checkout/) | Delivery options, initiate, confirm, session status | Buyer | ⚠️ Cart item endpoints → 405 METHOD_NOT_ALLOWED |
| commission-service | [commission/](./commission/) | Commission calculate, approve, history | Seller, Enabler | ✅ Verified — surface live at `/api/commission/*` (DEF-006 resolved) |
| community-service | [community/](./community/) | Posts, discussions, knowledge articles, challenges | Buyer, Seller | ⚠️ Most routes → route-level 404 (Missing) |
| enabler-service | [enabler/](./enabler/) | Enabler lifecycle, capabilities, terms, activation | Enabler, Admin | ⚠️ `GET /api/enabler/enablers/{id}` → 500 FAILING |
| inventory-service | [inventory/](./inventory/) | Stock levels, adjustments, reservations, warehouses | Seller, Admin | Partially Verified |
| kyc-service | [kyc/](./kyc/) | KYC as shared middleware gate (no standalone HTTP) | Seller, Enabler, Supplier | No `/api/kyc/*` routes — in-process middleware only |
| logistics-service | [logistics/](./logistics/) | Quote, fulfillment options, courier dispatch, COD OTP, delivery lifecycle | Buyer, Courier | COD endpoints use legacy error format |
| maps-service | [maps/](./maps/) | Routing, geocoding (internal to logistics) | Courier (indirect) | Internal service — minimal direct user exposure |
| notification-service | [notification/](./notification/) | In-app notifications, push tokens, SMS, preferences | All roles | Consumer-only event service |
| order-service | [order/](./order/) | Order lifecycle, cancellation, COD eligibility, disputes | Buyer, Seller, Admin | Verified — full saga path confirmed |
| payment-service | [payment/](./payment/) | Payment methods, initiate, refund, admin roster | Buyer, Admin | ⚠️ GET status endpoints → 500 FAILING |
| payout-service | [payout/](./payout/) | Payout initiate, status, history, cancel | Seller, Courier, Enabler, Supplier | Buyer role → 403; KYC level 2 required |
| production-service | [production/](./production/) | Production plans, quality checkpoints | Supplier, Admin | ⚠️ No inter-service event subscriptions documented — Partially Verified |
| support-service | [support/](./support/) | Tickets, disputes, agents, admin inbox, KYC lookup | Buyer, Seller, Support Agent, Admin | Verified |
| training-service | [training/](./training/) | Modules, assessments, certification | Courier, Enabler | Gates courier delivery acceptance and enabler activation |
| user-service | [user/](./user/) | Profile, COD reputation, account states, suspend | All roles | Internal lookup endpoints require `x-service-key` |
| wallet-service | [wallet/](./wallet/) | Balance, holds, COD commitment, transactions | Buyer, Seller, Courier, Enabler, Supplier | Payout → 403 for buyer (correct) |
| **request-service** | [request/](./request/) | Custom procurement requests, quotes, assessment links, order conversion | Buyer (customer), Provider/Ops/Admin | Verified — 103/103 tests pass; token-based public endpoints for assessment link |

---

## Identified Conflicts — Resolved

The following 11 conflicts were identified during the pre-documentation audit and are resolved in the canonical documentation below. Legacy files have been updated with conflict/deprecation notices.

| # | Source File | What Is Wrong | Resolution |
|---|---|---|---|
| 1 | `docs/Flow Docs/05-courier-journeys.md` | Diagrams show direct delivery status writes; wrong dispatch model; COD OTP routed through payment-service (incorrect) | Replaced by `docs/FLOWS/logistics/user-flow/courier-flows.md`. Conflict notice prepended to source. |
| 2 | `docs/Flow Docs/03-seller-journeys.md` | `compliance-service` called as a live independent service for KYC/AML | `compliance-service` does not exist. KYC is `requireKycLevel` middleware. Replaced by `docs/FLOWS/kyc/user-flow/seller-flows.md`. Conflict notice prepended. |
| 3 | `docs/Flow Docs/07-admin-support-compliance.md` | `compliance-service` as live service throughout; governance routes referenced as active | `compliance-service` does not exist; governance is not part of the platform and was removed (DEF-007). Conflict notice prepended. |
| 4 | `docs/Flow Docs/README.md` | Points to `docs/Flow Docs/` as canonical source | Deprecation notice prepended. Canonical source is `docs/FLOWS/`. |
| 5 | `docs/FLOWS/user-flow-maps.md` | Detailed diagrams predating verification; deprecated endpoint patterns | Converted to high-level index. Legacy diagrams archived at bottom of file. |
| 6 | `docs/Flow Docs/02-customer-journeys.md` | References `POST /api/checkout/items` as part of checkout flow | The path was never mounted — OpenAPI documented `/api/checkout/items` while the router serves the cart surface under `/api/checkout/cart/*` (**Resolved, DEF-005**). Cart endpoints are implemented and contract-tested; conflict notes updated in `docs/FLOWS/checkout/user-flow/buyer-flows.md` and `docs/FLOWS/checkout/frontend-guide/buyer-guide.md`. |
| 7 | `docs/Flow Docs/03-seller-journeys.md` | Uses `POST /api/catalog/listings` — deprecated path | Verified path: `POST /api/catalog/v1/products`. Conflict notice prepended. |
| 8 | All docs referencing commission-service as active HTTP | The module was mounted at `/api/commissions` (name regression), so documented `/api/commission/*` paths returned route-level 404 | **Resolved (DEF-006)** — module renamed back to `commission-service`; `/api/commission/*` is live and documented in `docs/FLOWS/commission/user-flow/seller-flows.md`. |
| 9 | All docs referencing governance routes | The governance route surface was never shipped in the monolith and has now been removed from the platform (paths + schemas deleted from both API specs, CI job and npm scripts deleted) | Admin and compliance flows must not reference governance endpoints. **Resolved (DEF-007).** |
| 10 | `docs/Flow Docs/02-customer-journeys.md` | Payment status retrieval shown as working | `GET /api/payment/payments/{id}` and related → 500 FAILING. Documented as Known Gap. |
| 11 | Catalog search paths in flow docs | `GET /api/catalog/v1/search` and `/search/products` → 301 redirects | Frontend must use canonical target paths directly. Documented in catalog frontend guide. |

---

## Endpoint Classification Reference

### Failing Endpoints (5xx — flows depending on these are blocked)

| Endpoint | Service | Status | Affected Flow | Fallback |
|---|---|---|---|---|
| `GET /api/enabler/enablers/{id}` | enabler-service | 500 FAILING | Enabler profile view | Show loading skeleton; "Profile currently unavailable" |
| `GET /api/payment/payments/{id}` | payment-service | 500 FAILING | Buyer payment status | Use order status + wallet transaction history |
| `GET /api/payment/payments/{id}/status` | payment-service | 500 FAILING | Buyer payment status | Use order status + wallet transaction history |
| `GET /api/payment/payments/order/{orderId}` | payment-service | 500 FAILING | Buyer payment status | Use order status + wallet transaction history |
| `PATCH /api/analytics/action-items/{actionId}/resolve` | analytics-service | 500 FAILING | Seller action item resolution | Read-only view; "Action resolution currently unavailable" |
| `DELETE /api/catalog/v1/admin/buy-box/anomaly-flags/{flagId}` | catalog-service | 500 FAILING | Admin buy-box management | Read-only view; deletion unavailable |

### Missing Routes (route-level 404 — not current capabilities)

| Route Group | Service | Notes |
|---|---|---|
| Most `/api/business-registry/public/*` sub-routes | business-registry-service | `GET /public/sellers/{sellerId}` is Verified (data-level 404); others are Missing |
| Most `/api/community/*` routes | community-service | Core feed/post may be Partially Verified; articles/challenges/knowledge → Missing |

> **Resolved (DEF-006):** `/api/commission/*` was listed as a missing route group in the September 2026 sweep. The module name had regressed to `commissions-service`, mounting the surface at `/api/commissions`. The name is corrected and the surface is live at `/api/commission/*`.

### Method Not Allowed (405 — Conflicting/Obsolete endpoints)

| Endpoint | Service | Notes |
|---|---|---|
| `POST /api/checkout/items` | checkout-service | Legacy doc path, never mounted (**DEF-005**) — canonical path is `POST /api/checkout/cart/items` |
| `PATCH /api/checkout/items` | checkout-service | Legacy doc path, never mounted (**DEF-005**) — canonical path is `PATCH /api/checkout/cart/items` |
| `DELETE /api/checkout/items` | checkout-service | Legacy doc path, never mounted (**DEF-005**) — canonical path is `DELETE /api/checkout/cart/items` |
| `POST /api/checkout/merge` | checkout-service | Legacy doc path, never mounted (**DEF-005**) — canonical path is `POST /api/checkout/cart/merge` |
| `DELETE /api/checkout/{cartId}` | checkout-service | Legacy doc path, never mounted (**DEF-005**) — canonical path is `DELETE /api/checkout/cart/{cartId}` |
| `POST /api/business-registry/public` | business-registry-service | Do not document as working |

### Special Cases

| Endpoint / Behavior | Service | Notes |
|---|---|---|
| `POST /api/logistics/v1/cod/:deliveryId/otp` and `/verify` | logistics-service | Use **legacy error format** `{ "success": false, "error": "<string>" }` — UI must handle both formats |
| `GET /api/catalog/v1/search` | catalog-service | Returns **301 redirect** to `/api/catalog/v1/products/search?q=` — use canonical path |
| `GET /api/catalog/v1/search/products` | catalog-service | Returns **301 redirect** to `/api/catalog/v1/products/search` — use canonical path |
| `POST /api/auth/refresh` | auth-service | Requires refresh token in **request body** (not just JWT); returns 401 `"Refresh token required"` if body absent |
| `POST /api/auth/2fa/enable` and `/disable` | auth-service | Return **403 `"CSRF token missing"`** when CSRF token absent — UI must include CSRF token |
| All `/system/maintenance/cleanup/*` endpoints | all services | Require JWT (admin/system role) AND `x-service-key` header — internal/ops-only |

---

## Service Inventory

See `docs/FLOWS/_inventory.md` — Section 1 for the full service inventory table with base URL prefixes, primary role consumers, endpoint groups, and verification status notes for all 22 services.

---

## Role Inventory

See `docs/FLOWS/_inventory.md` — Section 2 for the full role inventory table with permission boundaries, primary services, hard prerequisites, and use case summaries for all 9 roles.

---

## Verification Evidence Base

All endpoint classification decisions are grounded in the live system sweep performed in September 2026.

- **Report:** `docs/FLOWS/_verification/analysis-report.md`
- **Raw data:** `docs/FLOWS/_verification/analysis.json` and `docs/FLOWS/_verification/sweep-summary.json`
- **Scope:** 563 operations across 22 services
- **Key statistics:**
  - Verified (2xx success): majority of read and write endpoints
  - Auth-blocked (requires valid JWT): ~33 operations
  - Permission boundary (role-gated): ~42 operations
  - Resource absent (data-level 404): ~101 operations (expected — no fixture data)
  - Failing (5xx): 6 endpoints (see table above)
  - Missing (route-level 404): ~101 routes
  - Method Not Allowed (405): 6 endpoints
  - Redirects (301): 2 endpoints

> The `_verification/` directory is **read-only**. Its contents are never modified except to add `final-alignment.md` at the end of the documentation process.

---

## Documentation Status

| Category | Count | Status |
|---|---|---|
| Role lifecycle overviews | 9 | ✅ Complete |
| User flow documents | 44 | ✅ Complete |
| Frontend guide documents | 45 | ✅ Complete |
| Mermaid diagrams embedded | 26 | ✅ Complete |
| Known gaps documented | 11 | ✅ Complete |
| Conflict notices applied | 4 | ✅ Complete |
| Final alignment report | 1 | ✅ Complete — `docs/FLOWS/_verification/final-alignment.md` |
| Last updated | September 2026 | — |
