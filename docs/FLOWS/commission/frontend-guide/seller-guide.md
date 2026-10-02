# Seller Guide — Commission Service

> Mirrors: `docs/FLOWS/commission/user-flow/seller-flows.md`
> Verification status: Verified — `/api/commission/*` is registered and reachable (DEF-006 resolved)
> Last updated: September 2026

## Commission UI (live)

The commission surface is live at `/api/commission/*`; build the seller earnings views against it.

| Screen element | Endpoint | Notes |
|---|---|---|
| Earnings summary card | `GET /api/commission/sellers/:sellerId/summary` | `totalOrders`, `grossRevenue`, `platformCommission`, `netRevenue`, `pendingPayout`, `paidOut` |
| Commission history table | `GET /api/commission/sellers/:sellerId` | Cursor pagination (`?limit=&cursor=&status=`) |
| Commission detail drawer | `GET /api/commission/:id` | `status`, `approvedAt`, `approvedBy`, breakdown lines |

**Approval is not a seller action.** `PUT /api/commission/:id/approve` requires an admin/ops token and
returns `{ approved: true, eventsGenerated: N }` — re-fetch the detail endpoint to read the updated row.

**Wallet statement remains canonical for money movement.** `GET /api/wallet/statement` shows the credits
that reached the wallet (`CREDIT` transactions); the commission endpoints explain their composition, so
link a commission row to the matching wallet entry.

> **Resolved defect (DEF-006):** the module had been renamed to `commissions-service`, which moved the
> surface to `/api/commissions` and made every `/api/commission/*` call answer 404. Both the module name
> and every reference are corrected, and the mount path is guarded by a contract test.
