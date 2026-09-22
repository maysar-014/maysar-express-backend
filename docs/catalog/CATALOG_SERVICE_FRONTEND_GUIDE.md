# Catalog Service — Frontend Integration Guide

> Mount path: `/api/catalog` — all product routes prefixed with `/v1`
> Audience: Seller portal, buyer app, admin panel

---

## Product Status Machine

```
DRAFT → PENDING_REVIEW → PUBLISHED → SUSPENDED → PUBLISHED
DRAFT | PENDING_REVIEW → ARCHIVED (terminal)
PUBLISHED | SUSPENDED → ARCHIVED (terminal)
```

`ARCHIVED` is terminal — no transitions out.

**Status values (exact strings):** `draft` | `pending_review` | `published` | `archived` | `suspended`

---

## Create a Product
`POST /api/catalog/v1/products` — requires role `seller`, `supplier`, or `admin`

```jsonc
{
  "sellerId": "usr_01J...",
  "categoryId": "cat_01J...",
  "brand": "Karibu Fashions",
  "productName": "Men's Cotton Shirt",
  "minimumOrderQuantity": 1,
  "supplierLocationId": "loc_01J...",   // either this OR supplierLocation required
  "supplierLocation": "Kariakoo, Dar es Salaam",
  "structuredAttributes": {
    "color": "white",
    "size": "L",
    "material": "100% cotton"
  },
  "mediaUrls": ["https://cdn.example.com/shirt-front.jpg"],  // min 1
  "price": 25000,
  "currency": "TZS",                    // optional, defaults to TZS
  "inventoryCount": 50,                 // optional
  "enablerEnabled": true,               // optional
  "enablerCommissionRate": 0.05,        // required when enablerEnabled: true, range (0, 1]
  "codAccepted": true,                  // optional
  "freeDelivery": false,                // optional
  "condition": "new"                    // optional: new|used|refurbished|damaged
}
```

```jsonc
// Response 201
{
  "success": true,
  "data": {
    "id": "prd_01J...",
    "sellerId": "usr_01J...",
    "name": "Men's Cotton Shirt",
    "status": "draft",
    "visibility": "public",
    "price": { "amount": 25000, "currency": "TZS" },
    "condition": "new",
    "createdAt": "2024-09-01T10:00:00.000Z"
  }
}
```

New products always start in `draft` status.

**KYC gate:** KYC level 0 allows up to **5 listings**. Beyond 5, KYC verification is required → 403 `KYC_LISTING_CAPACITY_EXCEEDED`.

**Validation rules:**
- `enablerEnabled: true` requires `enablerCommissionRate` (0 < rate ≤ 1)
- Either `supplierLocationId` or `supplierLocation` must be provided
- `mediaUrls` must have at least 1 item
- `price` must be positive

---

## Get a Product
`GET /api/catalog/v1/products/:id`

```jsonc
// Response 200
{
  "success": true,
  "data": {
    "id": "prd_01J...",
    "sellerId": "usr_01J...",
    "name": "Men's Cotton Shirt",
    "description": "Premium 100% cotton shirt...",
    "status": "published",
    "visibility": "public",
    "condition": "new",
    "price": { "amount": 25000, "currency": "TZS" },
    "compareAtPrice": { "amount": 30000, "currency": "TZS" },
    "inventory": { "quantity": 48, "available": 45, "reserved": 3 },
    "images": ["https://cdn.example.com/shirt-front.jpg"],
    "tags": ["cotton", "men", "shirt"],
    "enablerEnabled": true,
    "enablerCommissionRate": 0.05,
    "codAccepted": true,
    "createdAt": "2024-09-01T10:00:00.000Z"
  }
}
```

---

## Update a Product
`PUT /api/catalog/v1/products/:id` — requires role `seller`, `supplier`, or `admin`

All fields optional. At least one must be provided.

