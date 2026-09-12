# Maysar Catalog Service — Implementation Reference (As-Built)

> **Status:** Live and verified — product discovery, buy-box ranking (9-signal composite), pricing engine, campaigns, MeiliSearch indexing, seller storefront, product matching/fingerprinting.
> **Last updated:** September 2026
> **Scope:** `services/catalog-service` + `services/catalog-service/src/pricing/` + `services/catalog-service/src/campaigns/`

---

## 1. Guiding Principles Enforced by the Code

| Principle | Where it lives in code |
|---|---|
| **Buy-box winner is computed, not set** | `ComputeBuyBoxUseCase` runs the ranking engine on every relevant change — no manual winner assignment |
| **9-signal composite ranking** | `RankingEngine` combines: price competitiveness, fulfillment reliability, seller trust, stock reliability, margin contribution, rate signals, recency-weighted rate, geographic optimization, exploration allocation |
| **Category-specific weight strategies** | `CategoryStrategyService` overrides default weights per category — electronics vs. produce vs. fashion have different signal priorities |
| **Fraud detection in buy-box** | `FraudDetector` identifies price manipulation patterns before ranking |
| **Product fingerprinting prevents duplicates** | `FingerprintAlgorithm` generates a canonical fingerprint from normalized attributes — duplicate listings are matched, not created |
| **Pricing strategies are pluggable** | `COST_PROTECTED | DYNAMIC | ASSISTED` strategies via `PricingStrategyInterface` |
| **Campaign pricing is saga-orchestrated** | `CampaignLifecycleSaga` manages DRAFT → SCHEDULED → ACTIVE → COMPLETED with compensation |
| **Search is MeiliSearch-backed** | `CatalogSearchIndexerService` maintains the search index; `OptimizedSearchEngine` handles query routing |

---

## 2. Domain Model

### 2.1 Product Entity (`domain/entities/product.entity.ts`)

Key fields: `productId`, `sellerId`, `title`, `description`, `categoryId`, `attributes`, `price`, `currency`, `status`, `fingerprint`, `qualityScore`, `seoSlug`, `contentVersion`.

Product statuses: `DRAFT → PENDING_REVIEW → ACTIVE | REJECTED | ARCHIVED`.

### 2.2 Buy-Box Value Objects

| Value Object | Enforces |
|---|---|
| `BuyBoxWeights` | Weights ∈ [0,1], sum to 1.0 per category strategy |
| `BuyBoxResult` | Winner `sellerId`, score, signal breakdown, `explorationFlag` |

### 2.3 Campaign Entity (`campaigns/domain/entities/campaign.entity.ts`)

```
CampaignStatus: DRAFT → SCHEDULED → ACTIVE → COMPLETED
                              ↘ CANCELLED
                     ↘ PAUSED ↔ ACTIVE (resume)
```

Campaign types: `DISCOUNT`, `BUNDLE`, `FLASH_SALE`, `SEASONAL`.

---

## 3. Buy-Box Ranking Engine

### 3.1 Signals (`domain/buy-box/signals/`)

| Signal | File | What it measures |
|---|---|---|
| `PriceCompetitivenessSignal` | `price-competitiveness.signal.ts` | Price vs. category median |
| `FulfillmentReliabilitySignal` | `fulfillment-reliability.signal.ts` | On-time delivery rate |
| `SellerTrustSignal` | `seller-trust.signal.ts` | KYC status, dispute rate, tenure |
| `StockReliabilitySignal` | `stock-reliability.signal.ts` | Stockout rate, reservation success |
| `MarginContributionSignal` | `margin-contribution.signal.ts` | Platform margin contribution |
| `RateSignals` | `rate-signals.signal.ts` | Return rate, cancellation rate |
| `RecencyWeightedRate` | `recency-weighted-rate.ts` | Recent performance weighted higher |

### 3.2 Geographic optimizer (`domain/buy-box/geographic-optimizer.ts`)

Boosts sellers closer to the buyer's delivery address. Reduces logistics cost and delivery time.

### 3.3 Exploration allocator (`domain/buy-box/exploration-allocator.ts`)

Allocates a small percentage of buy-box wins to non-top-ranked sellers to prevent monopolization and gather performance data on newer sellers.

### 3.4 Fraud detector (`domain/buy-box/fraud-detector.ts`)

Detects: sudden price drops below cost, coordinated price manipulation across accounts, review manipulation patterns.

---

## 4. Pricing Engine (`src/pricing/`)

### 4.1 Strategies

| Strategy | File | When used |
|---|---|---|
| `CostProtectedStrategy` | `domain/strategies/cost-protected.strategy.ts` | Ensures price ≥ cost + minimum margin |
| `DynamicPricingStrategy` | `domain/strategies/dynamic-pricing.strategy.ts` | Market-responsive pricing within bounds |
| `AssistedPricingStrategy` | `domain/strategies/assisted-pricing.strategy.ts` | Enabler-assisted sales with attribution |

