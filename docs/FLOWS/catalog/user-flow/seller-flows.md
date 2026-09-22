# Seller Flows — Catalog Service

> **Verification status:** Mixed (product create/publish Verified; buy-box anomaly flag deletion FAILING — 500 in September 2026 sweep)
> **Verification basis:** `docs/FLOWS/_verification/analysis-report.md` (September 2026)
> **Last updated:** September 2026

## Overview

This document covers catalog-service flows from the seller's perspective: creating a product (KYC-gated), publishing it to the catalog, and updating product details. All write operations require an authenticated seller JWT. Product creation includes fingerprinting to prevent duplicate listings and is gated by KYC middleware imported in-process from kyc-service — it is not a standalone HTTP call to a separate service.

---

## Flow Index

| # | Flow Name | Verification Status | Primary Endpoint |
|---|---|---|---|
| 1 | Create Product (KYC-Gated) | Verified | `POST /api/catalog/v1/products` |
| 2 | Publish Product | Verified | `POST /api/catalog/v1/products/{id}/publish` |
| 3 | Update Product | Partially Verified | `PUT /api/catalog/v1/products/{id}` or `PATCH /api/catalog/v1/products/{id}` |

---

## Flow 1: Create Product (KYC-Gated)

### Summary

| Field | Value |
|---|---|
| Actor | Seller |
| Trigger | Seller initiates product listing creation |
| Preconditions | Authenticated (Bearer JWT, seller role); KYC level ≥ 1 (enforced in-process by `requireKycLevel(1)` middleware) |
| Terminal states (success) | 201 `{ productId, status: "DRAFT" }` |
| Terminal states (failure) | 422 `KYC_LEVEL_INSUFFICIENT`; 400 validation error; 409 duplicate fingerprint |
| Verification status | Verified |

### Happy Path

| Step | Actor/System | Action | Endpoint | Auth | Expected Response |
|---|---|---|---|---|---|
| 1 | Seller | Submits new product listing | `POST /api/catalog/v1/products` | Bearer JWT (seller role) | Request accepted |
| 2 | catalog-service | Runs `requireKycLevel(1)` middleware (in-process, kyc-service import) | — | — | KYC level checked; passes if level ≥ 1 |
| 3 | catalog-service | Normalizes product attributes | — | — | Title, brand, category, key attributes normalized |
| 4 | catalog-service | Runs `FingerprintAlgorithm` to generate canonical fingerprint | — | — | Fingerprint computed from normalized attributes |
| 5 | catalog-service | Runs `CatalogMatchingEngine` (Jaccard + TF-IDF similarity scoring) | — | — | Checks for existing matching product |
| 6a | catalog-service | If no match: creates new product in `DRAFT` status; indexes in MeiliSearch | — | — | New product created |
| 6b | catalog-service | If match found: links listing to existing product | — | — | Listing matched to existing product |
| 7 | catalog-service | Publishes `product.created` event | — | — | Event emitted: `{ productId, sellerId, categoryId, fingerprint }` |
| 8 | Seller | Receives product ID | — | — | 201 `{ productId, status: "DRAFT" }` |

### KYC Gate Detail

`requireKycLevel(1)` is middleware **imported directly into catalog-service routes** from kyc-service. This is an in-process check — there is no separate HTTP call to a standalone `kyc-service` endpoint at request time. The check reads the seller's KYC level from the shared data store. If the level is below 1, the request is rejected before reaching the use case.

> **Note:** `compliance-service` is not a live service and is not involved in this flow. KYC is handled entirely by kyc-service middleware. See `docs/FLOWS/kyc/user-flow/seller-flows.md` for the KYC flow.

### Product Status Lifecycle

```
DRAFT (created; not visible to buyers)
  → PENDING_REVIEW (seller requests review / quality check triggers)
  → ACTIVE (published; visible to buyers; in buy-box competition)
  → REJECTED (failed review; seller must correct and re-submit)
  → ARCHIVED (seller archived or admin removed)
```

Products start in `DRAFT` status. They are not visible to buyers until `ACTIVE`.

### Request Body