```jsonc
{
  "price": 22000,
  "stock": 60,
  "mediaUrls": ["https://cdn.example.com/shirt-front-v2.jpg"],
  "codAccepted": false
}
```

```jsonc
// Response 200
{
  "success": true,
  "data": { "id": "prd_01J...", "updatedAt": "2024-09-02T10:00:00.000Z" }
}
```

---

## Product Lifecycle

### Publish
`POST /api/catalog/v1/products/:id/publish` — requires role `seller`, `supplier`, or `admin`

No body. Transitions `draft`/`pending_review` → `published`.

```jsonc
// Response 200
{ "success": true, "data": { "id": "prd_01J...", "status": "published" } }
```

### Unpublish
`POST /api/catalog/v1/products/:id/unpublish` — requires role `seller`, `supplier`, or `admin`

No body. Transitions `published` → `suspended`.

---

## Search Products
`GET /api/catalog/v1/products/search`

```
GET /api/catalog/v1/products/search?q=cotton+shirt&category=cat_01J...&minPrice=10000&maxPrice=50000&inStock=true&sortBy=price&sortOrder=asc&page=1&limit=20
```

| Param | Type | Notes |
|-------|------|-------|
| `q` | string | min 1 char |
| `category` | string | category ID |
| `seller` | string | seller ID |
| `productType` | string | physical/digital/service/subscription |
| `status` | string | |
| `inStock` | `true`/`false` | |
| `tags` | string or string[] | |
| `minPrice` | number ≥ 0 | |
| `maxPrice` | number ≥ 0 | |
| `page` | integer ≥ 1 | |
| `limit` | integer 1–100 | |
| `sortBy` | `relevance`/`price`/`rating`/`newest`/`popularity` | |
| `sortOrder` | `asc`/`desc` | |
| `facets` | `true`/`false` | include facet counts |
| `suggestions` | `true`/`false` | include search suggestions |

```jsonc
// Response 200
{
  "success": true,
  "data": {
    "products": [
      {
        "id": "prd_01J...",
        "name": "Men's Cotton Shirt",
        "price": { "amount": 25000, "currency": "TZS" },
        "status": "published",
        "inStock": true,
        "images": ["https://cdn.example.com/shirt-front.jpg"]
      }
    ],
    "total": 42,
    "page": 1,
    "limit": 20,
    "facets": { "category": { "clothing": 30, "accessories": 12 } }
  }
}
```

---

## Campaigns

Campaigns allow sellers to create promotional pricing (discount, bundle, flash sale, seasonal) on their products. All campaign routes are under `/api/catalog/campaigns`.

### Campaign status machine

```
DRAFT → SCHEDULED → ACTIVE → COMPLETED
              ↘ CANCELLED
       ACTIVE → PAUSED → ACTIVE (resume)
```

Campaign types: `DISCOUNT` | `BUNDLE` | `FLASH_SALE` | `SEASONAL`

### Create a campaign
`POST /api/catalog/campaigns` — requires role `seller` or `admin`

```jsonc
{
  "name": "Weekend Flash Sale",
  "type": "FLASH_SALE",
  "discountPercentage": 20,
  "productIds": ["prd_01J...", "prd_02J..."],
  "startAt": "2026-09-12T06:00:00Z",
  "endAt": "2026-09-14T23:59:59Z"
}
```

### List campaigns
`GET /api/catalog/campaigns` — requires auth

### Get campaign
`GET /api/catalog/campaigns/:id` — requires auth

### Update campaign (DRAFT/SCHEDULED only)
`PUT /api/catalog/campaigns/:id` — requires role `seller` or `admin`

### Launch campaign
`POST /api/catalog/campaigns/:id/launch` — requires role `seller` or `admin`

Body must be an empty object `{}`. Transitions `DRAFT`/`SCHEDULED` → `ACTIVE`.

### Pause campaign
`POST /api/catalog/campaigns/:id/pause` — requires role `seller` or `admin`

