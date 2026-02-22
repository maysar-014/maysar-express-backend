# Seller Dashboard API Documentation

## Overview
The Seller Dashboard API provides comprehensive analytics and insights for sellers, including real-time financial metrics, performance indicators, inventory health, and profitability scoring.

## Base URL
```
/api/v1/analytics
```

---

## Authentication & Authorization

### Required Headers
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

### Authentication Flow
1. Client sends JWT token in Authorization header
2. `authMiddleware` verifies token validity (returns 401 if invalid)
3. `sellerAuthMiddleware` verifies seller role and ownership (returns 403 if unauthorized)
4. Request proceeds to controller

### Error Responses
- **401 Unauthorized**: Missing or invalid JWT token
- **403 Forbidden**: Non-seller role or cross-seller access attempt

---

## Endpoints

### 1. Get Complete Dashboard

**Endpoint:** `GET /sellers/:sellerId/dashboard`

**Description:** Returns complete seller dashboard with all 8 sections and real-time metrics

**Authentication:** Required (JWT + Seller role + Ownership)

**Query Parameters:** None

**Response Status:** 200 OK

**Response Body:**
```json
{
  "moneySnapshot": {
    "todaySales": {
      "amount": 50000,
      "currency": "TZS",
      "orderCount": 5
    },
    "thisMonthRevenue": {
      "amount": 500000,
      "currency": "TZS",
      "growth": 12.5
    },
    "walletBalance": {
      "available": 100000,
      "pending": 50000,
      "currency": "TZS"
    },
    "nextPayoutDate": "2024-01-20T00:00:00Z",
    "netPayout": 450000
  },
  "performanceInsights": {
    "salesTrend": {
      "data": [
        { "date": "2024-01-14", "revenue": 45000 },
        { "date": "2024-01-15", "revenue": 52000 },
        { "date": "2024-01-16", "revenue": 48000 }
      ],
      "trend": "up"
    },
    "repeatCustomers": {
      "rate": 35.2,
      "message": "35 repeat customers this month"
    },
    "bestProduct": {
      "name": "Premium Laptop Stand",
      "unitsSold": 150,
      "revenue": 75000
    }
  },
  "actionCenter": [
    {
      "id": "action-1",
      "type": "RESTOCK",
      "priority": "HIGH",
      "title": "Restock Premium Laptop Stand",
      "description": "Product will run out in 2 days at current velocity",
      "productId": "prod-456"
    },
    {
      "id": "action-2",
      "type": "LOW_CONVERSION",
      "priority": "MEDIUM",
      "title": "Low conversion on USB Cable",
      "description": "Conversion rate dropped 15% this week"
    }
  ],
  "orders": {
    "new": 3,
    "processing": 5,
    "shipped": 8,
    "completed": 120,
    "disputed": 2
  },
  "payoutTransparency": {
    "totalEarned": 500000,
    "commissionDeducted": 50000,
    "netPayout": 450000,
    "nextPayoutDate": "2024-01-20T00:00:00Z",
    "feeBreakdown": [
      {
        "type": "Commission",
        "amount": 50000
      }
    ]
  },
  "inventoryHealth": {
    "inStock": 45,
    "lowStock": 8,
    "outOfStock": 2,
    "alerts": [
      {
        "productName": "USB Cable",
        "daysLeft": 3
      }
    ]
  },
  "reputation": {
    "averageRating": 4.5,
    "recentReviews": [],
    "responseRate": 95,
    "averageDeliveryTime": 24
  },
  "profitabilityScore": {
    "score": 78,
    "status": "Good",
    "breakdown": {
      "salesGrowth": 25,
      "repeatBuyers": 14,
      "responseTime": 12,
      "orderCompletion": 16,
      "inventoryStability": 13
    }
  },
  "lastUpdated": "2024-01-15T10:30:00Z"
}
```

**Cache:** 15 minutes TTL

**Data Sources:**
- Money Snapshot: order_Order, wallet_Wallet, payout_Payout, commission_Commission
- Performance Insights: Analytics_SellerDailySales, Analytics_SellerProductPerformance, order_Order
- Action Center: Analytics_SellerActionItem
- Orders: order_Order (grouped by status)
- Payout Transparency: order_Order, commission_Commission
- Inventory Health: Analytics_SellerInventoryHealth
- Reputation: order_Order (delivery time calculation)
- Profitability Score: CalculateProfitabilityScore (real-time calculation)

---

### 2. Get Money Snapshot

**Endpoint:** `GET /sellers/:sellerId/dashboard/money-snapshot`

**Description:** Lightweight endpoint for real-time balance and today's sales

**Authentication:** Required (JWT + Seller role + Ownership)

**Response Status:** 200 OK

**Response Body:**
```json
{
  "todaySales": {
    "amount": 50000,
    "currency": "TZS",
    "orderCount": 5
  },
  "thisMonthRevenue": {
    "amount": 500000,
    "currency": "TZS",
    "growth": 12.5
  },
  "walletBalance": {
    "available": 100000,
    "pending": 50000,
    "currency": "TZS"
  },
  "nextPayoutDate": "2024-01-20T00:00:00Z",
  "netPayout": 450000
}
```

