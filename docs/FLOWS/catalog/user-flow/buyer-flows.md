# Buyer Flows — Catalog Service

> **Verification status:** Partially Verified (product/category 404s data-level; search redirects noted; canonical search endpoint Verified)
> **Verification basis:** `docs/FLOWS/_verification/analysis-report.md` (September 2026)
> **Last updated:** September 2026

## Overview

This document covers catalog-service flows from the buyer's perspective: searching for products, viewing product detail, and browsing by category. All search and discovery flows are unauthenticated (no JWT required). The buy-box winner is determined server-side by a 9-signal composite ranking engine — buyers always see the best available seller for each product automatically.

---

## Flow Index

| # | Flow Name | Verification Status | Primary Endpoint |
|---|---|---|---|
| 1 | Product Search | Partially Verified (search redirects noted) | `GET /api/catalog/v1/products/search` |
| 2 | View Product Detail | Verified (data-level 404 observed) | `GET /api/catalog/v1/products/:productId` |
| 3 | Browse by Category | Partially Verified | `GET /api/catalog/v1/categories`, `GET /api/catalog/v1/categories/:categoryId/products` |

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
| Trigger | Buyer clicks on a product from search results, category browse, or direct link |
| Preconditions | None (unauthenticated) |
| Terminal states (success) | 200 with full product detail including buy-box winner |
| Terminal states (failure) | 404 (product not found) |
| Verification status | Verified (data-level 404 observed in sweep — route exists) |

### Happy Path

| Step | Actor/System | Action | Endpoint | Auth | Expected Response |
|---|---|---|---|---|---|
| 1 | Buyer | Navigates to product page | — | — | UI requests product detail |
| 2 | Buyer | Product detail requested | `GET /api/catalog/v1/products/:productId` | None | Request sent |
| 3 | catalog-service | Fetches product via `GetProductUseCase` | — | — | Product entity loaded |
| 4 | catalog-service | Attaches buy-box winner, pricing, and stock status | — | — | Buy-box winner from pre-computed ranking |
| 5 | Buyer | Receives full product detail | — | — | 200 with product, buy-box winner seller, pricing, variants, images, reviews summary |

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