Body must be an empty object `{}`. Transitions `ACTIVE` → `PAUSED`.

### Resume campaign
`POST /api/catalog/campaigns/:id/resume` — requires role `seller` or `admin`

Body must be an empty object `{}`. Transitions `PAUSED` → `ACTIVE`.

### Cancel campaign
`POST /api/catalog/campaigns/:id/cancel` — requires role `seller` or `admin`

Body must be an empty object `{}`. Transitions to `CANCELLED`.

### Complete campaign (admin only)
`POST /api/catalog/campaigns/:id/complete` — requires role `admin`

Body must be an empty object `{}`. Transitions `ACTIVE` → `COMPLETED`.

**Active campaign pricing:** When a campaign is `ACTIVE`, the product's displayed price in search results and the product detail page is automatically lowered by the campaign discount. The `compareAtPrice` field shows the original price. Frontend does not need to calculate this — the catalog API returns the discounted price.

---

## Product Reviews

### Submit a review (buyer only)
`POST /api/catalog/v1/products/:id/reviews` — requires role `buyer`

```jsonc
{
  "rating": 4,
  "comment": "Great quality, fast delivery."
}
```

### Get product reviews
`GET /api/catalog/v1/products/:id/reviews?page=1&limit=20`

```jsonc
{
  "success": true,
  "data": {
    "reviews": [
      {
        "id": "rev_01J...",
        "buyerId": "usr_01J...",
        "rating": 4,
        "comment": "Great quality, fast delivery.",
        "createdAt": "2026-09-06T10:00:00Z"
      }
    ],
    "averageRating": 4.3,
    "totalCount": 47,
    "page": 1,
    "limit": 20
  }
}
```

---

## Product Matching / Fingerprinting

When a seller creates a product, the server generates a **fingerprint** from the normalized title, brand, category, and key attributes. If a product with the same fingerprint already exists in the catalog, the new listing is **linked to the existing product** instead of creating a duplicate.

**What this means for frontend:**
- Two sellers selling the same product both appear on the same product detail page, competing in the buy-box
- The `POST /products` response may include `matchedProductId` if the listing was matched to an existing product
- The buy-box winner is shown at the top of the product detail — the seller with the best composite score

This is why searching for "Samsung Galaxy A15" always shows a single product page with multiple sellers, rather than duplicate listings.

---

## Buy Box

The buy-box determines which seller's listing is shown as the primary "Add to Cart" option on a product detail page. It is computed automatically — sellers cannot manually claim the buy-box.

### 9-Signal Composite Ranking

The ranking engine evaluates each eligible seller listing on 9 signals:

| Signal | What it measures |
|---|---|
| `PriceCompetitivenessSignal` | Price deviation from the category median |
| `FulfillmentReliabilitySignal` | Historical on-time delivery rate |
| `SellerTrustSignal` | KYC verification status, dispute rate, account tenure |
| `StockReliabilitySignal` | Stockout rate and reservation success rate |
| `MarginContributionSignal` | Platform margin contribution for this listing |
| `RateSignals` | Return rate and cancellation rate |
| `RecencyWeightedRate` | Recent performance weighted more heavily than historical |
| `GeographicOptimizer` | Seller proximity to the buyer's delivery address |
| `ExplorationAllocator` | Small allocation to newer sellers to gather performance data |

Category-specific weight strategies override the default weights (electronics, fresh produce, and fashion have different signal priorities).

**Anomaly detection:** Before ranking, the fraud detector screens for sudden price drops below cost and coordinated price manipulation patterns. Listings flagged as anomalous are excluded from buy-box consideration.

### Get Buy Box Winner
`GET /api/catalog/v1/products/:productId/buy-box`

```jsonc
// Response 200
{
  "success": true,
  "data": {
    "productId": "prd_01J...",
    "winningSellerId": "usr_01J...",
    "winnerScore": 87.4,
    "alternatives": [
      { "sellerId": "usr_02J...", "score": 81.2, "rank": 2 },
      { "sellerId": "usr_03J...", "score": 74.8, "rank": 3 }
    ],
    "anomalyFlags": [],
    "computedAt": "2024-09-01T10:00:00.000Z"
  }
}
```

