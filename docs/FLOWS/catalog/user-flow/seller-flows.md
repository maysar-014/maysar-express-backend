# Seller Flows — Catalog Service

> **Verification status:** Verified (Flows 1-3); Flows 4-6 added 2026-11-10 (MUVA/MSLE Phase 4 — pending live verification after server restart)
> **Verification basis:** `docs/FLOWS/_verification/analysis-report.md` (September 2026); MUVA/MSLE Phase 4 implementation (2026-11-10)
> **Last updated:** 2026-11-10 (added Flow 4: Seller Offers, Flow 5: Progressive Listing Workflow, Flow 6: Configuration Management)

## Overview

This document covers catalog-service flows from the seller's perspective: creating a product (KYC-gated), publishing it to the catalog, and updating product details. All write operations require an authenticated seller JWT. Product creation includes fingerprinting to prevent duplicate listings and is gated by KYC middleware imported in-process from kyc-service — it is not a standalone HTTP call to a separate service.

---

## Flow Index

| # | Flow Name | Verification Status | Primary Endpoint |
|---|---|---|---|
| 1 | Create Product (KYC-Gated) | Verified | `POST /api/catalog/v1/products` |
| 2 | Publish Product | Verified | `POST /api/catalog/v1/products/{id}/publish` |
| 3 | Update Product | Partially Verified | `PUT /api/catalog/v1/products/{id}` or `PATCH /api/catalog/v1/products/{id}` |
| 4 | Create & Manage Seller Offer | Pending Verification | `POST /api/catalog/v1/seller/offers` |
| 5 | Progressive Listing Workflow | Pending Verification | `POST /api/catalog/v1/seller/listing/start` |
| 6 | Configuration Definition Management | Pending Verification | `GET /api/catalog/v1/products/{id}/configuration` |

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

## Resolved — Buy-Box Anomaly Flag Deletion (DEF-004)

> ✅ **Resolved:** `DELETE /api/catalog/v1/admin/buy-box/anomaly-flags/{flagId}` previously returned **500** whenever the flag id did not exist. It now returns:
>
> - `200 {success:true}` when the flag is cleared (audit record written)
> - `404 {success:false, error:{code:"ANOMALY_FLAG_NOT_FOUND"}}` when no anomaly flag exists for that id
> - `403 {success:false, error:{code:"INSUFFICIENT_PERMISSIONS"}}` when the caller lacks the operator/admin capability
>
> **Impact on sellers:** None — flag removal remains an admin-only operation, but it now works and reports accurate not-found responses. Sellers still see anomaly flags in read-only form; admins can clear them through the admin console.
>
> **Tracked in:** `docs/FLOWS/_verification/defect-register.md` (DEF-004)

---

## Flow 4: Create & Manage Seller Offer

> **Added 2026-11-10 — MUVA/MSLE Phase 3 (ENH-001)**
> A seller offer is the seller's commercial commitment to supply a product. It is entirely separate from the global product record — multiple sellers may offer the same catalog product, each with independent pricing, stock, condition, and fulfillment terms. The product identity stays in the catalog; only commercial terms live on the offer.

### Summary

| Field | Value |
|---|---|
| Actor | Seller |
| Trigger | Seller wants to set their price, stock, and commercial terms for a catalog product |
| Preconditions | Authenticated (Bearer JWT, seller role); product exists in catalog |
| Terminal states (success) | 201 `{ offerId, status: "draft" }` |
| Terminal states (failure) | 409 (offer already exists for this seller+product); 400 (validation error) |
| Verification status | Pending live verification |

### Offer Lifecycle

```
draft → active → suspended
                ↘ archived (terminal)
```

### Create Offer — Happy Path

| Step | Actor/System | Action | Endpoint | Auth | Expected Response |
|---|---|---|---|---|---|
| 1 | Seller | Submits offer for a catalog product | `POST /api/catalog/v1/seller/offers` | Bearer JWT (seller) | 201 `{ offerId, status: "draft" }` |
| 2 | catalog-service | Checks for existing offer (productId + sellerId unique) | — | — | No duplicate; proceeds |
| 3 | catalog-service | Creates `Catalog_SellerOffer` record in `draft` state | — | — | Offer persisted |
| 4 | Seller | Activates offer when ready | `PATCH /api/catalog/v1/seller/offers/{offerId}/status` with `{ "status": "active" }` | Bearer JWT (seller) | 200 `{ offerId, status: "active" }` |
| 5 | catalog-service | Validates transition (`draft → active`); persists | — | — | Offer is live |

