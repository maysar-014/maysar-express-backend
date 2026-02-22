# Seller Profitability Analytics API Reference

## Base URL
```
/analytics/seller-profitability
```

## Endpoints

### 1. Get Full Dashboard

**Endpoint:** `GET /dashboard`

**Description:** Returns complete seller profitability dashboard with all metrics

**Query Parameters:**
- `timeWindow` (optional): 'weekly' | 'monthly' | 'quarterly' (default: 'monthly')
- `startDate` (optional): ISO date string
- `endDate` (optional): ISO date string
- `includeInactive` (optional): boolean (default: false)

**Response:**
```json
{
  "topRow": {
    "gmv": 1500000,
    "activeSellers": 250,
    "arps": 6000,
    "repeatBuyerRate": 35.2
  },
  "secondRow": {
    "sellerRetentionPercent": 72.5,
    "churnPercent": 4.2,
    "medianRevenue": 3500,
    "payoutTimeHours": 18.5
  },
  "thirdRow": {
    "revenueDistribution": {
      "top20Percent": 55.3,
      "restPercent": 44.7
    },
    "growthPerSeller": [
      {
        "sellerId": "seller-123",
        "growthPercentage": 12.5,
        "currentMonthRevenue": 50000,
        "previousMonthRevenue": 44444
      }
    ],
    "timeToFirstSale": 18,
    "productVelocityHeatmap": [
      {
        "productId": "prod-456",
        "velocity": 2.5,
        "quantitySold": 150,
        "daysSinceLaunch": 60
      }
    ]
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

**Status Codes:**
- `200 OK` - Dashboard retrieved successfully
- `400 Bad Request` - Invalid parameters
- `500 Internal Server Error` - Server error

---

### 2. Get Individual Seller Dashboard

**Endpoint:** `GET /dashboard/:sellerId`

**Description:** Returns dashboard metrics for a specific seller

**Path Parameters:**
- `sellerId` (required): UUID of the seller

**Response:** Same structure as full dashboard with sellerId included

---

### 3. Get Revenue Health Metrics

**Endpoint:** `GET /revenue-health`

**Description:** Returns ARPS, median revenue, and distribution metrics

**Query Parameters:**
- `timeWindow` (optional): 'weekly' | 'monthly' (default: 'monthly')

**Response:**
```json
{
  "arpsWeekly": 5800,
  "arpsMonthly": 6000,
  "medianRevenue": 3500,
  "revenueDistributionTop20": 55.3
}
```

---

### 4. Get Growth Indicators

**Endpoint:** `GET /growth-indicators`

**Description:** Returns MoM growth, product velocity, and repeat buyer rate

**Response:**
```json
{
  "revenueGrowthMoM": 62.5,
  "productVelocityAvg": 2.3,
  "repeatBuyerRate": 35.2
}
```

**Interpretation:**
- `revenueGrowthMoM`: 62.5% of sellers have positive MoM growth
- `productVelocityAvg`: Average 2.3 units sold per product per day
- `repeatBuyerRate`: 35.2% of buyers make repeat purchases

---

### 5. Get Retention Metrics

**Endpoint:** `GET /retention`

**Description:** Returns seller retention, churn, and time to first sale

**Response:**
```json
{
  "retentionRate90Days": 72.5,
  "churnRateMonthly": 4.2,
  "avgTimeToFirstSaleDays": 18
}
```

**Interpretation:**
- `retentionRate90Days`: 72.5% of sellers created 90+ days ago are still active
- `churnRateMonthly`: 4.2% of sellers churned this month
- `avgTimeToFirstSaleDays`: Average 18 days for seller to make first sale

---

### 6. Get Financial Metrics

**Endpoint:** `GET /financial`

**Description:** Returns payout time, withdrawal time, and dispute rate

**Response:**
```json
{
  "avgPayoutTimeHours": 18.5,
  "avgWithdrawalTimeHours": 20.2,
  "disputesPer100Orders": 1.2
}
```

**Interpretation:**
- `avgPayoutTimeHours`: Average 18.5 hours from order completion to payout
- `avgWithdrawalTimeHours`: Average 20.2 hours for withdrawal processing
- `disputesPer100Orders`: 1.2 commission disputes per 100 orders

---

### 7. Get Happiness Signals

**Endpoint:** `GET /happiness`

**Description:** Returns product expansion rate and referral metrics

**Response:**
```json
{
  "productExpansionRate": 42.3,
  "referralCount": 156
}
```

**Interpretation:**
- `productExpansionRate`: 42.3% of sellers added products 30+ days after creation
- `referralCount`: 156 completed seller referrals

---

### 8. Get Red Flags (Admin)

**Endpoint:** `GET /admin/dashboard/red-flags`

**Description:** Returns detected red flags and alerts

**Response:**
```json
{
  "flags": [
    {
      "type": "high_churn",
      "severity": "high",
      "message": "Monthly churn rate 7.5% exceeds threshold",
      "metric": "Churn Rate",
      "currentValue": 7.5,
      "threshold": 7.0
    },
    {
      "type": "revenue_concentration",
      "severity": "medium",
      "message": "Median revenue is 45% of ARPS - high concentration risk",
      "metric": "Revenue Distribution",
      "currentValue": 0.45,
      "threshold": 0.5
    }
  ],
  "timestamp": "2024-01-15T10:30:00Z"
}
```

**Flag Types:**
- `arps_decline` - ARPS declined >10% WoW
- `high_churn` - Monthly churn >7%
- `revenue_concentration` - Median <50% of ARPS
- `slow_payouts` - Payout time >24 hours
- `high_disputes` - Disputes >2 per 100 orders
- `low_retention` - 90-day retention <60%
- `low_expansion` - Product expansion <30%

---

## Error Responses

### 400 Bad Request
```json
{
  "error": "Invalid timeWindow parameter",
  "details": "timeWindow must be 'weekly' or 'monthly'"
}
```

### 404 Not Found
```json
{
  "error": "Seller not found",
  "sellerId": "invalid-seller-id"
}
```

### 500 Internal Server Error
```json
{
  "error": "Failed to fetch dashboard",
  "message": "Database connection error"
}
```

---

## Rate Limiting

- **Default:** 100 requests per minute per IP
- **Admin endpoints:** 50 requests per minute per IP
- **Headers:** `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`

---

## Caching

- **Dashboard:** Cached for 1 hour
- **Individual metrics:** Cached for 1 hour
- **Red flags:** Cached for 30 minutes
- **Cache invalidation:** Automatic on order completion, payout processing

---

## Authentication

All endpoints require authentication via JWT token in Authorization header:

```
Authorization: Bearer <jwt_token>
```

Admin endpoints require `admin` role.

---

## Examples

### Get Dashboard for Specific Seller
```bash
curl -X GET "http://localhost:3000/analytics/seller-profitability/dashboard/seller-123" \
  -H "Authorization: Bearer <token>"
```

### Get Revenue Health with Weekly Window
```bash
curl -X GET "http://localhost:3000/analytics/seller-profitability/revenue-health?timeWindow=weekly" \
  -H "Authorization: Bearer <token>"
```

### Get Red Flags
```bash
curl -X GET "http://localhost:3000/analytics/seller-profitability/admin/dashboard/red-flags" \
  -H "Authorization: Bearer <token>"
```

---

## Webhook Events

The system publishes events when metrics are calculated:

```json
{
  "eventType": "MetricsCalculated",
  "data": {
    "timestamp": "2024-01-15T10:30:00Z",
    "metrics": {
      "gmv": 1500000,
      "activeSellers": 250,
      "arps": 6000
    }
  }
}
```
