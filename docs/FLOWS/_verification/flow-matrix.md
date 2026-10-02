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
- — : Role does not interact with this service directly.
