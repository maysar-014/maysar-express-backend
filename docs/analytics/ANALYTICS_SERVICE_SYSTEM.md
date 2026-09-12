# Maysar Analytics Service — Implementation Reference (As-Built)

> **Status:** Live and verified — business metrics, GMV reporting, cohort analysis, seller profitability, platform KPIs.
> **Last updated:** September 2026
> **Scope:** `services/analytics-service`

---

## 1. Guiding Principles

| Principle | Where it lives |
|---|---|
| **Analytics are read-only aggregations** | Analytics service never writes to other services' tables; it reads from events and its own materialized views |
| **GMV is the primary business metric** | Gross Merchandise Value tracked per seller, per category, per time period |
| **Cohort analysis tracks buyer retention** | Weekly/monthly cohorts with retention curves |
| **Seller profitability is multi-dimensional** | Revenue, commission, returns, cancellations, net margin |
| **Platform KPIs are pre-computed** | Materialized views refreshed on schedule to keep dashboard queries fast |

---

## 2. Domain Model

### Metrics tracked

| Metric | Granularity | Description |
|---|---|---|
| GMV | Daily/weekly/monthly | Total order value processed |
| Order count | Daily | Number of orders placed |
| Conversion rate | Weekly | Cart → order conversion |
| Average order value | Weekly | GMV / order count |
| Seller net revenue | Monthly | GMV − commission − returns |
| Buyer retention | Monthly cohort | % buyers who reorder |
| COD acceptance rate | Weekly | COD orders / total orders |
| Delivery success rate | Weekly | Delivered / shipped |
| Enabler attribution rate | Weekly | Orders via referral links |

---

## 3. Application Layer

| Use case | What it does |
|---|---|
| `GetPlatformKPIsUseCase` | Platform-wide GMV, orders, conversion, AOV |
| `GetSellerDashboardUseCase` | Seller-specific revenue, orders, top products |
| `GetSellerProfitabilityUseCase` | Net margin after commission and returns |
| `GetCohortAnalysisUseCase` | Buyer retention cohort curves |
| `GetGMVReportUseCase` | GMV breakdown by period, category, region |
| `GetEnablerPerformanceUseCase` | Enabler GMV attribution and conversion |

---

## 4. HTTP Surface

Mounted at `/api/analytics` (module name `analytics-service` → strip `-service` → `/api/analytics`).

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/analytics/sellers/:sellerId/dashboard` | JWT (seller/admin) | Seller dashboard |
| GET | `/api/analytics/sellers/:sellerId/dashboard/money-snapshot` | JWT (seller/admin) | Revenue snapshot |
| GET | `/api/analytics/sellers/:sellerId/dashboard/action-center` | JWT (seller/admin) | Action items |
| GET | `/api/analytics/sellers/:sellerId/dashboard/sales-trend` | JWT (seller/admin) | Sales trend |
| GET | `/api/analytics/sellers/:sellerId/dashboard/profitability-score` | JWT (seller/admin) | Profitability score |
| PATCH | `/api/analytics/action-items/:actionId/resolve` | JWT | Resolve action item |
| GET | `/api/analytics/sellers/:sellerId/sla` | JWT (seller/admin) | Seller SLA metrics |
| GET | `/api/analytics/sellers/:sellerId/sla/breaches` | JWT (seller/admin) | SLA breaches only |
| GET | `/api/analytics/sellers/:sellerId/sla/readiness` | JWT (seller/admin) | SLA readiness gates |
| POST | `/api/analytics/sellers/:sellerId/sla/evaluate` | JWT (seller/admin) | Trigger SLA recalculation |
| GET | `/api/analytics/seller-profitability/dashboard` | JWT | Profitability dashboard |
| GET | `/api/analytics/seller-profitability/dashboard/:sellerId` | JWT (admin) | Per-seller profitability |
| GET | `/api/analytics/seller-profitability/revenue-health` | JWT | Revenue health section |
| GET | `/api/analytics/seller-profitability/growth-indicators` | JWT | Growth indicators section |
| GET | `/api/analytics/seller-profitability/retention` | JWT | Retention section |
| GET | `/api/analytics/seller-profitability/financial` | JWT | Financial section |
| GET | `/api/analytics/seller-profitability/happiness` | JWT | Happiness signals section |
| GET | `/api/analytics/admin/dashboard/red-flags` | JWT (admin) | Red flags |
| GET | `/api/analytics/admin/dashboard/founder-operating-system` | JWT (admin) | Founder OS view |
| GET | `/api/analytics/analytics/dashboard/:sellerId` | JWT | Legacy dashboard (deprecated) |
| GET | `/api/analytics/health` | none | Health check |

---

## 5. Frontend Integration Guide

### Seller dashboard

`GET /api/analytics/seller/dashboard?period=LAST_30_DAYS`

```jsonc
{
  "data": {
    "period": "2026-08-01 to 2026-08-31",
    "gmv": 2350000,
    "orderCount": 47,
    "averageOrderValue": 50000,
    "returnRate": 0.02,
    "cancellationRate": 0.04,
    "topProducts": [
      { "productId": "prd_01...", "title": "Office Chair", "revenue": 850000, "units": 10 }
    ],
    "revenueByDay": [
      { "date": "2026-08-01", "revenue": 75000 },
      ...
    ]
  }
}
```

### Seller profitability

`GET /api/analytics/seller/profitability?period=LAST_30_DAYS`

```jsonc
{
  "data": {
    "grossRevenue": 2350000,
    "platformCommission": 235000,
    "returnCosts": 47000,
    "netRevenue": 2068000,
    "netMarginPercent": 88.0
  }
}
```

### Platform KPIs (admin)

`GET /api/analytics/platform/kpis`

```jsonc
{
  "data": {
    "totalGMV": 125000000,
    "activeUsers": 8420,
    "activeSellers": 312,
    "orderCount": 2847,
    "conversionRate": 0.034,
    "averageOrderValue": 43900,
    "codAcceptanceRate": 0.41,
    "deliverySuccessRate": 0.94
  }
}
```

### Integration checklist

- [ ] Show GMV trend chart (line chart, daily granularity)
- [ ] Show revenue breakdown (gross vs. net) as stacked bar
- [ ] Display top products table with revenue and units sold
- [ ] Show return rate and cancellation rate as warning indicators when above threshold
- [ ] Admin dashboard: show platform KPIs with period comparison (vs. previous period)
- [ ] Enabler dashboard: show attributed GMV and conversion funnel