### Create Offer — Request Body

```json
{
  "productId": "prod_01...",
  "price": 45000,
  "currency": "TZS",
  "stockAvailable": 50,
  "condition": "new",
  "fulfillmentPolicy": "seller_fulfilled",
  "warranty": "12 months manufacturer warranty",
  "returnConditions": "30-day returns, unopened only",
  "minimumOrderQuantity": 1,
  "leadTimeDays": 2,
  "sellerSku": "MY-SKU-001",
  "configurationCoverage": null
}
```

**`configurationCoverage`:** `null` = offer covers all configurations of this product. Pass an array of configuration fingerprints to restrict coverage to specific configurations only.

### Manage Offer — Endpoints

| Action | Endpoint | Body |
|---|---|---|
| Get own offers | `GET /api/catalog/v1/seller/offers` | — |
| Get active offers for a product (public) | `GET /api/catalog/v1/products/{productId}/offers` | — |
| Update price | `PATCH /api/catalog/v1/seller/offers/{id}/price` | `{ "price": 42000, "currency": "TZS" }` |
| Update stock | `PATCH /api/catalog/v1/seller/offers/{id}/stock` | `{ "stockAvailable": 35 }` |
| Update status | `PATCH /api/catalog/v1/seller/offers/{id}/status` | `{ "status": "active" \| "suspended" \| "archived" }` |

### Status Transition Rules

| From | To | Allowed |
|---|---|---|
| `draft` | `active` | ✅ |
| `active` | `suspended` | ✅ |
| `suspended` | `active` | ✅ |
| `active` | `archived` | ✅ |
| `archived` | any | ❌ — archived offers are terminal |

### Unhappy Path Branches

| Trigger Condition | System Response | Error Code |
|---|---|---|
| Offer already exists for this seller + product | 409 | `CONFLICT` |
| Price ≤ 0 | 400 | `VALIDATION_ERROR` |
| Invalid status transition | 400 | `INVALID_STATUS_TRANSITION` |
| Trying to modify another seller's offer | 403 | `FORBIDDEN` |
| Offer archived (attempting any change) | 400 | `ARCHIVED_OFFER` |

---

## Flow 5: Progressive Listing Workflow (MSLE)

> **Added 2026-11-10 — MUVA/MSLE Phase 4 (ENH-005)**
> The progressive listing workflow lets sellers list products step-by-step across two distinct entry paths without losing progress. Drafts survive network interruptions, browser closures, and session expiry. Sellers never need to restart from scratch.

### Two Entry Paths

| Path | Use case | `entryPath` value |
|---|---|---|
| **Path A — Sell Existing** | Product already in the catalog; seller adds commercial terms | `PATH_A` |
| **Path B — Introduce New** | Genuinely new product not yet in the catalog | `PATH_B` |

### Five Stages

| Stage | `currentStage` value | What is collected |
|---|---|---|
| 1 — Identify | `identify` | Product name, brand, GTIN/barcode, catalog search, category |
| 2 — Describe | `describe` | Description, specifications, images, brand, model |
| 3 — Configure | `configure` | Whether product has options (colour, size, etc.) and which combinations exist |
| 4 — Offer | `offer` | Price, stock, condition, fulfillment, SKU, delivery terms |
| 5 — Publish | `publish` | Review summary, correct errors, publish |

### Workflow Endpoints

| Step | Endpoint | Body | Response |
|---|---|---|---|
| Start listing | `POST /api/catalog/v1/seller/listing/start` | `{ entryPath, productId? }` | `{ draftId, currentStage, publicationState }` |
| Auto-save / save progress | `PUT /api/catalog/v1/seller/listing/draft/{draftId}` | `{ productDraft?, configurationDraft?, offerDraft?, currentStage? }` | `{ draftId, currentStage, updatedAt }` |
| Resume listing | `GET /api/catalog/v1/seller/listing/draft/{draftId}` | — | Full draft state |
| List all drafts (recovery) | `GET /api/catalog/v1/seller/listing/drafts` | — | Array of draft summaries |
| Validate (pre-publish) | `POST /api/catalog/v1/seller/listing/{draftId}/validate` | — | `{ valid, errors[], warnings[] }` |
| Publish | `POST /api/catalog/v1/seller/listing/{draftId}/publish` | — | `{ publicationState: "published", publishedOfferId }` |

### Draft `publicationState` Values

