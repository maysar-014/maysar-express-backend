# Seller Flows — Commission Service

> **Verification status:** Verified — the `/api/commission/*` surface is registered and reachable
> **Verification basis:** `docs/FLOWS/_verification/defect-register.md` (DEF-006, resolved)
> **Last updated:** September 2026

## Overview

commission-service exposes a live HTTP surface at `/api/commission/*`. Commission records are written
automatically when an order is fulfilled (the order saga computes the breakdown and credits the
recipient's wallet); the HTTP surface reads those records back and lets an admin/ops caller approve a
PENDING commission.

> **Resolved defect (DEF-006):** `CommissionModule.name` had regressed to `commissions-service`
> (commit `0eddebb0`). Because the bootstrap derives the mount path from the module name (strip
> `-service`, under `/api`), the whole surface moved to `/api/commissions` and every documented
> `/api/commission/*` call answered route-level 404. The module is named `commission-service` again
> and the derivation is locked by `resolveModuleMountPath` plus
> `services/commission-service/src/__tests__/commission-module.contract.test.ts`.

---

## Seller Flows (live)

| Flow | Endpoint | Auth | Description |
|---|---|---|---|
| Calculate commission | `POST /api/commission/calculate` | JWT (admin/system) | Compute the commission breakdown for an order → **201** |
| Approve commission | `PUT /api/commission/:id/approve` | JWT (admin/ops) | Approve a PENDING commission → **200** `{ approved: true, eventsGenerated: N }` |
| List seller commissions | `GET /api/commission/sellers/:sellerId` | JWT | Paginated commission history (`?status=&limit=&cursor=`) |
| Commission summary | `GET /api/commission/sellers/:sellerId/summary` | JWT | Aggregate commission stats for the seller |
| Single commission detail | `GET /api/commission/:id` | JWT | Detail for one commission record |
| Health / liveness / readiness | `GET /api/commission/health`, `/health/live`, `/health/ready` | none | Probes used by the orchestration layer |

**UI guidance**

- The seller dashboard earnings section reads `GET /api/commission/sellers/:sellerId/summary`.
- Approval is an admin/ops action. The approve response does **not** return the updated record — re-fetch
  `GET /api/commission/:id` afterwards for `status`, `approvedAt` and `approvedBy`.
- `GET /api/wallet/statement` remains the canonical view of credited amounts; the commission reads
  explain how those credits are composed.

---

## Enabler Reads

Enabler commission data uses the same endpoints with the enabler's `userId` as `sellerId`
(`GET /api/commission/sellers/:sellerId` and `.../summary`). See
`docs/commission/COMMISSION_SERVICE_FRONTEND_GUIDE.md` for the response shapes.
