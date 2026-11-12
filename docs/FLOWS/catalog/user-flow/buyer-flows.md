# Buyer Flows — Catalog Service

> **Verification status:** Verified (Flows 1-3); Flows 4-5 added 2026-11-10 (MUVA/MSLE — pending live verification)
> **Verification basis:** `scripts/verification/run-lifecycle-checks.mjs` LC-29 (2026-11-06); MUVA/MSLE Phase 1-4 implementation (2026-11-10)
> **Last updated:** 2026-11-10 (added Flow 4: Configuration Selection & Resolution, Flow 5: View Seller Offers for a Product)

## Overview

This document covers catalog-service flows from the buyer's perspective: searching for products, viewing product detail by ID or slug, and browsing by category. All search and discovery flows are unauthenticated (no JWT required). The buy-box winner is determined server-side by a 9-signal composite ranking engine — buyers always see the best available seller for each product automatically.

---

## Flow Index

| # | Flow Name | Verification Status | Primary Endpoint |
|---|---|---|---|
| 1 | Product Search | Verified | `GET /api/catalog/v1/products/search` |
| 2 | View Product Detail (by ID or Slug) | Verified | `GET /api/catalog/v1/products/:identifier` |
| 3 | Browse by Category | Verified | `GET /api/catalog/v1/categories`, `GET /api/catalog/v1/categories/:categoryId/products` |
| 4 | Configuration Selection & Resolution | Pending Verification | `GET /api/catalog/v1/products/:productId/configuration` |
| 5 | View Seller Offers for a Product | Pending Verification | `GET /api/catalog/v1/products/:productId/offers` |

---

## Flow 1: Product Search

> **⚠️ Search Redirect Note:** Two search paths return 301 redirects and must NOT be used directly:
> - `GET /api/catalog/v1/search` → redirects to `/api/catalog/v1/products/search?q=`
> - `GET /api/catalog/v1/search/products` → redirects to `/api/catalog/v1/products/search`
>
> Use the canonical endpoint below. Do not build UI calls against the redirect-source paths.

### Summary

| Field | Value |
|---|---|
| Actor | Buyer |
| Trigger | Buyer types a search query or applies filters in the product discovery UI |
| Preconditions | None (unauthenticated) |
| Terminal states (success) | 200 with `{ products[], pagination: { page, limit, total } }` |
| Terminal states (failure) | 400 (invalid query parameters); 422 (validation error) |
| Verification status | Partially Verified (canonical endpoint; redirect sources confirmed 301) |

### Happy Path

| Step | Actor/System | Action | Endpoint | Auth | Expected Response |
|---|---|---|---|---|---|
| 1 | Buyer | Enters search query and optional filters | — | — | UI constructs query string |
| 2 | Buyer | Search request issued | `GET /api/catalog/v1/products/search?q=&category=&minPrice=&maxPrice=&page=&limit=` | None | Request sent |
| 3 | catalog-service | Routes request to `SearchProductsUseCase` | — | — | Internal routing |
| 4 | catalog-service | Queries MeiliSearch index via `OptimizedSearchEngine` | — | — | Facets, filters, and pagination applied |
| 5 | catalog-service | Attaches buy-box winner as primary seller for each product | — | — | Each result includes winning `sellerId`, price, and stock status |
| 6 | Buyer | Receives paginated results | — | — | 200 `{ products[], pagination: { page, limit, total } }` |

### Service Interaction Chain

`GET /api/catalog/v1/products/search` is handled within catalog-service. The `OptimizedSearchEngine` queries MeiliSearch (maintained by `CatalogSearchIndexerService`). No other services are called during search. The buy-box winner included in each result is pre-computed and stored on the product record — it is not computed on-the-fly per request.

### Query Parameters

| Parameter | Type | Description |
|---|---|---|
| `q` | string | Full-text search query |
| `category` | string | Filter by category ID |
| `minPrice` | number | Minimum price filter (TZS) |
| `maxPrice` | number | Maximum price filter (TZS) |
| `page` | number | Page number (1-indexed) |
| `limit` | number | Results per page |

### Unhappy Path Branches

| Trigger Condition | System Response | Error Code | Terminal State |
|---|---|---|---|
| Request sent to redirect-source path (`/v1/search` or `/v1/search/products`) | 301 redirect to canonical path | — | Follow redirect or use canonical path directly |
| Invalid `minPrice` or `maxPrice` (non-numeric) | 400 | `VALIDATION_ERROR` | Buyer corrects filter values |
| `page` or `limit` out of range | 400 | `VALIDATION_ERROR` | Buyer corrects pagination |
| No results match query | 200 with empty `products[]` | — | UI shows empty state; suggest related categories |

---

## Flow 2: View Product Detail

### Summary

| Field | Value |
|---|---|
| Actor | Buyer |
| Trigger | Buyer clicks on a product from search results, category browse, or shareable slug URL |
| Preconditions | None (unauthenticated) |
| Terminal states (success) | 200 with full product detail including buy-box winner |
| Terminal states (failure) | 404 (product not found) |
| Verification status | Verified |

