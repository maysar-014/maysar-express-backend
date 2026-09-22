# Buyer Guide — Catalog Service

> Mirrors: docs/FLOWS/catalog/user-flow/buyer-flows.md
> Verification status: Partially Verified (product/category 404s data-level; search redirects noted; canonical search endpoint Verified)
> Last updated: September 2026

## Overview

This guide is for frontend developers implementing the catalog UI for buyers. It covers three flows: searching for products, viewing a product detail page, and browsing products by category. All catalog discovery is unauthenticated — no JWT is required for these flows. The buy-box winner (best available seller for each product) is determined server-side and included in every response.

---

## Flow 1: Product Search

**User Goal:** Find products matching a search query or filter criteria.

**UI States to Handle:**

| State | What User Sees | UI Treatment |
|---|---|---|
| Loading | Search results loading | Skeleton product cards (grid or list) |
| Success | Product grid with results | Render product cards from `products[]` |
| Empty | No results found | "No products found. Try a different search." with suggestion to browse categories |
| Error | Search failed | "Unable to search products. Please try again." + retry |

> ⚠️ **CRITICAL — Canonical Search Path:** Always call the canonical endpoint directly:
> ```
> GET /api/catalog/v1/products/search?q=
> ```
> Do **NOT** call `/api/catalog/v1/search` or `/api/catalog/v1/search/products`. Both return **301 redirects** to the canonical path. Relying on redirects can cause inconsistent client behavior (some HTTP clients don't follow 301 on GET, some alter the method, some cache the redirect incorrectly). Configure your HTTP client to call the canonical path directly.

**Actions the User Can Take:**

**Search for products:**
- What the user sees before acting: Search bar at the top of the discovery screen
- What they type: Search query text, optional filters
- API call: `GET /api/catalog/v1/products/search?q={query}&category={id}&minPrice={n}&maxPrice={n}&page={n}&limit={n}`
- Auth: None required
- Success response: `200 { products[], pagination: { page, limit, total } }`
- Success handling: Render product cards. Each product includes the buy-box winner's price and stock status — use these as the primary displayed values.
- Error handling: See error code table below

**Search query parameters:**

| Parameter | Type | Notes |
|---|---|---|
| `q` | string | Full-text search query |
| `category` | string | Filter by category ID |
| `minPrice` | number | Minimum price filter (TZS) |
| `maxPrice` | number | Maximum price filter (TZS) |
| `page` | number | Page number (1-indexed) |
| `limit` | number | Results per page |

**Filter and paginate:**
- Price filters and category filter can be combined with the text query
- Render pagination controls using `pagination.total`, `pagination.page`, `pagination.limit`
- On page change, re-request with updated `page` parameter

**Error Code Table:**

| HTTP Status | Error Code | User-Facing Message | Retry? |
|---|---|---|---|
| 400 | VALIDATION_ERROR | "Please check your search filters and try again." | Yes — correct filter values |
| 301 | — | (Do not surface this to users — fix the client to use the canonical path) | — |
| 5xx | — | "Unable to search products. Please try again." | Yes — retry after delay |

**What the User Should Understand at Every Stage:**
- While loading: products are being searched across the catalog.
- On success: results are ranked by relevance. The price shown is from the best available seller (buy-box winner).
- On empty results: no products match the current query. Suggest broadening the search or browsing by category.

---

## Flow 2: Product Detail

**User Goal:** View full details of a specific product and see the best available price.

**UI States to Handle:**

| State | What User Sees | UI Treatment |
|---|---|---|
| Loading | Product page loading | Skeleton layout with placeholder for image, title, price |
| Success | Full product detail | Render all product fields; show buy-box winner price prominently |
| Not found | Product unavailable | "This product is no longer available." — do not show a retry; link back to search/browse |
| Error | Load failed | "Unable to load this product. Please try again." + retry |

**Actions the User Can Take:**

**Load product detail:**
- What the user sees: Typically navigated from a search result or category browse
- API call: `GET /api/catalog/v1/products/:productId`
- Auth: None required
- Success response: `200` with product data including buy-box winner seller, current price, stock status, variants, images, and reviews summary
- Success handling:
  - Display the buy-box winner's price as the primary price (this is the price the buyer will pay)
  - Show stock status — if out of stock, disable the "Add to cart" action
  - Display product images, title, description, variants, and reviews summary

**Buy-box winner price display:**
- Always show the buy-box winner's price prominently as the headline price
- The buy-box winner is pre-computed server-side and included in the response
- Do not allow price negotiation or display of alternative seller prices in the buyer-facing view

**Error Code Table:**

| HTTP Status | Error Code | User-Facing Message | Retry? |
|---|---|---|---|
| 404 | RESOURCE_NOT_FOUND | "This product is no longer available." | No — navigate back to search |
| 5xx | — | "Unable to load this product. Please try again." | Yes — retry after delay |

**What the User Should Understand at Every Stage:**
- While loading: the full product detail including current pricing is being fetched.
- On success: the price shown is the current best price from the winning seller. It may change if the buy-box is re-ranked.
- On 404: the product has been removed or is not yet published. Guide the user back to the product listing.

---

## Flow 3: Browse by Category

**User Goal:** Discover products in a specific category.

**UI States to Handle:**

| State | What User Sees | UI Treatment |
|---|---|---|
| Loading categories | Category list loading | Skeleton list |
| Categories loaded | Hierarchical category tree | Render category list with icons/names |
| Loading category products | Product grid loading | Skeleton product cards |
| Products loaded | Product grid for selected category | Render product cards from `products[]` |
| Empty category | No products in this category | "No products available in this category yet." |
| Category not found | Invalid category | "Category not found." — link back to top-level categories |
| Error | Load failed | "Unable to load this category. Please try again." + retry |

**Actions the User Can Take:**

**Load category tree:**
- API call: `GET /api/catalog/v1/categories`
- Auth: None required
- Success response: `200` with hierarchical category list
- Success handling: Render category tree for navigation

**Browse products in a category:**
- What the user sees: Category page after selecting a category
- API call: `GET /api/catalog/v1/categories/:categoryId/products?page={n}&limit={n}`
- Auth: None required
- Success response: `200 { products[], pagination }`
- Success handling: Render product grid. Each product shows buy-box winner price and stock status.
- Empty state: if `products[]` is empty, show "No products available in this category yet."

**Error Code Table:**

| HTTP Status | Error Code | User-Facing Message | Retry? |
|---|---|---|---|
| 400 | VALIDATION_ERROR | "Please check your request and try again." | Yes |
| 404 | RESOURCE_NOT_FOUND | "Category not found." | No — link back to category list |
| 5xx | — | "Unable to load this category. Please try again." | Yes — retry after delay |

**What the User Should Understand at Every Stage:**
- While loading: products in the selected category are being fetched and ranked.
- On empty category: the category exists but has no active products listed yet. Suggest similar categories or the search flow.
- On 404: the category ID is invalid. This should not happen in normal navigation — link back to the category tree.
