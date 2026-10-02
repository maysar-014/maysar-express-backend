# Maysar Commission Service — Implementation Reference (As-Built)

> **Status:** Live and verified — commission calculation for sellers, enablers, and customers; rate configuration; saga-based settlement.
> **Last updated:** September 2026
> **Scope:** `services/commission-service`

---

## 1. Guiding Principles

| Principle | Where it lives |
|---|---|
| **Commission rates are configurable per role and category** | `CommissionRate` entity with `role`, `categoryId`, `rate`, `effectiveFrom` |
| **Commission is calculated post-delivery** | `SettlementSaga` triggers commission calculation after `order.delivered` |
| **Enabler attribution is order-scoped** | Each order carries `enablerId` if placed via referral link; commission splits accordingly |
| **Commission records are immutable** | Created once on settlement; adjustments create new records |

---

## 2. Commission Rates (from CommissionCalculationEngine — live code)

Base rates by recipient and commission type:

| Recipient | SALE | REFERRAL | TASK_ASSIGNMENT | TASK_COMPLETION | COLLABORATION_SETUP |
|---|---|---|---|---|---|
| `SELLER` | 8% | 5% | — | — | — |
| `ENABLER` | — | — | 15% | 20% | 10% |
| `CUSTOMER` | — | 3% | — | — | — |
| `COURIER` | — | — | — | — | — |

Quality bonuses (added on top of base):
- Rating ≥ 4.8 → +5% of base commission
- Rating = 5.0 → additional +5% (total +10%)
- On-time delivery → +5%
- Customer satisfaction ≥ 4.5 → +3%

Special bonuses:
- First order → fixed TZS 50 bonus
- Bulk order (order amount > TZS 1,000) → +2% of order amount
- Promotional period → +1% of order amount

---

## 3. Application Layer

| Use case | What it does |
|---|---|
| `CalculateCommissionUseCase` | Applies rate rules to order → produces commission breakdown |
| `RecordCommissionUseCase` | Persists commission record after settlement |
| `GetCommissionRatesUseCase` | Returns applicable rates for a category/role |
| `UpdateCommissionRateUseCase` | Admin rate configuration |
| `GetSellerCommissionSummaryUseCase` | Seller earnings summary |
| `GetEnablerCommissionSummaryUseCase` | Enabler earnings summary |

---

## 4. HTTP Surface

Mounted at `/api/commission`. The module is named `commission-service`; the bootstrap derives the mount path from that name (`resolveModuleMountPath` in `src/core/module-registry.ts` → name minus `-service`, under `/api`).

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/commission/calculate` | JWT (admin/system) | Calculate commission |
| PUT  | `/api/commission/:id/approve` | JWT (admin/ops) | Approve commission |
| GET  | `/api/commission/sellers/:sellerId` | JWT | List seller commissions |
| GET  | `/api/commission/sellers/:sellerId/summary` | JWT | Seller summary |
| GET  | `/api/commission/:id` | JWT | Get single commission |

---

## 5. Frontend Integration Guide

### Seller commission view

`GET /api/commission/sellers/:sellerId/summary`

```jsonc
{
  "data": {
    "totalOrders": 47,
    "grossRevenue": 2350000,
    "platformCommission": 235000,
    "netRevenue": 2115000,
    "pendingPayout": 450000,
    "paidOut": 1665000
  }
}
```

Show this in the seller dashboard earnings section.

### Enabler commission view

Enabler commission data is accessed via the commission frontend guide endpoints using the enabler's userId as `sellerId`. See `COMMISSION_SERVICE_FRONTEND_GUIDE.md`.

```jsonc
{
  "data": {
    "totalAttributedOrders": 23,
    "totalGMV": 1150000,
    "totalEarned": 46000,
    "pendingPayout": 12000,
    "paidOut": 34000
  }
}
```


---

## System Maintenance Routes

The commission service does not currently expose outbox maintenance routes (no `maintenance.routes.ts` file in `services/commission-service/`). If added in future, the standard pattern applies: mount at `/api/commission/system/maintenance` behind `requireRoleOrService(['admin','system'])` and `x-service-key`.
