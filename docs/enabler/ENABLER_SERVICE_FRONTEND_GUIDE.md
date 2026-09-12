# Enabler Service — Frontend Integration Guide

> Audience: Client app engineers (enabler portal, admin panel, buyer app hub)
> Mount path: `/api/enabler` → enabler routes at `/api/enabler/enablers`, hub at `/api/enabler/hub`

---

## 1. What the Enabler Service Does

Manages third-party sales facilitators (enablers) who list products, facilitate orders on behalf of buyers, earn commissions, and run promotion campaigns. The service has two surfaces:
- **Enabler management** (`/enablers`) — registration, approval, listings, orders, earnings, referrals
- **Hub** (`/hub`) — buyer-facing product discovery across all enabler listings

```
Register → Approve → Activate → List products → Facilitate orders → Earn commissions
                              → Accept promotion jobs → Track referrals
```

**Important:** `APPROVED` and `ACTIVE` are two different statuses. An enabler must be `APPROVED` to list products, but must be `ACTIVE` to facilitate orders. The `activate()` transition happens after `approve()`.

---

## 2. Service at a Glance

| Aspect | Detail |
|--------|--------|
| Mount path | `/api/enabler` |
| Enabler routes | `/api/enabler/enablers` |
| Hub routes | `/api/enabler/hub` |
| Auth | `requireAuth` on all routes |
| KYC gate | Level 1 required for listing products; listing capacity enforced |
| IDs | System ULID format: `enb_01J...` |
| Error envelope | `{ success: false, error: { code, message }, timestamp }` |

---

## 3. Authentication & Roles

| Surface | Auth | Notes |
|---------|------|-------|
| `POST /enablers/register` | JWT | Any authenticated user |
| `POST /enablers/:id/approve` | JWT (admin) | Admin only |
| `GET /enablers/:id` | JWT | Public profile |
| `POST /enablers/:enablerId/listings` | JWT + KYC L1 + capacity check | Must be the enabler (`authorizeEnabler`) |
| `GET /enablers/:enablerId/*` | JWT + `authorizeEnabler` | Must be the enabler or admin |
| `GET /hub/products` | JWT | Any authenticated user |

`authorizeEnabler` middleware verifies `req.user.userId === enablerId` (or user is admin). Returns 403 if not.

---

## 4. Core Domain Objects

```
Enabler (enb_...)
  ├── status: PENDING → APPROVED → ACTIVE → SUSPENDED | REJECTED
  ├── tier: BRONZE | SILVER | GOLD | PLATINUM
  ├── commissionRate (decimal, e.g. 0.15 = 15%)
  ├── enablerCode + enablerCodeShort (assigned on approval)
  ├── performanceMetrics { totalSales, totalOrders, conversionRate, customerRating }
  ├── ProductListing (lst_...)
  ├── EnablerOrder (eord_...)
  ├── EnablerCommission (ecom_...)
  ├── PromotionJobAssignment
  └── ReferralLink
```

### Enabler status machine

```
PENDING → APPROVED → ACTIVE → SUSPENDED
        → REJECTED
```

**Frontend implications:**
- `canListProducts()` = `status === APPROVED || status === ACTIVE` (not SUSPENDED)
- `canFacilitateOrders()` = `status === ACTIVE` only
- Show different CTAs based on status: PENDING = "Under review", APPROVED = "Activate account", ACTIVE = full dashboard, SUSPENDED = "Contact support"

---

## 5. Tier System (from TierCalculationAlgorithm + EnablerEntity)

Tiers are calculated automatically from performance metrics. Tier affects commission rate.

| Tier | Commission rate | Min total sales (TZS) | Min rating | Min days active | Tier adjustment |
|------|----------------|----------------------|------------|-----------------|-----------------|
| BRONZE | 15% | — | — | — | 1.0× |
| SILVER | 17% | 10,000 | 4.0 | 30 | 1.1× |
| GOLD | 19% | 50,000 | 4.5 | 90 | 1.2× |
| PLATINUM | 22% | 100,000 | 4.8 | 180 | 1.3× |

**Demotion rule:** If `disputeRate > 10%`, the enabler is demoted to BRONZE regardless of other metrics.

Commission rate is capped at 25% even with performance multipliers.

---

## 6. API Reference

### 6.1 Register as an enabler
`POST /api/enabler/enablers/register` → **201**

```jsonc
{
  "userId": "usr_01J...",
  "businessName": "Karibu Sales Co.",
  "contactEmail": "sales@example.com",
  "contactPhone": "+255712345678",
  "businessDescription": "We facilitate sales in Dar es Salaam",
  "taxId": "123456789",
  "yearsInBusiness": 3,
  "hasBusinessLicense": true,
  "salesExperience": 2.5
}
```