**Cache:** 5 minutes TTL (real-time balance)

**Data Sources:**
- order_Order (today and month aggregations)
- wallet_Wallet (balance)
- payout_Payout (next payout)
- commission_Commission (deductions)

---

### 3. Get Action Center

**Endpoint:** `GET /sellers/:sellerId/dashboard/action-center`

**Description:** Fetch unresolved action items sorted by priority (HIGH → LOW)

**Authentication:** Required (JWT + Seller role + Ownership)

**Query Parameters:**
- `priority` (optional): Filter by priority (HIGH, MEDIUM, LOW)
- `type` (optional): Filter by type (RESTOCK, LOW_CONVERSION, PENDING_INQUIRY, TRENDING_PRODUCT)

**Response Status:** 200 OK

**Response Body:**
```json
[
  {
    "id": "action-1",
    "sellerId": "seller-123",
    "type": "RESTOCK",
    "priority": "HIGH",
    "title": "Restock Premium Laptop Stand",
    "description": "Product will run out in 2 days at current velocity",
    "productId": "prod-456",
    "metadata": {
      "daysUntilStockout": 2,
      "currentStock": 5,
      "dailyVelocity": 2.5
    },
    "isResolved": false,
    "createdAt": "2024-01-15T08:00:00Z"
  }
]
```

**Cache:** 15 minutes TTL

**Data Source:** Analytics_SellerActionItem (isResolved = false)

**Action Types:**
- **RESTOCK**: Product stock running low
- **LOW_CONVERSION**: Product conversion rate below threshold
- **PENDING_INQUIRY**: Customer questions awaiting response
- **TRENDING_PRODUCT**: High-demand product opportunity

---

### 4. Get Sales Trend

**Endpoint:** `GET /sellers/:sellerId/dashboard/sales-trend`

**Description:** 7-day sales data for chart visualization with trend direction

**Authentication:** Required (JWT + Seller role + Ownership)

**Response Status:** 200 OK

**Response Body:**
```json
{
  "data": [
    {
      "date": "2024-01-09",
      "revenue": 45000,
      "orderCount": 4
    },
    {
      "date": "2024-01-10",
      "revenue": 52000,
      "orderCount": 5
    },
    {
      "date": "2024-01-11",
      "revenue": 48000,
      "orderCount": 4
    },
    {
      "date": "2024-01-12",
      "revenue": 61000,
      "orderCount": 6
    },
    {
      "date": "2024-01-13",
      "revenue": 55000,
      "orderCount": 5
    },
    {
      "date": "2024-01-14",
      "revenue": 58000,
      "orderCount": 5
    },
    {
      "date": "2024-01-15",
      "revenue": 62000,
      "orderCount": 6
    }
  ],
  "trend": "up"
}
```

**Cache:** 15 minutes TTL

**Data Source:** Analytics_SellerDailySales (last 7 days)

**Trend Calculation:**
- Compares last 3 days average vs previous 4 days average
- "up": Last 3 days > Previous 4 days × 1.1
- "down": Last 3 days < Previous 4 days × 0.9
- "flat": Between up and down thresholds

---

### 5. Get Profitability Score

**Endpoint:** `GET /sellers/:sellerId/dashboard/profitability-score`

**Description:** Business health score (0-100) with component breakdown

**Authentication:** Required (JWT + Seller role + Ownership)

**Response Status:** 200 OK

**Response Body:**
```json
{
  "score": 78,
  "breakdown": {
    "salesGrowth": 25,
    "repeatBuyers": 14,
    "responseTime": 12,
    "orderCompletion": 16,
    "inventoryStability": 13
  }
}
```

**Cache:** Not cached (real-time calculation)

**Data Sources:**
- order_Order (sales growth, completion rate)
- support_Ticket (response time)
- Analytics_SellerInventoryHealth (inventory stability)

**Score Components:**
1. **Sales Growth (30 pts)**: Month-over-month revenue comparison
   - Formula: min(30, max(0, growth × 150))
   
2. **Repeat Buyers (20 pts)**: Monthly repeat buyer rate
   - Formula: (repeatBuyers / totalBuyers) × 20
   
3. **Response Time (15 pts)**: Support ticket resolution time
   - < 1 hour: 15 pts
   - < 24 hours: 10 pts
   - ≥ 24 hours: 5 pts
   
4. **Order Completion (20 pts)**: Delivered/total orders ratio
   - Formula: (deliveredOrders / totalOrders) × 20
   
5. **Inventory Stability (15 pts)**: In-stock/total products ratio
   - Formula: (inStockProducts / totalProducts) × 15

**Status Mapping:**
- ≥ 80: "Excellent"
- ≥ 60: "Good"
- ≥ 40: "Fair"
- < 40: "Needs Improvement"

---

### 6. Resolve Action Item

**Endpoint:** `PATCH /action-items/:actionId/resolve`

**Description:** Mark an action item as resolved

**Authentication:** Required (JWT)

**Request Body:** None

**Response Status:** 200 OK