### 4.2 MaysarPricingEngine (`pricing/domain/engines/maysar-pricing.engine.ts`)

Orchestrates: `CategoryGuardService` (category-specific rules) → `CoreCalculatorService` (base price) → `PlatformValidatorService` (platform economics) → `RoundingService` (TZS rounding increments).

---

## 5. Product Matching & Fingerprinting

### 5.1 FingerprintAlgorithm (`domain/algorithms/fingerprint.algorithm.ts`)

Generates a canonical fingerprint from: normalized title + brand + category + key attributes. Two listings with the same fingerprint are the same product — the second listing is matched to the first, not created as a duplicate.

### 5.2 CatalogMatchingEngine (`domain/engines/catalog-matching.engine.ts`)

Runs similarity scoring (Jaccard + TF-IDF) against existing products. Returns `matchScore`, `matchedProductId`, `confidence`. Above threshold → auto-match; below → manual review queue.

### 5.3 CreateProductWithMatchingUseCase

1. Normalize attributes
2. Generate fingerprint
3. Run matching engine
4. If match found: link listing to existing product
5. If no match: create new product + index in MeiliSearch

---

## 6. Application Layer (Use Cases)

| Use case | What it does |
|---|---|
| `CreateProductUseCase` | Validate → fingerprint → match → create → index |
| `GetProductUseCase` | Fetch with buy-box winner + inventory status |
| `SearchProductsUseCase` | MeiliSearch query with facets, filters, pagination |
| `ComputeBuyBoxUseCase` | Run ranking engine → persist winner → emit `buy_box.updated` |
| `ComputeBuyBoxRankingUseCase` | Full ranking with signal breakdown for admin |
| `ManageCategoriesUseCase` | Category CRUD with attribute schema management |
| `ManageProductIndexingUseCase` | Force re-index, bulk index operations |
| `SubmitProductReviewUseCase` | Buyer review submission with moderation |
| `SelectFulfillmentLocationUseCase` | Pick optimal seller location for fulfillment |

---

## 7. HTTP Surface

Mounted at `/api/catalog`.

| Method | Path | Auth | Description |
|---|---|---|---|
| GET  | `/api/catalog/products` | none | Search/list products |
| GET  | `/api/catalog/products/:productId` | none | Product detail + buy-box |
| POST | `/api/catalog/products` | seller JWT | Create product |
| PUT  | `/api/catalog/products/:productId` | seller JWT | Update product |
| DELETE | `/api/catalog/products/:productId` | seller JWT | Archive product |
| GET  | `/api/catalog/search` | none | Full-text search |
| GET  | `/api/catalog/buy-box/:productId` | none | Buy-box winner |
| POST | `/api/catalog/buy-box/:productId/compute` | system JWT | Recompute buy-box |
| GET  | `/api/catalog/seller/:sellerId/storefront` | none | Seller storefront |
| GET  | `/api/catalog/seller/:sellerId/products` | none | Seller product list |
| POST | `/api/catalog/products/:productId/reviews` | buyer JWT | Submit review |
| GET  | `/api/catalog/products/:productId/reviews` | none | Product reviews |
| POST | `/api/catalog/campaigns` | seller JWT | Create campaign |
| GET  | `/api/catalog/campaigns` | seller JWT | List campaigns |
| POST | `/api/catalog/campaigns/:campaignId/launch` | seller JWT | Launch campaign |
| POST | `/api/catalog/campaigns/:campaignId/pause` | seller JWT | Pause campaign |
| GET  | `/api/catalog/categories` | none | Category tree |
| GET  | `/api/catalog/health/live` | none | Health check |

---

## 8. Events

| Event | Emitted by | Payload |
|---|---|---|
| `product.created` | `CreateProductUseCase` | `productId, sellerId, categoryId, fingerprint` |
| `product.updated` | Update use case | `productId, sellerId, changedFields` |
| `product.archived` | Archive use case | `productId, sellerId` |
| `buy_box.updated` | `ComputeBuyBoxUseCase` | `productId, winnerId, score, previousWinnerId` |
| `campaign.activated` | `CampaignLifecycleSaga` | `campaignId, sellerId, discountType, startAt` |
| `campaign.completed` | `CampaignLifecycleSaga` | `campaignId, sellerId` |

---

## 9. Verification Evidence

| Artifact | What it proves |
|---|---|
| `domain/buy-box/__tests__/ranking-engine.test.ts` | 9-signal composite ranking |
| `domain/buy-box/__tests__/buy-box-ranking.properties.test.ts` | Property-based: ranking invariants |
| `domain/buy-box/__tests__/fraud-detector.test.ts` | Price manipulation detection |
| `domain/algorithms/__tests__/fingerprint.algorithm.test.ts` | Fingerprint determinism |
| `application/use-cases/__tests__/create-product.use-case.test.ts` | Full creation pipeline |
| `tests/integration/meilisearch-search.integration.test.ts` | Search indexing + retrieval |