### Transparent Identifier Resolution

`GET /api/catalog/v1/products/:identifier` accepts either form without change to the URL structure:

- **System ID** — e.g. `GET /api/catalog/v1/products/prod_01ABCDEF…` (direct database lookup)
- **URL slug** — e.g. `GET /api/catalog/v1/products/juma-mens-leather-sandals` (falls back to slug lookup when ID lookup returns null)

The response shape is identical regardless of which form is used. This mirrors the storefront pattern (`GET /api/catalog/sellers/:sellerId/storefront`) where either a UUID or a slug is accepted in the same parameter.

> **No `/by-slug/` path.** A separate `/by-slug/:slug` endpoint does not exist and never should — it would be redundant and expose an implementation detail as a URL segment.

### Happy Path

| Step | Actor/System | Action | Endpoint | Auth | Expected Response |
|---|---|---|---|---|---|
| 1 | Buyer | Navigates to product page (by ID or slug) | — | — | UI requests product detail |
| 2 | Buyer | Product detail requested | `GET /api/catalog/v1/products/:identifier` | None | Request sent |
| 3 | catalog-service | `GetProductUseCase` calls `findById(:identifier)` | — | — | Product found → proceed to step 5 |
| 4 | catalog-service | If `findById` returns null, calls `findBySlug(:identifier)` | — | — | Product found by slug → proceed to step 5 |
| 5 | catalog-service | Attaches buy-box winner, pricing, and stock status | — | — | Buy-box winner from pre-computed ranking |
| 6 | Buyer | Receives full product detail | — | — | 200 with product, buy-box winner seller, pricing, variants, images, reviews summary |

### Response Includes