**Composite scoring:** see the 9-signal table above. The `winnerScore` is the normalized composite (0–100).

**Eligibility:** listing excluded if `isSuspended`, `stock = 0`, or `matchConfidence` below threshold.

**Anomaly flags:**

| Flag | Trigger |
|------|---------|
| `stockReliability` | Stock ≥ 100× baseline or ≥ 1000 |
| `priceCompetitiveness` | Price < 60% of median |

Show anomaly flags as a warning badge on the affected listing.

### Trigger Buy Box Recompute (admin)
`POST /api/catalog/v1/products/:productId/buy-box/compute`

---

## Categories

### List Categories
`GET /api/catalog/v1/categories`

```jsonc
// Response 200
{
  "success": true,
  "data": [
    { "id": "cat_01J...", "label": "Clothing", "slug": "clothing", "isActive": true, "parentId": null }
  ]
}
```

### Get Category Attributes
`GET /api/catalog/v1/categories/:categoryId/attributes`

Returns the structured attribute schema for a category (used to build the product creation form).

```jsonc
// Response 200
{
  "success": true,
  "data": {
    "categoryId": "cat_01J...",
    "attributes": [
      { "key": "color", "label": "Colour", "type": "string", "required": true },
      { "key": "size", "label": "Size", "type": "enum", "options": ["XS","S","M","L","XL"], "required": true }
    ]
  }
}
```

### Create / Update / Delete Category (admin only)
```
POST   /api/catalog/v1/categories
PUT    /api/catalog/v1/categories/:id
DELETE /api/catalog/v1/categories/:id
```

Create body:
```jsonc
{
  "label": "Electronics",
  "slug": "electronics",           // optional, lowercase/numbers/hyphens/underscores only
  "icon": "📱",                    // optional
  "description": "...",            // optional
  "parentId": null,                // optional
  "displayOrder": 1,               // optional
  "isActive": true                 // optional
}
```

---

## Media Upload

`POST /api/catalog/v1/media/upload` — requires role `seller`, `supplier`, or `admin`
`POST /api/catalog/v1/products/:id/media` — per-product alias

Multipart form upload. Field name: `file`.

| Constraint | Value |
|-----------|-------|
| Accepted formats | `image/webp`, `image/jpeg`, `image/png`, `image/jpg` |
| Max file size | 20 MB |
| Max files per request | 1 |

```jsonc
// Response 200
{
  "success": true,
  "data": { "url": "https://cdn.example.com/products/prd_01J.../img1.webp" }
}
```

Error 422 `UNSUPPORTED_IMAGE_FORMAT` if format not in allowed list.

---

## Preview Generated Description
`POST /api/catalog/v1/products/preview-description` — requires role `seller`, `supplier`, or `admin`

```jsonc
{
  "categoryId": "cat_01J...",
  "brand": "Karibu Fashions",
  "productName": "Men's Cotton Shirt",
  "structuredAttributes": { "color": "white", "size": "L" }
}
```

```jsonc
// Response 200
{
  "success": true,
  "data": { "description": "Premium white cotton shirt in size L from Karibu Fashions..." }
}
```

---

## Seller Products
`GET /api/catalog/v1/sellers/:sellerId/products?page=1&limit=20&status=published`

---

## Product Analytics & Metrics (seller/admin only)
```
GET /api/catalog/v1/products/:id/analytics
GET /api/catalog/v1/products/:id/metrics
```

---

## Bulk Operations (admin only)
```
POST   /api/catalog/v1/products/bulk    { "products": [...] }
PUT    /api/catalog/v1/products/bulk    { "productIds": [...], "updates": {...} }
DELETE /api/catalog/v1/products/bulk    { "productIds": [...] }
```

