# Analytics Service — Frontend Integration Guide

> Mount path: `/api/analytics`
> Audience: Seller portal, admin panel

---

## Seller Dashboard

### Get Seller Dashboard
`GET /api/analytics/sellers/:sellerId/dashboard` — requires auth (seller or admin)

Sellers can only access their own `sellerId`. Admins can access any.

```jsonc
// Response 200
{
  "success": true,
  "data": {
    "sellerId": "usr_01J...",
    "period": { "from": "2024-08-01", "to": "2024-08-31" },
    "gmv": 4250000,
    "currency": "TZS",
    "orderCount": 87,
    "averageOrderValue": 48850,
    "conversionRate": 0.034
  }
}
```

### Money Snapshot
`GET /api/analytics/sellers/:sellerId/dashboard/money-snapshot`

```jsonc
// Response 200
{
  "success": true,
  "data": {
    "revenue": 4250000,
    "costs": 2100000,
    "grossProfit": 2150000,
    "platformFees": 85000,
    "netProfit": 2065000,
    "currency": "TZS"
  }
}
```

### Action Center
`GET /api/analytics/sellers/:sellerId/dashboard/action-center`

Returns a list of action items requiring seller attention (low stock, pending reviews, SLA breaches).

```jsonc
// Response 200
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "act_01J...",
        "type": "LOW_STOCK",
        "severity": "high",
        "message": "Product SKU-123 has 2 units remaining",
        "productId": "prd_01J...",
        "createdAt": "2024-09-01T08:00:00.000Z"
      }
    ],
    "totalCount": 3
  }
}
```

### Resolve an Action Item
`PATCH /api/analytics/action-items/:actionId/resolve` — requires auth

```jsonc
// Response 200
{ "success": true, "data": { "id": "act_01J...", "resolved": true } }
```

### Sales Trend
`GET /api/analytics/sellers/:sellerId/dashboard/sales-trend?period=30d`

### Profitability Score
`GET /api/analytics/sellers/:sellerId/dashboard/profitability-score`

---

## Seller SLA

### Get Seller SLA
`GET /api/analytics/sellers/:sellerId/sla` — requires auth (seller sees own, admin sees any)

```jsonc
// Response 200
{
  "success": true,
  "data": {
    "sellerId": "usr_01J...",
    "overallScore": 91.4,
    "status": "at_risk",
    "metrics": {
      "orderFulfillmentRate":    { "score": 98.2, "weight": 0.20, "status": "compliant" },
      "onTimeDeliveryRate":      { "score": 84.1, "weight": 0.20, "status": "breached" },
      "cancellationRate":        { "score": 95.0, "weight": 0.10, "status": "compliant" },
      "returnRate":              { "score": 92.0, "weight": 0.08, "status": "compliant" },
      "customerSatisfactionScore":{ "score": 88.5, "weight": 0.15, "status": "at_risk" },
      "responseTime":            { "score": 90.0, "weight": 0.08, "status": "compliant" },
      "disputeRate":             { "score": 97.0, "weight": 0.07, "status": "compliant" },
      "inventoryAccuracy":       { "score": 99.0, "weight": 0.05, "status": "compliant" },
      "packagingQualityScore":   { "score": 94.0, "weight": 0.04, "status": "compliant" },
      "communicationScore":      { "score": 91.0, "weight": 0.02, "status": "compliant" },
      "platformPolicyCompliance":{ "score": 100.0,"weight": 0.01, "status": "compliant" }
    },
    "evaluatedAt": "2024-09-01T00:00:00.000Z"
  }
}
```

**SLA status thresholds:**

| Score | Status | UI colour |
|-------|--------|-----------|
| ≥ 100 | `compliant` | green |
| ≥ 85 | `at_risk` | amber |
| < 85 | `breached` | red |

### Get SLA Breaches
`GET /api/analytics/sellers/:sellerId/sla/breaches`

Returns only the metrics with `status: "breached"`.

### Get SLA Readiness
`GET /api/analytics/sellers/:sellerId/sla/readiness`

Returns the 7 readiness gates as a checklist. All must pass for the seller to be considered fully operational.

```jsonc
// Response 200
{
  "success": true,
  "data": {
    "allPassed": false,
    "gates": [
      { "name": "minimum_order_count", "passed": true },
      { "name": "kyc_verified", "passed": true },
      { "name": "bank_account_linked", "passed": false },
      // ... 4 more gates
    ]
  }
}
```

### Evaluate SLA (trigger recalculation)
`POST /api/analytics/sellers/:sellerId/sla/evaluate` — requires auth

```jsonc
// Request body: empty {}
// Response 200
{
  "success": true,
  "data": { "sellerId": "usr_01J...", "overallScore": 91.4, "status": "at_risk" }
}
```

---

## Seller Profitability

### Get Profitability Dashboard
`GET /api/analytics/seller-profitability/dashboard`
`GET /api/analytics/seller-profitability/dashboard/:sellerId`

### Section Endpoints

```
GET /api/analytics/seller-profitability/revenue-health
GET /api/analytics/seller-profitability/growth-indicators
GET /api/analytics/seller-profitability/retention
GET /api/analytics/seller-profitability/financial
GET /api/analytics/seller-profitability/happiness
```

Each returns the relevant section of the profitability report. Use these for lazy-loading dashboard sections.

---

## Admin Dashboard

### Red Flags
`GET /api/analytics/admin/dashboard/red-flags` — requires role `admin`

```jsonc
// Response 200
{
  "success": true,
  "data": {
    "flags": [
      {
        "type": "CHURN_RATE",
        "severity": "high",
        "value": 0.082,
        "threshold": 0.07,
        "affectedSellerId": "usr_01J...",
        "detectedAt": "2024-09-01T00:00:00.000Z"
      }
    ],
    "summary": { "critical": 1, "high": 3, "medium": 5 }
  }
}
```

**Red flag thresholds:**

| Flag | Threshold | Severity |
|------|-----------|----------|
| `ARPS_DECLINE` | > 10% decline | high |
| `CHURN_RATE` | > 7% | high |
| `RETENTION_RATE` | < 60% | critical |
| `DISPUTE_RATE` | > 2 per 100 orders | medium |
| `PAYOUT_DELAY` | > 24 hours | medium |

**Report status logic:**

| Condition | Report Status |
|-----------|---------------|
| `dataCoverage` < 40% | `manual` |
| any metric `breached` | `critical` |
| any metric `at_risk` | `watch` |
| all metrics score ≥ 90 | `healthy` |

### Founder Operating System
`GET /api/analytics/admin/dashboard/founder-operating-system` — requires role `admin`

Platform-wide health summary for executive view.

---

## Error Codes

| Code | HTTP | Meaning |
|------|------|---------|
| `UNAUTHORIZED` | 401 | No/expired JWT |
| `FORBIDDEN` | 403 | Seller accessing another seller's data, or non-admin accessing admin routes |
| `NOT_FOUND` | 404 | Seller not found |
| `VALIDATION_ERROR` | 422 | Invalid date range or filter params |

---

## Display Notes

- All monetary values are in TZS unless the response includes a `currency` field.
- SLA scores are floats — render to one decimal place.
- `critical` red flags should block the seller from listing new products until resolved.
- `high` red flags: show a warning banner.
- `medium` red flags: show as informational notices.
- Sellers can only access their own data — the server enforces this with a 403 if `userId !== sellerId` and the user is not an admin.
