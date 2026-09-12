# Maysar Enabler Service — Implementation Reference (As-Built)

> **Status:** Live and verified — enabler profile management, training gate enforcement, assisted sale attribution via encoded product links, tier management, earnings endpoints.
> **Last updated:** September 2026
> **Scope:** `services/enabler-service`

---

## 1. Guiding Principles Enforced by the Code

| Principle | Where it lives |
|---|---|
| **Training certification gates referral link generation** | An enabler cannot generate referral links until their training certification is `PASSED` |
| **Attribution is link-encoded** | Referral links embed the `enablerId` as a URL parameter; the checkout service reads it and records attribution |
| **Tiers are computed from performance** | `BRONZE → SILVER → GOLD → PLATINUM` based on totalSales, customerRating, and daysActive |
| **Earnings are read-only from enabler perspective** | Enablers view earnings; commission-service writes them |

---

## 2. Domain Model

### 2.1 Enabler Entity

Fields: `enablerId`, `userId`, `status` (`PENDING | ACTIVE | SUSPENDED`), `tier`, `certificationStatus`, `referralCode`, `totalGMV`, `conversionRate`, `joinedAt`.

### 2.2 Tier Model (from TierCalculationAlgorithm + EnablerEntity — live code)

There is no STARTER tier. Tiers are BRONZE, SILVER, GOLD, PLATINUM.

| Tier | Commission rate | Min totalSales (TZS) | Min customerRating | Min daysActive | Tier adjustment |
|---|---|---|---|---|---|
| `BRONZE` | 15% | — | — | — | 1.0× |
| `SILVER` | 17% | 10,000 | 4.0 | 30 | 1.1× |
| `GOLD` | 19% | 50,000 | 4.5 | 90 | 1.2× |
| `PLATINUM` | 22% | 200,000 | 4.8 | 180 | 1.3× |

Demotion rule: `disputeRate > 10%` → forced to BRONZE regardless of other metrics.
Commission rate cap: 25% (even with performance multipliers).

---

## 3. Application Layer

| Use case | What it does |
|---|---|
| `CreateEnablerProfileUseCase` | Creates enabler profile after role assignment |
| `GetEnablerProfileUseCase` | Fetch profile with tier + certification status |
| `GenerateReferralLinkUseCase` | Requires `certificationStatus === 'PASSED'`; generates encoded product URL |
| `GetEnablerEarningsUseCase` | Paginated earnings history from commission-service |
| `UpdateEnablerTierUseCase` | Recomputes tier from GMV + conversion rate |

---

## 4. HTTP Surface

Mounted at `/api/enabler`.

| Method | Path | Auth | Description |
|---|---|---|---|
| GET  | `/api/enabler/profile` | enabler JWT | Get own profile |
| PUT  | `/api/enabler/profile` | enabler JWT | Update profile |
| POST | `/api/enabler/referral-links` | enabler JWT | Generate referral link |
| GET  | `/api/enabler/referral-links` | enabler JWT | List referral links |
| GET  | `/api/enabler/earnings` | enabler JWT | Earnings history |
| GET  | `/api/enabler/earnings/summary` | enabler JWT | Earnings summary |
| GET  | `/api/enabler/tier` | enabler JWT | Current tier + next tier requirements |
| GET  | `/api/enabler/health/live` | none | Health check |

---

## 5. Referral Link Generation

`POST /api/enabler/referral-links`

```jsonc
{ "productId": "prd_01...", "campaignId": "cmp_01..." }
```

Response:
```jsonc
{
  "data": {
    "linkId": "enl_01...",
    "url": "https://maysar.co.tz/p/ergonomic-chair?ref=ENB-ABC123",
    "productId": "prd_01...",
    "expiresAt": null
  }
}
```

The `ref` parameter is the enabler's referral code. When a buyer clicks this link and completes a purchase, the commission-service records the attribution.

---

## 6. Frontend Integration Guide

### Enabler dashboard

Show:
- Current tier badge with progress to next tier
- Total GMV this month
- Conversion rate (clicks → purchases)
- Pending + paid earnings

### Referral link flow

1. Check `certificationStatus === 'PASSED'` — if not, show training CTA
2. `POST /api/enabler/referral-links` with `productId`
3. Show generated URL with copy button and share options (WhatsApp, SMS)
4. Track link performance via `GET /api/enabler/referral-links/:linkId/stats`

### Tier progression

`GET /api/enabler/tier`

```jsonc
{
  "data": {
    "currentTier": "BRONZE",
    "currentGMV": 750000,
    "nextTier": "SILVER",
    "nextTierGMVRequired": 2000000,
    "progressPercent": 37,
    "commissionRate": 0.04
  }
}
```

Show a progress bar toward the next tier.

### Error handling

| Code | HTTP | UI action |
|---|---|---|
| `CERTIFICATION_REQUIRED` | 403 | "Complete training to generate links" |
| `ENABLER_SUSPENDED` | 403 | "Account suspended. Contact support." |
| `PRODUCT_NOT_FOUND` | 404 | "Product no longer available" |