**Validation rules (server-enforced):**
- `hasBusinessLicense` must be `true` — the form checkbox must be checked
- `salesExperience` ≥ 0.5 years
- `contactPhone` must match `+255[67]\d{8}`
- `taxId` must match `\d{9}` (9 digits)

Response includes `status: "PENDING"` and the assigned `id`. No `enablerCode` yet — that is assigned on approval.

### 6.2 Approve an enabler (admin)
`POST /api/enabler/enablers/:id/approve` → **200**

```jsonc
{ "adminId": "usr_admin_01J..." }
```

On approval, the server assigns `enablerCode` and `enablerCodeShort`. The enabler moves to `APPROVED` status. They must then be activated (separate step) to reach `ACTIVE`.

### 6.3 Get enabler profile
`GET /api/enabler/enablers/:id` → **200**

```jsonc
{
  "success": true,
  "data": {
    "id": "enb_01J...",
    "userId": "usr_01J...",
    "businessName": "Karibu Sales Co.",
    "status": "ACTIVE",
    "tier": "SILVER",
    "commissionRate": 0.17,
    "enablerCode": "ENB-2026-001",
    "enablerCodeShort": "KSC01",
    "performanceMetrics": {
      "totalSales": 25000,
      "totalOrders": 48,
      "conversionRate": 0.12,
      "customerRating": 4.3
    },
    "approvedAt": "2026-09-01T10:00:00Z"
  }
}
```

### 6.4 List a product
`POST /api/enabler/enablers/:enablerId/listings` → **201**

Requires KYC level 1 and available listing capacity (capacity is per KYC tier).

```jsonc
{
  "productId": "prd_01J...",
  "customPrice": 45000,
  "priceMarkup": 0.1,
  "minOrderQuantity": 1,
  "deliveryTimeframe": "2-3 business days",
  "returnPolicy": "7-day returns",
  "warrantyPeriod": 12,
  "visibility": true
}
```

`priceMarkup` is 0–0.5 (0% to 50%). Provide either `customPrice` or `priceMarkup`, not both.

### 6.5 Get enabler listings
`GET /api/enabler/enablers/:enablerId/listings` → **200**

### 6.6 Facilitate an order
`POST /api/enabler/enablers/:enablerId/orders` → **201**

Requires `status === ACTIVE`. Returns 422 if enabler is only `APPROVED` (not yet activated).

```jsonc
{
  "listingId": "lst_01J...",
  "buyerId": "usr_01J...",
  "quantity": 2,
  "shippingAddressId": "addr_01J..."
}
```

### 6.7 Get orders
`GET /api/enabler/enablers/:enablerId/orders` → **200**

### 6.8 Get commission breakdown for an order
`GET /api/enabler/enablers/:enablerId/orders/:orderId/commission` → **200**

```jsonc
{
  "success": true,
  "data": {
    "orderId": "ord_01J...",
    "enablerId": "enb_01J...",
    "grossCommission": 4500,
    "platformFee": 900,
    "netCommission": 3600,
    "currency": "TZS",
    "tier": "SILVER",
    "rate": 0.17,
    "tierAdjustment": 1.1
  }
}
```

### 6.9 Earnings

| Endpoint | Description |
|----------|-------------|
| `GET /enablers/:enablerId/earnings/summary` | Total earned, pending, paid — load first for KPI cards |
| `GET /enablers/:enablerId/earnings?limit=20&cursor=...` | Paginated earnings ledger |

### 6.10 Promotion jobs

| Endpoint | Description |
|----------|-------------|
| `GET /enablers/:enablerId/promotion-jobs` | List available/accepted jobs |
| `POST /enablers/:enablerId/promotion-jobs/:jobId/accept` | Accept a promotion job |

### 6.11 Referral links

| Endpoint | Body | Description |
|----------|------|-------------|
| `GET /enablers/:enablerId/referral-link` | — | Get existing referral link |
| `POST /enablers/:enablerId/referral-link` | `{ "campaign": "...", "channel": "whatsapp" }` | Generate new referral link |
| `POST /enablers/:enablerId/referral-link/events` | `{ "eventType": "CLICK", "referralCode": "..." }` | Track referral event |

### 6.12 Hub (buyer-facing)
`GET /api/enabler/hub/products?category=...&limit=20&cursor=...` → **200**

Returns products listed by all `ACTIVE` enablers. No enabler-specific auth required beyond JWT.

---

## 7. Error Codes

