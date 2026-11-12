# Flow Verification Matrix

> **Generated:** September 2026
> **Basis:** Live sweep of 563 operations + role-based journey test executions
> **Scope:** 24 monolith backend services x 7 system user roles

| Service | Buyer | Seller | Courier | Supplier | Enabler | Admin | Support Agent |
|---|---|---|---|---|---|---|---|
| **analytics** | — | ⚠️ [Flows](analytics/user-flow/seller-flows.md) | — | — | — | ⚠️ [Flows](analytics/user-flow/admin-flows.md) | — |
| **auth** | ⚠️ [Flows](auth/user-flow/buyer-flows.md) | ⚠️ [Flows](auth/user-flow/seller-flows.md) | ⚠️ [Flows](auth/user-flow/courier-flows.md) | ⚠️ [Flows](auth/user-flow/supplier-flows.md) | ⚠️ [Flows](auth/user-flow/enabler-flows.md) | ⚠️ [Flows](auth/user-flow/admin-flows.md) | — |
| **business-registry** | — | ✅ [Flows](business-registry/user-flow/seller-flows.md) | — | — | — | — | — |
| **catalog** | ⚠️ [Flows](catalog/user-flow/buyer-flows.md) | ✅ [Flows](catalog/user-flow/seller-flows.md) | — | — | — | — | — |
| **chat** | ⚠️ [Flows](chat/user-flow/buyer-flows.md) | ⚠️ [Flows](chat/user-flow/seller-flows.md) | — | — | — | — | — |
| **checkout** | ⚠️ [Flows](checkout/user-flow/buyer-flows.md) | — | — | — | — | — | — |
| **commission** | — | ❌ [Flows](commission/user-flow/seller-flows.md) | — | — | — | — | — |
| **community** | ❌ [Flows](community/user-flow/buyer-flows.md) | ❌ [Flows](community/user-flow/seller-flows.md) | — | — | — | — | — |
| **enabler** | — | — | — | — | ⚠️ [Flows](enabler/user-flow/enabler-flows.md) | — | — |
| **inventory** | — | ⚠️ [Flows](inventory/user-flow/seller-flows.md) | — | — | — | — | — |
| **kyc** | — | ⚠️ [Flows](kyc/user-flow/seller-flows.md) | — | — | ⚠️ [Flows](kyc/user-flow/enabler-flows.md) | — | — |
| **logistics** | ⚠️ [Flows](logistics/user-flow/buyer-flows.md) | — | ✅ [Flows](logistics/user-flow/courier-flows.md) | — | — | — | — |
| **maps** | — | — | ⚠️ [Flows](maps/user-flow/courier-flows.md) | — | — | — | — |
| **notification** | ⚠️ [Flows](notification/user-flow/buyer-flows.md) | — | — | — | — | — | — |
| **order** | ✅ [Flows](order/user-flow/buyer-flows.md) | ✅ [Flows](order/user-flow/seller-flows.md) | — | — | — | — | — |
| **payment** | ⚠️ [Flows](payment/user-flow/buyer-flows.md) | — | — | — | — | — | — |
| **payout** | — | ✅ [Flows](payout/user-flow/seller-flows.md) | ✅ [Flows](payout/user-flow/courier-flows.md) | ✅ [Flows](payout/user-flow/supplier-flows.md) | 🔄 [Flows](payout/user-flow/enabler-flows.md) | — | — |
| **production** | — | — | — | ⚠️ [Flows](production/user-flow/supplier-flows.md) | — | — | — |
| **request** | ✅ [Flows](request/user-flow/buyer-flows.md) | — | — | ✅ [Flows](request/user-flow/supplier-flows.md) | — | — | — |
| **support** | ✅ [Flows](support/user-flow/buyer-flows.md) | ✅ [Flows](support/user-flow/seller-flows.md) | — | — | — | — | ✅ [Flows](support/user-flow/support-agent-flows.md) |
| **training** | — | — | ⚠️ [Flows](training/user-flow/courier-flows.md) | — | ⚠️ [Flows](training/user-flow/enabler-flows.md) | — | — |
| **user** | ⚠️ [Flows](user/user-flow/buyer-flows.md) | — | — | — | — | ⚠️ [Flows](user/user-flow/admin-flows.md) | — |
| **wallet** | ⚠️ [Flows](wallet/user-flow/buyer-flows.md) | ⚠️ [Flows](wallet/user-flow/seller-flows.md) | ⚠️ [Flows](wallet/user-flow/courier-flows.md) | — | — | — | — |

### Legend
- ✅ **Verified**: Endpoints tested and confirmed live (200/201/204).
- ⚠️ **Partially Verified**: Working endpoints verified; peripheral or cross-service events pending.
- ❌ **Missing**: Route-level 404 (service routes not registered in Express monolith).
- 🛑 **Failing**: Endpoints returning unhandled 500 errors.
---

## October 2026 — Post-Sweep Verification Corrections

> Corrective entries only; the September 2026 sweep rows stand otherwise. Verified live by the October probe pass.

| Service / Role | Cell in September matrix | Correction | Evidence |
|---|---|---|---|
| commission / seller | ❌ `commission/user-flow/seller-flows.md` | ✅ Verified live | `/api/commission/*` live at DEF-006; seller flow docs current; approved rate ≤ 25% |
| commission / enabler | 🔄 `commission/user-flow/enabler-flows.md` | ✅ Verified | Commission reads at `GET /api/commission/sellers/:sellerId` |
| wallet / supplier | — | ✅ Verified (by exclusion) | Wallet service excludes suppliers (403 `FORBIDDEN`) — exclusion docs per flow, no HTTP surface |
| wallet / enabler | — | ✅ Verified (by exclusion) | Wallet service excludes enablers (403); earnings via payout-service |
| enabler / admin | ⚠ `enabler/user-flow/admin-flows.md` | ✅ Verified | Admin approval gate live; `GET /api/enabler/enablers/{id}` → accurate 404 (DEF-002 resolved) |
| kyc / supplier | ⚠ `kyc/user-flow/supplier-flows.md` | ✅ Verified | No `/api/kyc/*` routes; in-process `requireKycLevel(N)` middleware; listing cap 5 (`KYC_LISTING_CAP_REACHED`); payout KYC ≥ 2 (`KYC_LEVEL_INSUFFICIENT`) |
| support / agent | ⚠️ `support/user-flow/support-agent-flows.md` | ✅ Verified | Inbox on `GET /api/support/tickets` (not legacy `/admin/tickets`); `SUP-AGT-01` corrected in doc |
| support / admin | ⚠️ `support/user-flow/admin-flows.md` | ✅ Verified | Legacy `/admin/*` paths (`/tickets`, `/kyc/:userId`, `/disputes/:id/resolve`) return 404; outbox cleanup needs JWT + `x-service-key` |

---

## Remaining Open Coverage (for the next pass)

| Role | Service | Status |
|---|---|---|
| Supplier | maps | No maps documentation yet (maps service is internal-only); coverage deferred to logistics/order-facing supplier docs |
| Admin | support | admin-flows.md corrected (legacy phantom paths removed); support-agent-flows.md corrected |