```json
{
  "title": "string (required)",
  "description": "string (required)",
  "categoryId": "string (required)",
  "variants": [{ "sku": "string", "attributes": {}, "price": 0, "stock": 0 }],
  "images": ["url"],
  "pricing": { "basePrice": 0, "currency": "TZS" },
  "inventoryInfo": { "warehouseId": "string", "quantity": 0 }
}
```

### Service Interaction Chain

`POST /api/catalog/v1/products` is handled within catalog-service. `requireKycLevel(1)` is an in-process middleware check. MeiliSearch is updated via `CatalogSearchIndexerService` after successful creation. The `product.created` event is emitted to the platform event bus via outbox.

### Unhappy Path Branches

| Trigger Condition | System Response | Error Code | Terminal State |
|---|---|---|---|
| KYC level < 1 | 422 | `KYC_LEVEL_INSUFFICIENT` | Seller must complete KYC before creating products |
| Missing required fields | 400 | `VALIDATION_ERROR` | Seller corrects and resubmits |
| Invalid `categoryId` | 400 | `VALIDATION_ERROR` | Seller selects a valid category |
| Duplicate fingerprint (same product already listed) | 409 | `DUPLICATE_LISTING` | Listing matched to existing product; seller manages that listing instead |
| Invalid pricing (below cost floor) | 422 | `PRICING_VIOLATION` | Seller adjusts price to meet platform minimums |

---

## Flow 2: Publish Product

### Summary

| Field | Value |
|---|---|
| Actor | Seller |
| Trigger | Seller requests product to go live on the catalog |
| Preconditions | Authenticated (Bearer JWT, seller role); product in `DRAFT` or `PENDING_REVIEW` status; product belongs to seller |
| Terminal states (success) | 200 `{ productId, status: "ACTIVE", qualityScore }` |
| Terminal states (failure) | 422 `QUALITY_SCORE_INSUFFICIENT`; 403 (not owner); 404 (product not found) |
| Verification status | Verified |

### Happy Path

| Step | Actor/System | Action | Endpoint | Auth | Expected Response |
|---|---|---|---|---|---|
| 1 | Seller | Requests to publish a product | `POST /api/catalog/v1/products/{id}/publish` | Bearer JWT (seller role) | Request accepted |
| 2 | catalog-service | Verifies seller owns the product | — | — | Ownership confirmed |
| 3 | catalog-service | Runs quality score check (server-side, at publish time) | — | — | Quality score computed |
| 4 | catalog-service | Quality score ≥ 60: proceeds to publish | — | — | Product status set to `ACTIVE` |
| 5 | catalog-service | Emits `ProductPublished` event → buy-box competition begins | — | — | `buy_box.updated` event triggers ranking engine |
| 6 | Seller | Receives confirmation | — | — | 200 `{ productId, status: "ACTIVE", qualityScore }` |

### Quality Score Requirement

The quality score is computed server-side at publish time. It is based on factors including title completeness, description quality, image count, category accuracy, and pricing data. A score of at least **60** is required to publish. The seller cannot manually set the quality score.

If the score is below 60, the response includes the current `qualityScore` and specific improvement suggestions (fields to improve, content guidance). The seller must update the product and retry publish.

### Buy-Box Competition

On successful publish, the `ProductPublished` event triggers `ComputeBuyBoxUseCase`. The buy-box ranking engine runs the 9-signal composite ranking:

| Signal | What it measures |
|---|---|
| Price competitiveness | Price vs. category median |
| Fulfillment reliability | On-time delivery rate |
| Seller trust | KYC status, dispute rate, tenure |
| Stock reliability | Stockout rate, reservation success |
| Margin contribution | Platform margin contribution |
| Rate signals | Return rate, cancellation rate |
| Recency-weighted rate | Recent performance weighted higher |
| Geographic optimization | Proximity to buyer delivery address |
| Exploration allocation | Small % allocated to non-top-ranked sellers |

The seller will win the buy-box if they rank highest across these signals for their product category.

### Service Interaction Chain