| Code | HTTP | Meaning | UI action |
|------|------|---------|-----------|
| `UNAUTHORIZED` | 401 | No/expired JWT | Re-login |
| `FORBIDDEN` | 403 | Not the enabler or admin (`authorizeEnabler` failed) | Hide action |
| `KYC_LEVEL_REQUIRED` | 403 | KYC level 1 not completed | Redirect to KYC |
| `LISTING_CAPACITY_EXCEEDED` | 422 | Max listings reached for KYC tier | Show upgrade prompt |
| `ENABLER_NOT_FOUND` | 404 | Invalid enabler ID | Show "not found" |
| `ENABLER_NOT_APPROVED` | 422 | Enabler not yet approved | Show pending status |
| `ENABLER_NOT_ACTIVE` | 422 | Approved but not activated — cannot facilitate orders | Show "activate account" CTA |
| `ENABLER_SUSPENDED` | 422 | Account suspended | Show "contact support" |
| `PRODUCT_NOT_FOUND` | 404 | Invalid product ID | Show "not found" |
| `VALIDATION_ERROR` | 400 | Missing/invalid fields | Highlight fields |
| `INTERNAL_SERVER_ERROR` | 500 | Server failure | Retry with backoff |

---

## 8. UX Patterns

**Enabler onboarding flow:**
1. `POST /enablers/register` → show "Application submitted, pending review".
2. Poll `GET /enablers/:id` or listen for push notification for status change.
3. On `APPROVED` → show "Activate your account" CTA (activation step).
4. On `ACTIVE` → unlock full dashboard: listings, orders, earnings, promotion jobs.

**Status-based dashboard gating:**

| Status | What to show |
|--------|-------------|
| `PENDING` | "Under review" banner, no features |
| `APPROVED` | "Activate account" CTA, can list products |
| `ACTIVE` | Full dashboard |
| `SUSPENDED` | "Account suspended — contact support" |
| `REJECTED` | Rejection reason + "Appeal" CTA |

**Tier badge display:**
- Show tier badge (BRONZE/SILVER/GOLD/PLATINUM) prominently on profile.
- Show current `commissionRate` as a percentage.
- Show progress toward next tier: `totalSales` vs threshold, `customerRating` vs requirement.

**Product listing flow:**
1. Check KYC level before showing "Add Listing" button.
2. `POST /enablers/:enablerId/listings` → on `LISTING_CAPACITY_EXCEEDED`, show "Upgrade KYC to list more products".
3. After listing, show in `GET /enablers/:enablerId/listings`.

**Earnings dashboard:**
1. Load summary via `GET /earnings/summary` for header KPI cards.
2. Load ledger via `GET /earnings?limit=20` for transaction history.
3. Use cursor pagination.

**Integration checklist:**
- [ ] Gate listing creation behind KYC level 1 check
- [ ] Gate order facilitation behind `status === ACTIVE` (not just APPROVED)
- [ ] Show tier badge and commission rate on profile
- [ ] Show tier upgrade progress (sales threshold, rating, days active)
- [ ] Handle `authorizeEnabler` 403 — user is not the enabler
- [ ] Use cursor pagination for all list endpoints
- [ ] Show `enablerCode` and `enablerCodeShort` after approval (used for referrals)

---

## 9. Route Map

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/enabler/enablers/register` | JWT | Register enabler |
| POST | `/api/enabler/enablers/:id/approve` | JWT (admin) | Approve enabler |
| GET | `/api/enabler/enablers/:id` | JWT | Get profile |
| POST | `/api/enabler/enablers/:enablerId/listings` | JWT + KYC L1 | List product |
| GET | `/api/enabler/enablers/:enablerId/listings` | JWT | Get listings |
| POST | `/api/enabler/enablers/:enablerId/orders` | JWT | Facilitate order |
| GET | `/api/enabler/enablers/:enablerId/orders` | JWT | Get orders |
| GET | `/api/enabler/enablers/:enablerId/orders/:orderId/commission` | JWT | Commission breakdown |
| GET | `/api/enabler/enablers/:enablerId/earnings/summary` | JWT | Earnings summary |
| GET | `/api/enabler/enablers/:enablerId/earnings` | JWT | Earnings ledger |
| GET | `/api/enabler/enablers/:enablerId/promotion-jobs` | JWT | List promotion jobs |
| POST | `/api/enabler/enablers/:enablerId/promotion-jobs/:jobId/accept` | JWT | Accept job |
| GET | `/api/enabler/enablers/:enablerId/referral-link` | JWT | Get referral link |
| POST | `/api/enabler/enablers/:enablerId/referral-link` | JWT | Generate referral link |
| POST | `/api/enabler/enablers/:enablerId/referral-link/events` | JWT | Track referral event |
| GET | `/api/enabler/hub/products` | JWT | Browse hub products |