| State | Meaning |
|---|---|
| `draft` | In progress; not yet validated |
| `validating` | Validation ran and found errors; needs correction |
| `publishable` | Passed validation; ready to publish |
| `published` | Offer created; listing live |
| `rejected` | Failed final publish validation; must correct and retry |

### Save Draft — Request Body

```json
{
  "currentStage": "offer",
  "offerDraft": {
    "price": 45000,
    "currency": "TZS",
    "stockAvailable": 10,
    "condition": "new",
    "fulfillmentPolicy": "seller_fulfilled",
    "leadTimeDays": 2,
    "autoActivate": true
  }
}
```

**`autoActivate`:** When `true` on publish, the resulting seller offer goes directly to `active` state. When `false` (default), the offer starts in `draft` and must be manually activated.

### Draft Recovery

Sellers can recover an interrupted listing at any time:
1. `GET /api/catalog/v1/seller/listing/drafts` — lists all in-progress drafts
2. `GET /api/catalog/v1/seller/listing/draft/{draftId}` — retrieves full draft state including last saved stage
3. `PUT /api/catalog/v1/seller/listing/draft/{draftId}` — continues saving from where the seller left off

### Validation Errors & Warnings

The `/validate` endpoint returns structured feedback:
- **errors** — must be fixed before publishing (e.g., missing price, missing product selection)
- **warnings** — recommended but not required (e.g., missing description, missing condition)

Sellers must fix all `errors` before the publish endpoint will succeed. `warnings` are advisory.

### Service Interaction Chain

The listing workflow is orchestrated entirely within catalog-service. On publish:
1. Validation re-runs atomically
2. `Catalog_SellerOffer` is created from `offerDraft`
3. `Catalog_ListingPublicationRecord` audit entry is written
4. Draft `publicationState` transitions to `published`

No separate HTTP call to another service is needed — the offer creation is in-process.

### Unhappy Path Branches

| Trigger Condition | System Response | Error Code |
|---|---|---|
| Draft belongs to another seller | 403 | `FORBIDDEN` |
| Draft not found | 404 | `NOT_FOUND` |
| Trying to edit a published draft | 409 | `CONFLICT` |
| Publish with unfixed validation errors | 422 | `VALIDATION_ERROR` |
| Duplicate offer (same seller + product) | 409 | `CONFLICT` |

---

## Flow 6: Configuration Definition Management

> **Added 2026-11-10 — MUVA/MSLE Phase 1 (ENH-006)**
> Configuration definitions control which options customers can choose for a product (e.g., Colour, Size, Storage). They are managed by the catalog — not by individual sellers. Sellers interact with configuration data via the listing workflow's configure stage.

### Summary

Sellers do not create configuration definitions directly. The configure stage of the listing workflow (`PUT .../draft/{id}` with `configurationDraft`) stores the seller's intent. Administrators and the platform manage the canonical configuration definition. Buyers use the buyer-side configuration endpoints to select and validate options at browse time.

### Retrieve Configuration for a Product

```
GET /api/catalog/v1/products/{productId}/configuration
```

Returns:
- `dimensions` — the selectable axes (e.g., Colour, Size)
- `options` — all valid option values per dimension
- `dependencies` — conditional rules between dimensions
- `constraints` — exclusion rules
- `combinations` — the sparse set of valid discrete combinations (only these may be purchased)

**404** means the product has no configurable options (simple product — no configuration needed).

### Validate a Configuration Selection

```
POST /api/catalog/v1/products/{productId}/validate-configuration
Body: { "selections": { "dim_colour": ["opt_black"], "dim_storage": ["opt_128gb"] } }
```

Returns `{ valid: true, errors: [] }` or a list of validation errors explaining what is incorrect or missing.

### Resolve a Configuration Selection

```
POST /api/catalog/v1/products/{productId}/resolve-configuration
Body: { "selections": { "dim_colour": ["opt_black"], "dim_storage": ["opt_128gb"] } }
```

Returns:
- `fingerprint` — deterministic canonical identifier for this combination
- `combinationExists` — whether this combination is in the valid sparse set
- `resolvedConfiguration` — human-readable display values (e.g., `{ "Colour": "Black", "Storage": "128 GB" }`)
- `configurationDefinitionVersion` — version of the definition used (for snapshot)

**`combinationExists: false`** means the selection is structurally valid (each option exists) but this specific combination was not registered as purchasable. The buyer cannot purchase it.