- Product title, description, category, attributes
- Current price (from buy-box winner)
- Stock status (from buy-box winner's inventory)
- All product variants
- Product images
- Reviews summary (average rating, review count)
- Buy-box winner: `sellerId`, seller name, price, shipping estimate

### Service Interaction Chain

`GET /api/catalog/v1/products/:productId` is handled within catalog-service by `GetProductUseCase`. No inter-service calls are made per request — inventory and buy-box data are denormalized onto the product record and updated asynchronously via events (`buy_box.updated`, `product.updated`).

### Unhappy Path Branches

| Trigger Condition | System Response | Error Code | Terminal State |
|---|---|---|---|
| Product not found | 404 (data-level) | `RESOURCE_NOT_FOUND` | Route exists; `productId` invalid or product archived |
| Product in `DRAFT` or `PENDING_REVIEW` status | 404 | `RESOURCE_NOT_FOUND` | Product not yet published; buyer cannot view |
| Product `ARCHIVED` | 404 | `RESOURCE_NOT_FOUND` | Product removed from catalog |

---

## Flow 3: Browse by Category

### Summary

| Field | Value |
|---|---|
| Actor | Buyer |
| Trigger | Buyer opens category browser or navigates via category link |
| Preconditions | None (unauthenticated) |
| Terminal states (success) | 200 category tree or 200 products list for category |
| Terminal states (failure) | 404 (category not found) |
| Verification status | Partially Verified |

### Happy Path

| Step | Actor/System | Action | Endpoint | Auth | Expected Response |
|---|---|---|---|---|---|
| 1 | Buyer | Requests the full category tree | `GET /api/catalog/v1/categories` | None | 200 hierarchical category list |
| 2 | Buyer | Selects a category | — | — | `categoryId` extracted from category tree response |
| 3 | Buyer | Requests products in the selected category | `GET /api/catalog/v1/categories/:categoryId/products` | None | 200 `{ products[], pagination }` |
| 4 | catalog-service | Fetches products filtered by category via `ManageCategoriesUseCase` | — | — | Products returned with buy-box winner per product |
| 5 | Buyer | Sees products in category | — | — | Each product includes buy-box winner price and stock status |

### Service Interaction Chain

Both category endpoints are handled entirely within catalog-service. The category tree is stored in the catalog database and managed via `ManageCategoriesUseCase`. No inter-service calls are needed. Products within a category are indexed in MeiliSearch for faceted filtering.

### Unhappy Path Branches

| Trigger Condition | System Response | Error Code | Terminal State |
|---|---|---|---|
| Category not found | 404 | `RESOURCE_NOT_FOUND` | Invalid `categoryId`; buyer returns to top-level category list |
| Category exists but has no active products | 200 with empty `products[]` | — | UI shows empty state; suggest similar categories |
| Invalid pagination parameters | 400 | `VALIDATION_ERROR` | Buyer corrects pagination |

---

---

## Flow 4: Configuration Selection & Resolution

> **Added 2026-11-10 — MUVA/MSLE Phase 1 (ENH-006/009)**
> Products may have configurable options (Colour, Size, Storage, etc.). The buyer selects options and the backend resolves, validates, and confirms the selection before checkout. The frontend never invents configuration rules — it fetches the definition from the backend and presents the options to the buyer.

### Summary

| Field | Value |
|---|---|
| Actor | Buyer |
| Trigger | Buyer views a product that has a configuration definition |
| Preconditions | None (unauthenticated for read); product has an active configuration definition |
| Terminal states (success) | 200 with dimensions, options, and valid combinations |
| Terminal states (failure) | 404 if product has no configuration (simple product) |
| Verification status | Pending live verification |

### Step 1: Fetch Configuration Definition

```
GET /api/catalog/v1/products/{productId}/configuration
```

Returns the full configuration schema:
- **dimensions** — selectable axes (e.g., Colour, Storage)
- **options** — valid values per dimension (e.g., Black, Blue; 64GB, 128GB)
- **dependencies** — conditional rules (e.g., if Colour=Blue, Storage is limited to 64GB only)
- **constraints** — exclusions and min/max selection rules
- **combinations** — the sparse set of valid discrete combinations

> **404 response** means the product has no configuration — it is a simple product. No configuration selection is needed; the buyer can add it to cart directly.

### Step 2: Buyer Selects Options

The frontend renders the dimensions and options as a selector UI. The buyer picks one or more options per dimension. The frontend should call validate on each change or on submit.

### Step 3: Validate Configuration

```
POST /api/catalog/v1/products/{productId}/validate-configuration
Body: { "selections": { "dim_colour": ["opt_black"], "dim_storage": ["opt_128gb"] } }
```

Returns:
```json
{
  "valid": true,
  "errors": []
}
```

If invalid, `errors` contains `{ field, message }` objects explaining what is wrong (missing required dimension, invalid option, dependency violation, etc.).

### Step 4: Resolve Configuration

```
POST /api/catalog/v1/products/{productId}/resolve-configuration
Body: { "selections": { "dim_colour": ["opt_black"], "dim_storage": ["opt_128gb"] } }
```

Returns:
```json
{
  "resolved": true,
  "variantId": "comb_01ABC...",
  "fingerprint": "a1b2c3d4e5f6...",
  "configurationDefinitionVersion": 1,
  "valid": true,
  "errors": [],
  "resolvedConfiguration": { "Colour": "Black", "Storage": "128 GB" },
  "isSparseCombination": true,
  "combinationExists": true
}
```

**Key fields:**
- `fingerprint` — the deterministic canonical identifier for this configuration. Pass this to checkout so the order snapshot preserves the exact configuration.
- `combinationExists` — if `false`, this specific combination is not purchasable even though each individual option is valid. The buyer must choose a different combination.
- `resolvedConfiguration` — human-readable display values for the order summary.

### Service Interaction Chain

All three endpoints are handled within catalog-service. No inter-service calls are needed — the configuration definition, validation policy, and fingerprint algorithm are all in-process domain logic.

### Unhappy Path Branches

| Trigger Condition | System Response | Error Code |
|---|---|---|
| Product has no configuration definition | 404 | `NOT_FOUND` — simple product, no selection needed |
| Invalid option ID in selections | 400 | `VALIDATION_ERROR` |
| Missing required dimension | 200 with `valid: false` and error list | — |
| Combination not in sparse set | 200 with `combinationExists: false` | — |

---

## Flow 5: View Seller Offers for a Product

> **Added 2026-11-10 — MUVA/MSLE Phase 3 (ENH-001/009)**
> Multiple sellers may offer the same catalog product. The buyer can see all active offers to compare prices, conditions, and fulfillment terms. The buy-box winner is pre-computed and surfaced as the default; the offers endpoint lets the buyer see alternatives.

### Summary

| Field | Value |
|---|---|
| Actor | Buyer |
| Trigger | Buyer wants to compare all sellers offering a product |
| Preconditions | None (unauthenticated) |
| Terminal states (success) | 200 with array of active offers sorted by price ascending |
| Terminal states (failure) | 500 (internal error) |
| Verification status | Pending live verification |

### Happy Path

| Step | Actor/System | Action | Endpoint | Auth | Expected Response |
|---|---|---|---|---|---|
| 1 | Buyer | Requests offers for a product | `GET /api/catalog/v1/products/{productId}/offers` | None | 200 with offers array |

### Response Shape

```json
{
  "success": true,
  "data": [
    {
      "id": "offer_01ABC...",
      "sellerId": "usr_01...",
      "price": 42000,
      "currency": "TZS",
      "stockAvailable": 15,
      "condition": "new",
      "fulfillmentPolicy": "seller_fulfilled",
      "leadTimeDays": 2,
      "minimumOrderQuantity": 1
    }
  ]
}
```

Offers are sorted by price ascending. Only `active` status offers are returned. The buy-box winner is typically the first result but is also pre-attached to the product detail response (Flow 2).

### Service Interaction Chain

`GET /api/catalog/v1/products/{productId}/offers` is handled within catalog-service. It queries `Catalog_SellerOffer` filtered by `productId` and `status: 'active'`. No inter-service calls are needed.