**Response Body:**
```json
{
  "success": true
}
```

**Data Source:** Analytics_SellerActionItem (update isResolved = true)

---

## Data Models

### SellerDashboardDTO
```typescript
interface SellerDashboardDTO {
  moneySnapshot: {
    todaySales: { amount: number; currency: string; orderCount: number };
    thisMonthRevenue: { amount: number; currency: string; growth: number };
    walletBalance: { available: number; pending: number; currency: string };
    nextPayoutDate: string | null;
    netPayout: number;
  };
  performanceInsights: {
    salesTrend: { data: Array<{ date: string; revenue: number }>; trend: 'up' | 'down' | 'flat' };
    repeatCustomers: { rate: number; message: string };
    bestProduct: { name: string; unitsSold: number; revenue: number };
  };
  actionCenter: Array<{
    id: string;
    type: string;
    priority: 'HIGH' | 'MEDIUM' | 'LOW';
    title: string;
    description: string;
    productId?: string;
  }>;
  orders: {
    new: number;
    processing: number;
    shipped: number;
    completed: number;
    disputed: number;
  };
  payoutTransparency: {
    totalEarned: number;
    commissionDeducted: number;
    netPayout: number;
    nextPayoutDate: string | null;
    feeBreakdown: Array<{ type: string; amount: number }>;
  };
  inventoryHealth: {
    inStock: number;
    lowStock: number;
    outOfStock: number;
    alerts: Array<{ productName: string; daysLeft: number }>;
  };
  reputation: {
    averageRating: number;
    recentReviews: Array<{ rating: number; comment: string; date: string }>;
    responseRate: number;
    averageDeliveryTime: number;
  };
  profitabilityScore: {
    score: number;
    status: string;
    breakdown: {
      salesGrowth: number;
      repeatBuyers: number;
      responseTime: number;
      orderCompletion: number;
      inventoryStability: number;
    };
  };
  lastUpdated: Date;
}
```

---

## Caching Strategy

| Section | TTL | Invalidation Trigger |
|---------|-----|---------------------|
| Money Snapshot | 5 min | Order delivery, Payout processing |
| Dashboard (other 7) | 15 min | Order delivery, Inventory update, Action item resolution |
| Sales Trend | 15 min | Daily sales update |
| Action Center | 15 min | Action item creation/resolution |
| Profitability Score | None | Real-time calculation |

---

## Background Jobs

### Metrics Calculation Job
- **Frequency:** Every 15 minutes
- **Scope:** All active sellers
- **Operations:**
  - CalculateRepeatCustomers
  - IdentifyBestPerformingProduct
  - GenerateSalesTrend
  - CalculateInventoryHealth
  - CalculateProfitabilityScore
- **Output:** Updates Analytics_SellerMetrics and related tables

### Action Center Generation Job
- **Frequency:** Every 30 minutes
- **Scope:** All active sellers
- **Operations:**
  - Identify restock needs
  - Identify low conversion products
  - Identify pending inquiries
  - Identify trending products
- **Output:** Creates/updates Analytics_SellerActionItem
- **Side Effect:** Triggers HIGH priority notifications

---

## Error Handling

### HTTP Status Codes
| Code | Scenario |
|------|----------|
| 200 | Successful request |
| 400 | Invalid request parameters |
| 401 | Missing or invalid JWT token |
| 403 | Non-seller role or cross-seller access |
| 404 | Resource not found |
| 500 | Server error |

### Error Response Format
```json
{
  "error": "Failed to fetch dashboard"
}
```

---

## Rate Limiting
- No explicit rate limiting (implement at API gateway if needed)
- Caching reduces database load

---

## Pagination
- Not applicable (all endpoints return complete data)

---

## Sorting & Filtering
- Action Center: Sorted by priority (HIGH → LOW), then by createdAt (DESC)
- Sales Trend: Sorted by date (ASC)
- Orders: Grouped by status

---

## Examples

### Example 1: Get Dashboard for Seller
```bash
curl -X GET http://localhost:3000/api/v1/analytics/sellers/seller-123/dashboard \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json"
```

### Example 2: Get Money Snapshot
```bash
curl -X GET http://localhost:3000/api/v1/analytics/sellers/seller-123/dashboard/money-snapshot \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json"
```

### Example 3: Get Action Center with Filter
```bash
curl -X GET "http://localhost:3000/api/v1/analytics/sellers/seller-123/dashboard/action-center?priority=HIGH" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json"
```

### Example 4: Resolve Action Item
```bash
curl -X PATCH http://localhost:3000/api/v1/analytics/action-items/action-1/resolve \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json"
```

---

## Related Documentation
- [Analytics Module Complete](./ANALYTICS_MODULE_COMPLETE.md) - Full feature overview
- [Architecture & Data Modeling](./ARCHITECTURE_AND_DATA_MODELING.md) - System design
- [Verification Implementation Phase 1](./VERIFICATION_IMPLEMENTATION.md) - Schema updates
- [Verification Implementation Phase 2](./VERIFICATION_PHASE2_IMPLEMENTATION.md) - Auth & scheduling
