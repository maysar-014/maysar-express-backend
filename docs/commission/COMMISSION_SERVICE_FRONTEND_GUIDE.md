# Commission Service — Frontend Integration Guide

> Audience: Client app engineers (seller dashboard, admin panel, enabler portal)
> Mount path: `/api/commissions`

---

## 1. What the Commission Service Does

Calculates and approves commissions earned by sellers, enablers, and customers on completed orders. Commissions are created automatically when an order is fulfilled — the frontend primarily reads summaries and (for admins) approves pending payouts.

```
Order fulfilled → CommissionCalculated event → commission record PENDING
Admin/ops reviews → PUT /:id/approve → status APPROVED → payout-service triggered
```

---

## 2. Service at a Glance

| Aspect | Detail |
|--------|--------|
| Mount path | `/api/commissions` |
| Auth | `requireAuth` on all routes — JWT required |
| IDs | `com_` prefix (commission), `cpay_` prefix (commission payout) |
| Error envelope | `{ success: false, error: { code, message }, timestamp }` |

---

## 3. Authentication & Roles

All routes require `Authorization: Bearer <token>`. Role enforcement is at the application layer:

| Surface | Who can call it |
|---------|-----------------|
| `POST /calculate` | `system`, `admin`, `ops` (triggered internally on order completion) |
| `PUT /:id/approve` | `admin`, `ops` |
| `GET /sellers/:sellerId` | `seller` (own data only), `admin`, `ops` |
| `GET /sellers/:sellerId/summary` | `seller` (own data only), `admin`, `ops` |
| `GET /:id` | `admin`, `ops`, `seller` (own commissions only) |

---

## 4. Commission Rates (from CommissionCalculationEngine)

Base rates by recipient and commission type:

| Recipient | SALE | REFERRAL | TASK_ASSIGNMENT | TASK_COMPLETION | COLLABORATION_SETUP |
|-----------|------|----------|-----------------|-----------------|---------------------|
| `SELLER` | 8% | 5% | — | — | — |
| `ENABLER` | — | — | 15% | 20% | 10% |
| `CUSTOMER` | — | 3% | — | — | — |
| `COURIER` | — | — | — | — | — |

**Quality bonuses (added on top of base rate):**
- Rating ≥ 4.8 → +5% of base commission
- Rating = 5.0 → additional +5% (total +10%)
- On-time delivery → +5%
- Customer satisfaction ≥ 4.5 → +3%

**Special bonuses:**
- First order → fixed TZS 50 bonus
- Bulk order (> TZS 1,000) → +2% of order amount
- Promotional period → +1% of order amount

---

## 5. Core Domain Objects

```
Commission
  ├── id (com_...)
  ├── orderId
  ├── sellerId
  ├── amount (CommissionAmount — gross)
  ├── rate (CommissionRate — applied rate)
  ├── type: SALE | REFERRAL | BONUS | ADJUSTMENT | TASK_ASSIGNMENT | TASK_COMPLETION | COLLABORATION_SETUP
  ├── status: PENDING → APPROVED → PAID | REJECTED
  ├── createdAt
  ├── paidAt (set when PAID)
  └── payoutId (set when PAID — links to payout-service)
```

### Commission status machine

```
PENDING → APPROVED → PAID
        → REJECTED
```

**Frontend implications:**
- Only `PENDING` commissions can be approved or rejected — disable the approve button for any other status.
- `PAID` means the payout-service has processed the transfer. `payoutId` links to the payout record.
- `REJECTED` is terminal — no further actions.
- `APPROVED` commissions are payable but not yet paid — the payout saga runs asynchronously.

---

## 6. API Reference

### 6.1 Calculate commission (system/admin only)
`POST /api/commissions/calculate` → **201**

This is called internally by the order-service on order completion. Frontend admin tools may call it manually for corrections.

```jsonc
{
  "orderId": "ord_01J...",
  "sellerId": "usr_01J...",
  "orderAmount": 150000,
  "currency": "TZS",
  "commissionType": "SALE",
  "recipientType": "SELLER",
  "qualityMetrics": {
    "rating": 4.9,
    "onTimeDelivery": true,
    "customerSatisfaction": 4.7
  }
}
```

Response:
```jsonc
{
  "success": true,
  "data": {
    "id": "com_01J...",
    "orderId": "ord_01J...",
    "sellerId": "usr_01J...",
    "amount": {
      "value": 13800,
      "currency": "TZS"
    },
    "rate": 0.092,
    "breakdown": {
      "baseAmount": 12000,
      "performanceBonus": 0,
      "qualityBonus": 1800,
      "specialBonus": 0
    },
    "type": "SALE",
    "status": "PENDING",
    "createdAt": "2026-09-06T10:00:00Z"
  }
}
```