`POST /api/catalog/v1/products/{id}/publish` is handled within catalog-service. The quality score check is internal. The `ProductPublished` event triggers `ComputeBuyBoxUseCase` in-process. The `buy_box.updated` event is emitted to the platform event bus.

### Unhappy Path Branches

| Trigger Condition | System Response | Error Code | Terminal State |
|---|---|---|---|
| Quality score < 60 | 422 with `qualityScore` and improvement suggestions | `QUALITY_SCORE_INSUFFICIENT` | Seller improves product data and retries |
| Product not in publishable state (`ACTIVE`, `REJECTED`, `ARCHIVED`) | 422 | `INVALID_STATUS_TRANSITION` | Seller checks product status |
| Seller does not own the product | 403 | `FORBIDDEN` | Seller is attempting to publish another seller's product |
| Product not found | 404 | `RESOURCE_NOT_FOUND` | Invalid `productId` |

---

## Flow 3: Update Product

### Summary

| Field | Value |
|---|---|
| Actor | Seller |
| Trigger | Seller wants to update product details (title, description, price, images, variants) |
| Preconditions | Authenticated (Bearer JWT, seller role); product in `DRAFT` or `ACTIVE` status; product belongs to seller |
| Terminal states (success) | 200 with updated product |
| Terminal states (failure) | 403 (not owner); 404 (not found); 400 (validation error) |
| Verification status | Partially Verified |

### Happy Path

| Step | Actor/System | Action | Endpoint | Auth | Expected Response |
|---|---|---|---|---|---|
| 1 | Seller | Submits product update | `PUT /api/catalog/v1/products/{id}` or `PATCH /api/catalog/v1/products/{id}` | Bearer JWT (seller role) | Request accepted |
| 2 | catalog-service | Verifies seller owns the product | — | — | Ownership confirmed |
| 3 | catalog-service | Applies updates to product record | — | — | Fields updated |
| 4 | catalog-service | If significant fields changed (title, description, category, pricing): re-triggers quality score check | — | — | Quality score recomputed |
| 5 | catalog-service | Re-indexes product in MeiliSearch | — | — | Search index updated |
| 6 | catalog-service | Publishes `product.updated` event | — | — | Event emitted: `{ productId, sellerId, changedFields }` |
| 7 | Seller | Receives updated product | — | — | 200 with updated product data |

### Significant Fields

Changes to the following fields re-trigger the quality score check at update time: `title`, `description`, `categoryId`, `images`, `variants`, `pricing`. Minor updates (inventory quantities, variant stock) do not re-trigger the quality score check.

If the product is `ACTIVE` and an update causes the quality score to drop below 60, the product may be moved to `PENDING_REVIEW` for re-evaluation.

### Service Interaction Chain

`PUT/PATCH /api/catalog/v1/products/{id}` is handled within catalog-service. MeiliSearch is updated after a successful save. The `product.updated` event is emitted via outbox.

### Unhappy Path Branches

| Trigger Condition | System Response | Error Code | Terminal State |
|---|---|---|---|
| Seller does not own the product | 403 | `FORBIDDEN` | Seller cannot update another seller's product |
| Product not found | 404 | `RESOURCE_NOT_FOUND` | Invalid `productId` |
| Invalid field values | 400 | `VALIDATION_ERROR` | Seller corrects and resubmits |
| Pricing below platform minimum | 422 | `PRICING_VIOLATION` | Seller adjusts price |
| Product in non-updatable status (`ARCHIVED`) | 422 | `INVALID_STATUS_TRANSITION` | Archived products cannot be updated |

---

## Known Gap

> ⚠️ **Known Gap:** `DELETE /api/catalog/v1/admin/buy-box/anomaly-flags/{flagId}` → **500 FAILING** (September 2026 sweep). Admin buy-box anomaly flag deletion is not currently working.
>
> This affects sellers indirectly: if a product listing is flagged by the buy-box fraud detector (e.g., for sudden price drops below cost, coordinated price manipulation), the flag cannot be cleared by admins until this endpoint is fixed. Flagged sellers should contact platform support to request manual flag review. There is no seller-facing workaround — flag removal is an admin-only operation and is currently unavailable.