---

## Product Visibility Rules (applied automatically by server)

| Condition | Visibility applied |
|-----------|-------------------|
| Account age < 30 days | restricted to `private` |
| Seller rating < 3.0 | restricted to `seller_only` |
| Status `suspended` or `archived` | forced to `hidden` |
| Premium seller tier | boosted to `public` |

---

## SEO Data Constraints

| Field | Constraint |
|-------|-----------|
| SEO title | max 60 characters |
| SEO description | max 160 characters |
| SEO slug | lowercase letters, numbers, hyphens, underscores only |

---

## Content Validation

Server runs content validation on descriptions. Blocking issues (422):
- Description < 50 characters
- Prohibited keywords: `illegal`, `stolen`, `counterfeit`
- Completeness score < 60%

Non-blocking suggestions (returned in response `warnings[]`):
- Spam indicators score > 30
- Quality score < 70
- Readability score < 40

---

## Error Codes

| Code | HTTP | Meaning |
|------|------|---------|
| `VALIDATION_ERROR` | 400 | Missing/invalid fields |
| `UNAUTHORIZED` | 401 | No/expired JWT |
| `FORBIDDEN` | 403 | Insufficient role |
| `KYC_LISTING_CAPACITY_EXCEEDED` | 403 | Over 5 listings without KYC |
| `NOT_FOUND` | 404 | Product/category not found |
| `INVALID_STATUS_TRANSITION` | 409 | Illegal status change |
| `UNSUPPORTED_IMAGE_FORMAT` | 422 | Image format not allowed |
| `CONTENT_VALIDATION_FAILED` | 422 | Prohibited content or too short |

---

## Integration Checklist

- [ ] Always display the buy-box winner's listing price — never show only the cheapest listing from a search
- [ ] Re-fetch delivery options if user takes longer than the quote TTL to proceed to checkout
- [ ] New product creation: display `matchedProductId` if returned — it means the listing was linked to an existing product, not a duplicate
- [ ] Active campaign: show `compareAtPrice` alongside discounted price when a campaign is `ACTIVE` on a product
- [ ] KYC gate: check for `KYC_LISTING_CAPACITY_EXCEEDED` (403) when seller tries to create a product — redirect to KYC flow
- [ ] Media upload: accept only `image/webp`, `image/jpeg`, `image/png`, `image/jpg` — validate client-side before upload
- [ ] Content validation errors: show `warnings[]` from product creation response as non-blocking suggestions
- [ ] Buy-box anomaly flags: show a warning badge on listings with `anomalyFlags` populated
- [ ] ARCHIVED status is terminal — hide edit/publish/unpublish actions for archived products


---

## System Maintenance (internal/ops)

These endpoints are for ops/admin use only. They are not called from the frontend.

```
POST /api/catalog/system/maintenance/cleanup/outbox/report
POST /api/catalog/system/maintenance/cleanup/outbox
```

**Auth:** `requireRoleOrService(['admin','system'])` **and** `x-service-key` header (value must be in `ALLOWED_SERVICE_KEYS` env var).

### Outbox cleanup report
`POST /api/catalog/system/maintenance/cleanup/outbox/report` → **200**

Returns a dry-run count of outbox events eligible for deletion without deleting anything.

```jsonc
{
  "success": true,
  "batchSize": 1000,
  "retentionDays": { "sent": 7, "failed": 30 },
  "counts": { "processed": 4200, "failed": 12 },
  "estimatedBatches": { "processed": 5, "failed": 1 },
  "durationMs": 45
}
```

### Outbox cleanup
`POST /api/catalog/system/maintenance/cleanup/outbox` → **200**

Deletes eligible outbox events in batches. Pass `{ "dryRun": true }` in body to simulate.

```jsonc
{ "dryRun": true }
```

`maxRuntimeMs` defaults to **20 seconds**. Re-run if more batches remain.