### 6.2 Approve a commission
`PUT /api/commissions/:id/approve` → **200**

```jsonc
{
  "approvedBy": "usr_admin_01J...",
  "notes": "Verified order delivery confirmed"
}
```

Response:
```jsonc
{
  "success": true,
  "data": {
    "id": "com_01J...",
    "status": "APPROVED",
    "approvedAt": "2026-09-06T11:00:00Z",
    "approvedBy": "usr_admin_01J..."
  }
}
```

### 6.3 Get commissions for a seller
`GET /api/commissions/sellers/:sellerId?status=PENDING&limit=20&cursor=...` → **200**

> Route ordering note: `/sellers/:sellerId` is registered **before** `/:id` in the router. Always use the full `/sellers/` prefix — never try to access a seller ID via `/:id`.

```jsonc
{
  "success": true,
  "data": [
    {
      "id": "com_01J...",
      "orderId": "ord_01J...",
      "amount": { "value": 13800, "currency": "TZS" },
      "rate": 0.092,
      "type": "SALE",
      "status": "PENDING",
      "createdAt": "2026-09-06T10:00:00Z"
    }
  ],
  "pagination": { "cursor": "...", "hasMore": true }
}
```

Query params: `status` (filter by status), `limit` (default 20), `cursor` (opaque pagination token).

### 6.4 Get commission summary for a seller
`GET /api/commissions/sellers/:sellerId/summary` → **200**

```jsonc
{
  "success": true,
  "data": {
    "sellerId": "usr_01J...",
    "totalEarned": 450000,
    "totalPending": 45000,
    "totalApproved": 135000,
    "totalPaid": 270000,
    "currency": "TZS",
    "periodStart": "2026-09-01T00:00:00Z",
    "periodEnd": "2026-09-30T23:59:59Z"
  }
}
```

### 6.5 Get a single commission
`GET /api/commissions/:id` → **200**

Returns full commission detail including `breakdown`, `payoutId` (if PAID), and `rate`.

---

## 7. Error Codes

| Code | HTTP | Meaning | UI action |
|------|------|---------|-----------|
| `UNAUTHORIZED` | 401 | No/expired JWT | Re-login |
| `FORBIDDEN` | 403 | Accessing another seller's data | Hide/disable |
| `COMMISSION_NOT_FOUND` | 404 | Invalid commission ID | Show "not found" |
| `INVALID_STATUS_TRANSITION` | 422 | Approving a non-PENDING commission | Refresh list, disable button |
| `VALIDATION_ERROR` | 400 | Missing required fields | Highlight fields |
| `INTERNAL_SERVER_ERROR` | 500 | Server failure | Retry with backoff |

---

## 8. UX Patterns

**Seller earnings dashboard:**
1. Load `GET /sellers/:sellerId/summary` for header KPI cards (total earned, pending, paid).
2. Load `GET /sellers/:sellerId?status=PENDING` for the pending tab.
3. Show `breakdown` on commission detail: base amount + quality bonus + special bonus.
4. Use cursor pagination — never page numbers.

**Admin approval queue:**
1. List all `PENDING` commissions across sellers.
2. Show `amount.value`, `rate` (as percentage), `orderId`, `sellerId`, `type`.
3. On approve → `PUT /:id/approve` → optimistically update status → re-fetch summary.
4. After approval, the payout saga runs asynchronously — status moves to `PAID` when the payout-service completes. Poll or use push notifications.

**Commission type display labels:**

| Type | Display label |
|------|---------------|
| `SALE` | Sales commission |
| `REFERRAL` | Referral bonus |
| `TASK_ASSIGNMENT` | Task assignment fee |
| `TASK_COMPLETION` | Task completion bonus |
| `COLLABORATION_SETUP` | Collaboration setup fee |
| `BONUS` | Performance bonus |
| `ADJUSTMENT` | Manual adjustment |

**Integration checklist:**
- [ ] Never show the approve button unless `status === 'PENDING'`
- [ ] Always re-fetch the seller summary after an approval
- [ ] Handle `INVALID_STATUS_TRANSITION` (422) by refreshing the list — another admin may have already approved
- [ ] Show `breakdown` on commission detail so sellers understand how their rate was calculated
- [ ] Link `payoutId` to the payout-service record when `status === 'PAID'`

---

## 9. Route Map

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/commissions/health` | none | Health check |
| POST | `/api/commissions/calculate` | JWT (admin/system) | Calculate commission |
| GET | `/api/commissions/sellers/:sellerId` | JWT | List seller commissions |
| GET | `/api/commissions/sellers/:sellerId/summary` | JWT | Seller summary |
| PUT | `/api/commissions/:id/approve` | JWT (admin/ops) | Approve commission |
| GET | `/api/commissions/:id` | JWT | Get single commission |
